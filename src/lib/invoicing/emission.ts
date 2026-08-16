/**
 * Émission des documents mensuels : factures et relevés de ventes.
 *
 * Ce module est partagé par l'écran de gestion et par le cron du 1er du mois.
 * Les deux chemins doivent produire exactement la même chose — si le cron
 * émettait autrement que la main, la première divergence passerait inaperçue
 * jusqu'à ce qu'un commerçant compare deux mois.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice-pdf";
import { generateStatementPdf } from "@/lib/pdf/generate-statement-pdf";
import { mentionsManquantes } from "@/lib/invoicing/emetteur";
import { libellePeriode, type LigneFacture, type LigneCommande, type NatureFacture } from "@/lib/invoicing/compute";
import { relevesPeriode, referenceReleve, type LigneVente, type Releve } from "@/lib/invoicing/releve";
import type { Json } from "@/types/database.types";

const BUCKET_FACTURES = "invoices";
const BUCKET_RELEVES = "invoices";

export interface FactureLigne {
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
  replaces_id: string | null;
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
}

/**
 * Produit le PDF d'une facture et l'archive.
 *
 * Renvoie le chemin, ou `null` si l'archivage a échoué — auquel cas la facture
 * reste émise : un document régulier existe, on le régénère.
 */
export async function archiverPdfFacture(facture: FactureLigne): Promise<string | null> {
  if (!facture.number || !facture.commerce_snapshot) return null;

  const supabase = createAdminClient();
  const snap = facture.commerce_snapshot;

  // La facture remplacée doit être nommée sur le document : sans son numéro,
  // celui qui reçoit deux factures du même mois ne sait pas laquelle jeter.
  let remplace: { numero: string; emiseLe: string } | null = null;
  if (facture.replaces_id) {
    const { data } = await supabase
      .from("invoices")
      .select("number, issued_at")
      .eq("id", facture.replaces_id)
      .single();
    if (data?.number) {
      remplace = { numero: data.number, emiseLe: data.issued_at ?? facture.period_end };
    }
  }

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
    remplace,
  });

  const chemin = `${facture.commerce_id}/${facture.number}.pdf`;
  const { error } = await supabase.storage.from(BUCKET_FACTURES).upload(chemin, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) {
    console.error("[emission] Archivage de la facture impossible :", error);
    return null;
  }

  await supabase.from("invoices").update({ pdf_url: chemin }).eq("id", facture.id);
  return chemin;
}

export interface ReleveEnregistre {
  id: string;
  reference: string;
  commerceId: string;
  email: string | null;
  nom: string;
  periode: string;
  ventes: number;
  cheminPdf: string | null;
}

/**
 * Enregistre et archive le relevé d'un commerce.
 *
 * Le contenu est figé à l'enregistrement, comme une facture : un relevé envoyé
 * ne se recalcule pas, faute de quoi le commerce verrait ses chiffres bouger
 * après coup sans comprendre pourquoi.
 */
export async function emettreReleve(
  releve: Releve,
  remplaceId?: string,
): Promise<ReleveEnregistre | null> {
  const supabase = createAdminClient();

  // Une correction porte une référence distincte : deux documents pour le même
  // mois ne peuvent pas partager la même, on ne saurait plus les désigner.
  const suffixe = remplaceId ? `-R${Date.now().toString().slice(-4)}` : "";
  const reference = `${referenceReleve(releve.periode, releve.commerceId)}${suffixe}`;

  let remplace: { reference: string; emisLe: string } | null = null;
  if (remplaceId) {
    const { data } = await supabase
      .from("sales_statements")
      .select("reference, issued_at")
      .eq("id", remplaceId)
      .single();
    if (data) remplace = { reference: data.reference, emisLe: data.issued_at };
  }

  const { data: enregistre, error } = await supabase
    .from("sales_statements")
    .insert({
      reference,
      commerce_id: releve.commerceId,
      period_start: releve.debut,
      period_end: releve.fin,
      sales_total: releve.ventes,
      commission_total: releve.commission,
      service_fees_total: releve.fraisService,
      refunds_total: releve.remboursements,
      net_total: releve.net,
      orders_count: releve.paniers,
      donations_count: releve.dons,
      lines: releve.lignes as unknown as Json,
      commerce_snapshot: {
        name: releve.nom,
        address: releve.adresse,
        postal_code: releve.codePostal,
        city: releve.ville,
        siret: releve.siret,
        email: releve.email,
      },
      replaces_id: remplaceId ?? null,
    })
    .select("id, reference, issued_at")
    .single();

  if (error || !enregistre) {
    console.error("[emission] Enregistrement du relevé impossible :", error);
    return null;
  }

  const pdf = generateStatementPdf({
    reference: enregistre.reference,
    emisLe: enregistre.issued_at,
    periodeLibelle: releve.periodeLibelle,
    debut: releve.debut,
    fin: releve.fin,
    commerce: {
      nom: releve.nom,
      adresse: releve.adresse,
      codePostal: releve.codePostal,
      ville: releve.ville,
      siret: releve.siret,
      email: releve.email,
    },
    ventes: releve.ventes,
    commission: releve.commission,
    remboursements: releve.remboursements,
    net: releve.net,
    paniers: releve.paniers,
    dons: releve.dons,
    lignes: releve.lignes as LigneVente[],
    remplace,
  });

  const chemin = `${releve.commerceId}/${enregistre.reference}.pdf`;
  const { error: erreurUpload } = await supabase.storage
    .from(BUCKET_RELEVES)
    .upload(chemin, pdf, { contentType: "application/pdf", upsert: true });

  if (!erreurUpload) {
    await supabase.from("sales_statements").update({ pdf_url: chemin }).eq("id", enregistre.id);
  } else {
    console.error("[emission] Archivage du relevé impossible :", erreurUpload);
  }

  return {
    id: enregistre.id,
    reference: enregistre.reference,
    commerceId: releve.commerceId,
    email: releve.email,
    nom: releve.nom,
    periode: releve.periode,
    ventes: releve.ventes,
    cheminPdf: erreurUpload ? null : chemin,
  };
}

/** Les relevés d'une période, calculés puis enregistrés pour ceux qui n'en ont pas. */
export async function preparerReleves(periode: string): Promise<{
  emis: ReleveEnregistre[];
  ignores: number;
}> {
  const supabase = createAdminClient();
  const releves = await relevesPeriode(periode);

  const { data: existants } = await supabase
    .from("sales_statements")
    .select("commerce_id")
    .eq("period_start", `${periode}-01`)
    .eq("status", "issued");

  const deja = new Set((existants ?? []).map((s) => s.commerce_id));
  const emis: ReleveEnregistre[] = [];

  for (const releve of releves) {
    if (deja.has(releve.commerceId)) continue;
    const enregistre = await emettreReleve(releve);
    if (enregistre) emis.push(enregistre);
  }

  return { emis, ignores: releves.length - emis.length };
}

/** Refuse l'émission tant que l'identité légale de l'émetteur est incomplète. */
export function emetteurPret(): { pret: boolean; manquantes: string[] } {
  const manquantes = mentionsManquantes();
  return { pret: manquantes.length === 0, manquantes };
}
