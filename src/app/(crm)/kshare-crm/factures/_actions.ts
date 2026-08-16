"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice-pdf";
import { EMETTEUR, mentionsManquantes } from "@/lib/invoicing/emetteur";
import {
  bornesPeriode,
  libellePeriode,
  recapitulatifCommissions,
  recapitulatifAbonnements,
  detailCommandes,
  type LigneFacture,
  type LigneCommande,
  type NatureFacture,
} from "@/lib/invoicing/compute";
import type { Json } from "@/types/database.types";
import { sendEmailWithAttachment, emailFactureCommission } from "@/lib/resend";
import { logAuditEvent } from "@/lib/audit-log";

export type FactureResult =
  | { success: true; message?: string }
  | { success: false; error: string };

const BUCKET = "invoices";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return { user };
}

/** `YYYY-MM`, la seule forme de période acceptée. */
function periodeValide(periode: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(periode);
}

/** Dernier jour de la période, inclus : la date qui figure sur le document. */
function bornesDocument(periode: string): { debut: string; fin: string } {
  const { debut, fin } = bornesPeriode(periode);
  return {
    debut: debut.toISOString().slice(0, 10),
    fin: new Date(fin.getTime() - 86_400_000).toISOString().slice(0, 10),
  };
}

/**
 * Crée les brouillons manquants pour une période, dans les deux séries.
 *
 * Un brouillon ne consomme pas de numéro : on peut le relire, le corriger, le
 * supprimer. Le numéro n'arrive qu'à l'émission.
 */
export async function preparerFactures(periode: string): Promise<FactureResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };
  if (!periodeValide(periode)) return { success: false, error: "Période invalide." };

  const { fin } = bornesPeriode(periode);
  if (fin > new Date()) {
    return { success: false, error: "Cette période n'est pas terminée." };
  }

  const [commissions, abonnements] = await Promise.all([
    recapitulatifCommissions(periode),
    recapitulatifAbonnements(periode),
  ]);

  const bornes = bornesDocument(periode);
  const supabase = createAdminClient();
  const aCreer: Record<string, unknown>[] = [];

  for (const r of commissions.filter((c) => c.facture === null)) {
    // La liste des commandes couvertes est figée dès le brouillon : c'est elle
    // que l'émission utilisera pour marquer les commandes comme facturées.
    const detail = await detailCommandes(periode, r.commerceId);
    aCreer.push({
      kind: "commission",
      commerce_id: r.commerceId,
      period_start: bornes.debut,
      period_end: bornes.fin,
      amount_ht: r.total,
      vat_rate: 0,
      vat_amount: 0,
      amount_ttc: r.total,
      commission_total: r.commission,
      adjustment_total: r.regularisation,
      subscription_amount: 0,
      commission_rate: r.tauxCommission,
      plan: r.plan,
      sales_total: r.ventes,
      orders_count: r.paniers,
      // La commission est prélevée à la source : la facture constate un
      // encaissement, elle n'en appelle pas un.
      due_amount: 0,
      lines: r.lignes as unknown as Json,
      order_detail: detail as unknown as Json,
      order_ids: await idsCommandes(periode, r.commerceId),
      commerce_snapshot: snapshot(r),
      status: "draft",
    });
  }

  for (const a of abonnements.filter((x) => x.facture === null)) {
    aCreer.push({
      kind: "subscription",
      commerce_id: a.commerceId,
      period_start: bornes.debut,
      period_end: bornes.fin,
      amount_ht: a.montant,
      vat_rate: 0,
      vat_amount: 0,
      amount_ttc: a.montant,
      commission_total: 0,
      subscription_amount: a.montant,
      plan: a.plan,
      sales_total: 0,
      orders_count: 0,
      // Prélevé par SEPA à date : rien à régler à réception.
      due_amount: 0,
      lines: a.lignes as unknown as Json,
      commerce_snapshot: snapshot(a),
      status: "draft",
    });
  }

  if (aCreer.length === 0) {
    return { success: true, message: "Tous les brouillons de la période existent déjà." };
  }

  const { error } = await supabase.from("invoices").insert(aCreer as never);
  if (error) return { success: false, error: `Création impossible : ${error.message}` };

  revalidatePath("/kshare-crm/factures");
  return {
    success: true,
    message: `${aCreer.length} brouillon${aCreer.length > 1 ? "s" : ""} créé${aCreer.length > 1 ? "s" : ""}.`,
  };
}

