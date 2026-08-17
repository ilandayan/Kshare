import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmailWithAttachment, notifyAdmin, emailDocumentsMensuels } from "@/lib/resend";
import { recapitulatifCommissions, recapitulatifAbonnements, libellePeriode, type LigneFacture } from "@/lib/invoicing/compute";
import { relevesPeriode } from "@/lib/invoicing/releve";
import { archiverPdfFacture, emettreReleve, emetteurPret, type FactureLigne } from "@/lib/invoicing/emission";
import { plateformeLancee } from "@/lib/platform-config";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
/** L'émission de plusieurs dizaines de PDF dépasse largement la limite par défaut. */
export const maxDuration = 300;

/**
 * Facturation mensuelle automatique, le 1er du mois.
 *
 * Émet et envoie, pour le mois écoulé et pour chaque commerce : son relevé de
 * ventes, sa facture de commission, et sa facture d'abonnement s'il est en
 * plan Pro. Un Starter ne reçoit jamais de facture d'abonnement.
 *
 * Trois précautions qui comptent :
 *
 * — **Idempotent.** Relancé, il ne réémet rien : l'unicité en base porte sur
 *   (commerce, période, nature) et les documents déjà émis sont ignorés. Un
 *   cron qui double-facturerait après une erreur réseau serait pire que pas
 *   de cron du tout.
 * — **Il refuse d'émettre si l'identité de l'émetteur est incomplète.** Une
 *   facture sans SIRET est irrégulière ; mieux vaut ne rien envoyer et alerter.
 * — **Un échec n'arrête pas les autres.** Chaque commerce est traité
 *   indépendamment, et le compte rendu dit précisément ce qui a échoué.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    console.error("[cron/facturation] CRON_SECRET absent ou trop court");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Le mois écoulé. `periode` permet de rejouer un mois manqué à la main.
  const demandee = request.nextUrl.searchParams.get("periode");
  const maintenant = new Date();
  const precedent = new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 1, 1),
  );
  const periode =
    demandee && /^\d{4}-(0[1-9]|1[0-2])$/.test(demandee)
      ? demandee
      : `${precedent.getUTCFullYear()}-${String(precedent.getUTCMonth() + 1).padStart(2, "0")}`;

  // Rien ne sort avant l'ouverture officielle. Une facture partie trop tôt ne
  // se rattrape pas : elle s'annule, s'explique, et entame la confiance d'un
  // commerce qui n'a encore rien vendu. Le mois manqué se rejoue à la main
  // avec `?periode=`.
  if (!(await plateformeLancee())) {
    console.info(
      `[cron/facturation] Plateforme non lancée — facturation de ${periode} suspendue.`,
    );
    return NextResponse.json({ statut: "plateforme_non_lancee", periode }, { status: 200 });
  }

  const { pret, manquantes } = emetteurPret();
  if (!pret) {
    const message = `Facturation de ${libellePeriode(periode)} non exécutée : identité de l'émetteur incomplète (${manquantes.join(", ")}).`;
    console.error("[cron/facturation]", message);
    await notifyAdmin({
      subject: "Kshare — Facturation mensuelle bloquée",
      html: `<p>${message}</p><p>Renseignez les variables d'environnement manquantes, puis relancez avec <code>?periode=${periode}</code>.</p>`,
    });
    return NextResponse.json({ error: "emetteur_incomplet", manquantes, periode }, { status: 412 });
  }

  const supabase = createAdminClient();
  const bornes = bornesDocument(periode);

  const resultats: Array<{
    commerce: string;
    releve?: string;
    factures: string[];
    envoye: boolean;
    erreur?: string;
  }> = [];

  try {
    const [commissions, abonnements, releves] = await Promise.all([
      recapitulatifCommissions(periode),
      recapitulatifAbonnements(periode),
      relevesPeriode(periode),
    ]);

    // Un commerce reçoit un envoi s'il a vendu ou s'il doit un abonnement.
    const commerces = new Set([
      ...releves.map((r) => r.commerceId),
      ...commissions.map((c) => c.commerceId),
      ...abonnements.map((a) => a.commerceId),
    ]);

    for (const commerceId of commerces) {
      const releve = releves.find((r) => r.commerceId === commerceId);
      const commission = commissions.find((c) => c.commerceId === commerceId);
      const abonnement = abonnements.find((a) => a.commerceId === commerceId);
      const nom = releve?.nom ?? commission?.nom ?? abonnement?.nom ?? commerceId;

      try {
        const pieces: { filename: string; content: Buffer }[] = [];
        const numeros: string[] = [];

        // ── Le relevé de ventes ──
        let referenceReleve = "";
        if (releve) {
          const { data: dejaEmis } = await supabase
            .from("sales_statements")
            .select("id, reference, pdf_url")
            .eq("commerce_id", commerceId)
            .eq("period_start", bornes.debut)
            .eq("status", "issued")
            .maybeSingle();

          const enregistre = dejaEmis
            ? { reference: dejaEmis.reference, cheminPdf: dejaEmis.pdf_url }
            : await emettreReleve(releve);

          if (enregistre?.cheminPdf) {
            referenceReleve = enregistre.reference;
            const fichier = await supabase.storage.from("invoices").download(enregistre.cheminPdf);
            if (fichier.data) {
              pieces.push({
                filename: `${enregistre.reference}.pdf`,
                content: Buffer.from(await fichier.data.arrayBuffer()),
              });
            }
          }
        }

        // ── Les factures ──
        for (const recap of [commission, abonnement]) {
          if (!recap) continue;
          const nature = recap === commission ? "commission" : "subscription";
          const facture = await emettreFacturePour(
            commerceId,
            periode,
            bornes,
            nature,
            recap as never,
          );
          if (!facture?.number) continue;
          numeros.push(facture.number);

          const chemin = facture.pdf_url ?? (await archiverPdfFacture(facture));
          if (!chemin) continue;
          const fichier = await supabase.storage.from("invoices").download(chemin);
          if (fichier.data) {
            pieces.push({
              filename: `${facture.number}.pdf`,
              content: Buffer.from(await fichier.data.arrayBuffer()),
            });
          }
        }

        // ── L'envoi ──
        const destinataire = releve?.email ?? commission?.email ?? abonnement?.email ?? null;
        let envoye = false;

        if (destinataire && pieces.length > 0) {
          const { subject, html } = emailDocumentsMensuels({
            commerceName: nom,
            periode: libellePeriode(periode),
            ventes: releve?.ventes ?? 0,
            commission: releve?.commission ?? commission?.total ?? 0,
            net: releve?.net ?? 0,
            referenceReleve,
            numerosFactures: numeros,
          });
          envoye = await sendEmailWithAttachment({ to: destinataire, subject, html, attachments: pieces });

          if (envoye) {
            const maintenantIso = new Date().toISOString();
            await supabase
              .from("sales_statements")
              .update({ sent_at: maintenantIso })
              .eq("commerce_id", commerceId)
              .eq("period_start", bornes.debut)
              .eq("status", "issued");
            await supabase
              .from("invoices")
              .update({ sent_at: maintenantIso })
              .eq("commerce_id", commerceId)
              .eq("period_start", bornes.debut)
              .eq("status", "issued");
          }
        }

        resultats.push({ commerce: nom, releve: referenceReleve || undefined, factures: numeros, envoye });
      } catch (erreur) {
        const message = erreur instanceof Error ? erreur.message : "Erreur inconnue";
        console.error("[cron/facturation]", nom, message);
        resultats.push({ commerce: nom, factures: [], envoye: false, erreur: message });
      }
    }
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Erreur inconnue";
    console.error("[cron/facturation] Échec global :", message);
    await notifyAdmin({
      subject: "Kshare — Facturation mensuelle en échec",
      html: `<p>La facturation de ${libellePeriode(periode)} a échoué avant de traiter les commerces.</p><p><code>${message}</code></p>`,
    });
    return NextResponse.json({ error: message, periode }, { status: 500 });
  }

  const echecs = resultats.filter((r) => r.erreur || !r.envoye);
  await notifyAdmin({
    subject: `Kshare — Facturation de ${libellePeriode(periode)} : ${resultats.length - echecs.length}/${resultats.length} envoyés`,
    html: compteRendu(periode, resultats),
  });

  return NextResponse.json({
    periode,
    traites: resultats.length,
    envoyes: resultats.length - echecs.length,
    resultats,
  });
}

/** Bornes du document : la fin est le dernier jour du mois, inclus. */
function bornesDocument(periode: string): { debut: string; fin: string } {
  const [annee, mois] = periode.split("-").map((n) => parseInt(n, 10));
  return {
    debut: new Date(Date.UTC(annee, mois - 1, 1)).toISOString().slice(0, 10),
    fin: new Date(Date.UTC(annee, mois, 0)).toISOString().slice(0, 10),
  };
}