function snapshot(r: {
  nom: string;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  siret: string | null;
  email: string | null;
}) {
  return {
    name: r.nom,
    address: r.adresse,
    postal_code: r.codePostal,
    city: r.ville,
    siret: r.siret,
    email: r.email,
  };
}

/** Identifiants des commandes couvertes, pour le marquage à l'émission. */
async function idsCommandes(periode: string, commerceId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { debut, fin } = bornesPeriode(periode);
  const { data } = await supabase.rpc("facturation_detail", {
    p_debut: debut.toISOString(),
    p_fin: fin.toISOString(),
    p_commerce: commerceId,
  });
  return (data ?? []).map((d) => d.order_id);
}

/**
 * Recalcule un brouillon.
 *
 * N'a de sens que sur un brouillon : une facture émise est figée, et une erreur
 * constatée après émission s'annule et se réémet, elle ne se réécrit pas.
 */
export async function recalculerBrouillon(factureId: string): Promise<FactureResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { data: facture } = await supabase
    .from("invoices")
    .select("id, status, kind, commerce_id, period_start")
    .eq("id", factureId)
    .single();

  if (!facture) return { success: false, error: "Facture introuvable." };
  if (facture.status !== "draft") {
    return { success: false, error: "Une facture émise ne se recalcule pas." };
  }
  if (!facture.commerce_id) return { success: false, error: "Facture sans commerce." };

  const periode = facture.period_start.slice(0, 7);

  if (facture.kind === "subscription") {
    const recap = (await recapitulatifAbonnements(periode)).find(
      (a) => a.commerceId === facture.commerce_id,
    );
    if (!recap) {
      return { success: false, error: "Ce commerce n'a plus d'abonnement à facturer." };
    }
    const { error } = await supabase
      .from("invoices")
      .update({
        amount_ht: recap.montant,
        amount_ttc: recap.montant,
        subscription_amount: recap.montant,
        plan: recap.plan,
        lines: recap.lignes as unknown as Json,
        commerce_snapshot: snapshot(recap),
        updated_at: new Date().toISOString(),
      })
      .eq("id", factureId)
      .eq("status", "draft");

    if (error) return { success: false, error: error.message };
    revalidatePath("/kshare-crm/factures");
    return { success: true, message: "Brouillon recalculé." };
  }

  const recap = (await recapitulatifCommissions(periode)).find(
    (r) => r.commerceId === facture.commerce_id,
  );
  if (!recap) {
    return { success: false, error: "Ce commerce n'a plus rien à facturer sur la période." };
  }

  const detail = await detailCommandes(periode, facture.commerce_id);

  const { error } = await supabase
    .from("invoices")
    .update({
      amount_ht: recap.total,
      amount_ttc: recap.total,
      commission_total: recap.commission,
      adjustment_total: recap.regularisation,
      commission_rate: recap.tauxCommission,
      plan: recap.plan,
      sales_total: recap.ventes,
      orders_count: recap.paniers,
      lines: recap.lignes as unknown as Json,
      order_detail: detail as unknown as Json,
      order_ids: await idsCommandes(periode, facture.commerce_id),
      commerce_snapshot: snapshot(recap),
      updated_at: new Date().toISOString(),
    })
    .eq("id", factureId)
    .eq("status", "draft");

  if (error) return { success: false, error: error.message };

  revalidatePath("/kshare-crm/factures");
  return { success: true, message: "Brouillon recalculé." };
}

export async function supprimerBrouillon(factureId: string): Promise<FactureResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", factureId)
    .eq("status", "draft");

  if (error) return { success: false, error: error.message };

  revalidatePath("/kshare-crm/factures");
  return { success: true, message: "Brouillon supprimé." };
}

/**
 * Émet une facture : numéro définitif, marquage des commandes, PDF, archivage.
 *
 * L'ordre compte. Numéro et marquage sont posés par la base en une seule
 * transaction, puis le PDF est produit à partir des montants figés. Si le PDF
 * échoue, la facture reste émise — un document régulier existe, on le régénère.
 */
export async function emettreFacture(factureId: string): Promise<FactureResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const manquantes = mentionsManquantes();
  if (manquantes.length > 0) {
    return {
      success: false,
      error: `Identité de l'émetteur incomplète : ${manquantes.join(", ")}. Une facture sans ces mentions est irrégulière.`,
    };
  }

  const supabase = createAdminClient();
  const { data: emise, error: erreurEmission } = await supabase.rpc("emettre_facture", {
    p_invoice_id: factureId,
  });

  if (erreurEmission || !emise) {
    return { success: false, error: erreurEmission?.message ?? "Émission impossible." };
  }

  const facture = emise as unknown as FactureLigne;

  logAuditEvent({
    action: "crm.invoice_issued",
    actor_id: ctx.user.id,
    target_id: factureId,
    metadata: { number: facture.number, kind: facture.kind, amount: facture.amount_ttc },
  });

  const chemin = await genererEtArchiverPdf(facture);
  revalidatePath("/kshare-crm/factures");

  return {
    success: true,
    message: chemin
      ? `Facture ${facture.number} émise.`
      : `Facture ${facture.number} émise, mais le PDF n'a pas pu être archivé.`,
  };
}

type FactureLigne = {
  id: string;
  kind: NatureFacture;
  number: string | null;
  status: string;
  commerce_id: string | null;
  period_start: string;
  period_end: string;
  amount_ht: number;
  vat_rate: number;
  vat_amount: number;
  amount_ttc: number;
  due_amount: number;
  issued_at: string | null;
  pdf_url: string | null;
  lines: LigneFacture[];
  order_detail: LigneCommande[];
  commerce_snapshot: {
    name: string;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    siret: string | null;
    email: string | null;
  } | null;
};

/** Produit le PDF, l'archive, et renvoie son chemin — `null` si l'archivage a échoué. */
async function genererEtArchiverPdf(facture: FactureLigne): Promise<string | null> {
  if (!facture.number || !facture.commerce_snapshot) return null;

  const supabase = createAdminClient();
  const snap = facture.commerce_snapshot;

  const pdf = generateInvoicePdf({
    numero: facture.number,
    nature: facture.kind,
    emiseLe: facture.issued_at ?? new Date().toISOString(),
    periodeLibelle: libellePeriode(facture.period_start.slice(0, 7)),
    periodeDebut: facture.period_start,
    periodeFin: facture.period_end,
    client: {
      nom: snap.name,
      adresse: snap.address,
      codePostal: snap.postal_code,
      ville: snap.city,
      siret: snap.siret,
      email: snap.email,
    },
    lignes: facture.lines ?? [],
    commandes: facture.order_detail ?? [],
    total: Number(facture.amount_ttc),
    tauxTva: Number(facture.vat_rate),
    montantTva: Number(facture.vat_amount),
    resteAPayer: Number(facture.due_amount),
  });

  const chemin = `${facture.commerce_id}/${facture.number}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(chemin, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) {
    console.error("[factures] Archivage du PDF impossible :", error);
    return null;
  }

  await supabase.from("invoices").update({ pdf_url: chemin }).eq("id", facture.id);
  return chemin;
}

/** Régénère le PDF d'une facture émise, sans toucher aux montants. */
export async function regenererPdf(factureId: string): Promise<FactureResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const manquantes = mentionsManquantes();
  if (manquantes.length > 0) {
    return { success: false, error: `Identité de l'émetteur incomplète : ${manquantes.join(", ")}.` };
  }

  const supabase = createAdminClient();
  const { data } = await supabase.from("invoices").select("*").eq("id", factureId).single();
  if (!data) return { success: false, error: "Facture introuvable." };

  const facture = data as unknown as FactureLigne;
  if (facture.status === "draft") {
    return { success: false, error: "Un brouillon n'a pas encore de PDF." };
  }

  const chemin = await genererEtArchiverPdf(facture);
  if (!chemin) return { success: false, error: "Génération du PDF impossible." };

  revalidatePath("/kshare-crm/factures");
  return { success: true, message: "PDF régénéré." };
}