type RecapCommun = {
  commerceId: string;
  nom: string;
  email: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  siret: string | null;
  plan: string;
  lignes: LigneFacture[];
  total?: number;
  montant?: number;
  commission?: number;
  regularisation?: number;
  tauxCommission?: number;
  ventes?: number;
  paniers?: number;
  commandes?: unknown[];
  orderIds?: string[];
};

/**
 * Crée puis émet la facture d'un commerce, ou reprend celle qui existe déjà.
 *
 * Le brouillon n'est qu'une étape : le cron l'émet dans la foulée. C'est la
 * contrainte d'unicité en base qui garantit qu'un second passage ne crée pas
 * de doublon, et non une vérification applicative qui pourrait courir.
 */
async function emettreFacturePour(
  commerceId: string,
  periode: string,
  bornes: { debut: string; fin: string },
  nature: "commission" | "subscription",
  recap: RecapCommun,
): Promise<FactureLigne | null> {
  const supabase = createAdminClient();

  const { data: existante } = await supabase
    .from("invoices")
    .select("*")
    .eq("commerce_id", commerceId)
    .eq("period_start", bornes.debut)
    .eq("kind", nature)
    .neq("status", "canceled")
    .maybeSingle();

  let facture = existante as unknown as FactureLigne | null;

  if (!facture) {
    const total = nature === "commission" ? (recap.total ?? 0) : (recap.montant ?? 0);
    const { data: cree, error } = await supabase
      .from("invoices")
      .insert({
        kind: nature,
        commerce_id: commerceId,
        period_start: bornes.debut,
        period_end: bornes.fin,
        amount_ht: total,
        vat_rate: 0,
        vat_amount: 0,
        amount_ttc: total,
        commission_total: nature === "commission" ? (recap.commission ?? 0) : 0,
        adjustment_total: nature === "commission" ? (recap.regularisation ?? 0) : 0,
        subscription_amount: nature === "subscription" ? total : 0,
        commission_rate: recap.tauxCommission ?? null,
        plan: recap.plan,
        sales_total: recap.ventes ?? 0,
        orders_count: recap.paniers ?? 0,
        due_amount: 0,
        lines: recap.lignes as unknown as Json,
        order_detail: (recap.commandes ?? []) as unknown as Json,
        order_ids: recap.orderIds ?? [],
        commerce_snapshot: {
          name: recap.nom,
          address: recap.adresse,
          postal_code: recap.codePostal,
          city: recap.ville,
          siret: recap.siret,
          email: recap.email,
        },
        status: "draft",
      })
      .select("*")
      .single();

    if (error || !cree) {
      console.error("[cron/facturation] Création impossible :", error?.message);
      return null;
    }
    facture = cree as unknown as FactureLigne;
  }

  if (facture.status === "draft") {
    const { data: emise, error } = await supabase.rpc("emettre_facture", {
      p_invoice_id: facture.id,
    });
    if (error || !emise) {
      console.error("[cron/facturation] Émission impossible :", error?.message);
      return null;
    }
    facture = emise as unknown as FactureLigne;
  }

  return facture;
}

function compteRendu(
  periode: string,
  resultats: Array<{ commerce: string; releve?: string; factures: string[]; envoye: boolean; erreur?: string }>,
): string {
  if (resultats.length === 0) {
    return `<p>Aucun commerce à facturer pour ${libellePeriode(periode)}.</p>`;
  }

  const lignes = resultats
    .map((r) => {
      const documents = [r.releve, ...r.factures].filter(Boolean).join(", ") || "aucun document";
      const etat = r.erreur
        ? `<span style="color:#b91c1c;">échec — ${r.erreur}</span>`
        : r.envoye
          ? `<span style="color:#15803d;">envoyé</span>`
          : `<span style="color:#b45309;">émis, non envoyé</span>`;
      return `<li><strong>${r.commerce}</strong> — ${documents} · ${etat}</li>`;
    })
    .join("");

  return `<p>Facturation de ${libellePeriode(periode)} :</p><ul>${lignes}</ul>`;
}