/**
 * Annule une facture émise.
 *
 * L'annulation ne supprime rien : le numéro reste consommé et le document reste
 * en archive. Elle rend en revanche les commandes facturables à nouveau, sans
 * quoi une annulation par erreur emporterait sa recette avec elle.
 */
export async function annulerFacture(factureId: string, motif: string): Promise<FactureResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };
  if (!motif.trim()) return { success: false, error: "Un motif d'annulation est obligatoire." };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("annuler_facture", {
    p_invoice_id: factureId,
    p_motif: motif.trim(),
  });

  if (error) return { success: false, error: error.message };

  logAuditEvent({
    action: "crm.invoice_canceled",
    actor_id: ctx.user.id,
    target_id: factureId,
    metadata: { motif: motif.trim() },
  });

  revalidatePath("/kshare-crm/factures");
  return { success: true, message: "Facture annulée." };
}

/** Envoie la facture au commerce, PDF en pièce jointe. */
export async function envoyerFacture(factureId: string): Promise<FactureResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { data } = await supabase.from("invoices").select("*").eq("id", factureId).single();
  if (!data) return { success: false, error: "Facture introuvable." };

  const facture = data as unknown as FactureLigne;
  if (facture.status !== "issued") {
    return { success: false, error: "Seule une facture émise peut être envoyée." };
  }

  const destinataire = facture.commerce_snapshot?.email;
  if (!destinataire) return { success: false, error: "Ce commerce n'a pas d'adresse email." };

  // On repart du PDF archivé plutôt que d'en régénérer un : le commerce doit
  // recevoir exactement le document conservé.
  const { data: fichier, error: erreurLecture } = await supabase.storage
    .from(BUCKET)
    .download(facture.pdf_url ?? `${facture.commerce_id}/${facture.number}.pdf`);

  let pdf: Buffer;
  if (erreurLecture || !fichier) {
    const chemin = await genererEtArchiverPdf(facture);
    if (!chemin) return { success: false, error: "PDF introuvable et régénération impossible." };
    const { data: relu } = await supabase.storage.from(BUCKET).download(chemin);
    if (!relu) return { success: false, error: "PDF introuvable." };
    pdf = Buffer.from(await relu.arrayBuffer());
  } else {
    pdf = Buffer.from(await fichier.arrayBuffer());
  }

  const { subject, html } = emailFactureCommission({
    commerceName: facture.commerce_snapshot?.name ?? "",
    numero: facture.number ?? "",
    periode: libellePeriode(facture.period_start.slice(0, 7)),
    montant: Number(facture.amount_ttc),
    nature: facture.kind,
  });

  const envoye = await sendEmailWithAttachment({
    to: destinataire,
    subject,
    html,
    attachments: [{ filename: `${facture.number}.pdf`, content: pdf }],
  });

  if (!envoye) return { success: false, error: "L'envoi de l'email a échoué." };

  await supabase
    .from("invoices")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", factureId);

  revalidatePath("/kshare-crm/factures");
  return { success: true, message: `Facture envoyée à ${destinataire}.` };
}

/** Lien de téléchargement temporaire du PDF archivé. */
export async function lienFacture(
  factureId: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { data: facture } = await supabase
    .from("invoices")
    .select("pdf_url")
    .eq("id", factureId)
    .single();

  if (!facture?.pdf_url) return { success: false, error: "Aucun PDF archivé." };

  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(facture.pdf_url, 3600);
  if (!data?.signedUrl) return { success: false, error: "Lien indisponible." };

  return { success: true, url: data.signedUrl };
}

/** Rappelle à l'écran si l'identité de l'émetteur est prête. */
export async function verifierEmetteur(): Promise<{
  pret: boolean;
  manquantes: string[];
  denomination: string;
}> {
  return {
    pret: mentionsManquantes().length === 0,
    manquantes: mentionsManquantes(),
    denomination: EMETTEUR.denominationLegale,
  };
}
