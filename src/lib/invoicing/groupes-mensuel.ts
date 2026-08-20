/**
 * La passe mensuelle des enseignes, exécutée après les relevés et les factures.
 *
 * Elle fait trois choses, dans cet ordre : consolider les ventes des magasins
 * d'un même groupe, en déduire le taux du mois à venir et l'inscrire sur chaque
 * magasin membre, puis produire le récapitulatif remis à la centrale.
 *
 * Le taux calculé ici ne vaut jamais pour le mois qu'on vient de clore — il est
 * déjà facturé — mais pour le suivant. Voir `src/lib/groupes.ts` : la commission
 * est figée sur le paiement Stripe, elle ne peut pas dépendre de ventes
 * postérieures.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  resoudreTaux,
  periodeSuivante,
  referenceRecap,
  PALIERS_DEFAUT,
  type Palier,
} from "@/lib/groupes";
import { libellePeriode } from "@/lib/invoicing/compute";
import { generateGroupRecapPdf } from "@/lib/pdf/generate-group-recap-pdf";
import { sendEmailWithAttachment } from "@/lib/resend";
import type { Releve } from "@/lib/invoicing/releve";
import type { Json } from "@/types/database.types";

/** Les récapitulatifs sont archivés avec les autres documents de facturation. */
const BUCKET = "invoices";

export type ResultatGroupe = {
  groupe: string;
  nom: string;
  magasins: number;
  caConsolide: number;
  tauxApplique: number | null;
  tauxSuivant: number;
  reference?: string;
  /** Le récapitulatif a-t-il pu partir chez la centrale ? */
  envoye?: boolean;
  deja?: boolean;
  erreur?: string;
};

/** Un magasin tel qu'il figure au récapitulatif. */
type LigneMagasin = {
  id: string;
  nom: string;
  ventes: number;
  commission: number;
  paniers: number;
};

const arrondi = (n: number) => Math.round(n * 100) / 100;

/**
 * Consolide, applique et récapitule, pour toutes les enseignes actives.
 *
 * Un groupe en échec n'interrompt pas les autres : la centrale d'une enseigne
 * n'a pas à pâtir d'une donnée incohérente chez une autre.
 */
export async function passeGroupes(
  periode: string,
  releves: Releve[],
  bornes: { debut: string; fin: string },
): Promise<ResultatGroupe[]> {
  const supabase = createAdminClient();

  const { data: groupes, error } = await supabase
    .from("groupes")
    .select("id, nom, siren, contact_nom, contact_email, paliers, taux_courant")
    .eq("actif", true);

  if (error) {
    console.error("[groupes] lecture des enseignes impossible :", error);
    return [];
  }
  if (!groupes || groupes.length === 0) return [];

  const parCommerce = new Map(releves.map((r) => [r.commerceId, r]));
  const resultats: ResultatGroupe[] = [];

  for (const groupe of groupes) {
    try {
      // Tous les magasins du groupe, y compris ceux qui n'ont rien vendu : ils
      // doivent recevoir le nouveau taux comme les autres.
      const { data: membres } = await supabase
        .from("commerces")
        .select("id, name, commission_rate")
        .eq("groupe_id", groupe.id);

      if (!membres || membres.length === 0) continue;

      const lignes: LigneMagasin[] = membres.map((m) => {
        const releve = parCommerce.get(m.id);
        return {
          id: m.id,
          nom: m.name,
          ventes: arrondi(releve?.ventes ?? 0),
          commission: arrondi(releve?.commission ?? 0),
          paniers: releve?.paniers ?? 0,
        };
      });

      const caConsolide = arrondi(lignes.reduce((s, l) => s + l.ventes, 0));
      const commissionTotale = arrondi(lignes.reduce((s, l) => s + l.commission, 0));

      const paliers = lisibleOuDefaut(groupe.paliers);
      const tauxSuivant = resoudreTaux(caConsolide, paliers);

      // Rejouable sans dégât : l'historique porte l'unicité sur (groupe, période).
      const { data: dejaCalcule } = await supabase
        .from("groupe_taux_historique")
        .select("id, taux")
        .eq("groupe_id", groupe.id)
        .eq("periode", periode)
        .maybeSingle();

      if (!dejaCalcule) {
        await supabase.from("groupe_taux_historique").insert({
          groupe_id: groupe.id,
          periode,
          ca_consolide: caConsolide,
          taux: tauxSuivant,
          taux_precedent: groupe.taux_courant,
          magasins: membres.length,
        });

        // Le taux part sur chaque magasin : c'est cette colonne que lira le
        // tunnel de commande au prochain panier vendu.
        await supabase
          .from("commerces")
          .update({ commission_rate: tauxSuivant })
          .eq("groupe_id", groupe.id);

        await supabase
          .from("groupes")
          .update({ taux_courant: tauxSuivant, updated_at: new Date().toISOString() })
          .eq("id", groupe.id);
      }

      const recap = await emettreRecap(
        groupe,
        periode,
        bornes,
        lignes,
        caConsolide,
        commissionTotale,
        tauxSuivant,
      );

      resultats.push({
        groupe: groupe.id,
        nom: groupe.nom,
        magasins: membres.length,
        caConsolide,
        tauxApplique: groupe.taux_courant,
        tauxSuivant,
        reference: recap.reference,
        envoye: recap.envoye,
        deja: Boolean(dejaCalcule) && recap.deja,
      });
    } catch (e) {
      console.error(`[groupes] ${groupe.nom} :`, e);
      resultats.push({
        groupe: groupe.id,
        nom: groupe.nom,
        magasins: 0,
        caConsolide: 0,
        tauxApplique: groupe.taux_courant,
        tauxSuivant: groupe.taux_courant ?? 0,
        erreur: e instanceof Error ? e.message : "erreur inconnue",
      });
    }
  }

  return resultats;
}

/**
 * La grille du groupe, ou celle par défaut si elle est absente ou illisible.
 *
 * `paliers` est un JSONB : rien ne garantit sa forme côté base.
 */
function lisibleOuDefaut(brut: unknown): readonly Palier[] {
  if (!Array.isArray(brut)) return PALIERS_DEFAUT;
  const paliers = brut.filter(
    (p): p is Palier =>
      typeof p === "object" && p !== null && "seuil" in p && "taux" in p,
  );
  return paliers.length > 0 ? paliers : PALIERS_DEFAUT;
}

/** L'enseigne, telle que la passe mensuelle la lit. */
type Enseigne = {
  id: string;
  nom: string;
  siren: string | null;
  contact_nom: string | null;
  contact_email: string | null;
  taux_courant: number | null;
};

/**
 * Le récapitulatif de la centrale : enregistré, mis en PDF, archivé, envoyé.
 *
 * Émis une seule fois par période. Relancé, le cron retrouve l'existant et
 * n'envoie rien : une centrale qui recevrait deux récapitulatifs du même mois
 * douterait des deux.
 */
async function emettreRecap(
  groupe: Enseigne,
  periode: string,
  bornes: { debut: string; fin: string },
  lignes: LigneMagasin[],
  caTotal: number,
  commissionTotal: number,
  tauxSuivant: number,
): Promise<{ reference: string; deja: boolean; envoye: boolean }> {
  const supabase = createAdminClient();
  const reference = referenceRecap(periode, groupe.id);

  const { data: existant } = await supabase
    .from("groupe_recaps")
    .select("id, reference, sent_at")
    .eq("groupe_id", groupe.id)
    .eq("period_start", bornes.debut)
    .maybeSingle();

  if (existant) {
    return { reference: existant.reference, deja: true, envoye: Boolean(existant.sent_at) };
  }

  const emisLe = new Date().toISOString();

  const { data: enregistre } = await supabase
    .from("groupe_recaps")
    .insert({
      reference,
      groupe_id: groupe.id,
      period_start: bornes.debut,
      period_end: bornes.fin,
      ca_total: caTotal,
      commission_total: commissionTotal,
      magasins: lignes as unknown as Json,
      taux_applique: groupe.taux_courant,
      taux_suivant: tauxSuivant,
      issued_at: emisLe,
    })
    .select("id")
    .single();

  const pdf = generateGroupRecapPdf({
    reference,
    emisLe,
    periodeLibelle: libellePeriode(periode),
    periodeSuivanteLibelle: libellePeriode(periodeSuivante(periode)),
    debut: bornes.debut,
    fin: bornes.fin,
    groupe: {
      nom: groupe.nom,
      siren: groupe.siren,
      contactNom: groupe.contact_nom,
      contactEmail: groupe.contact_email,
    },
    caTotal,
    commissionTotal,
    tauxApplique: groupe.taux_courant,
    tauxSuivant,
    magasins: lignes.map((l) => ({
      nom: l.nom,
      ventes: l.ventes,
      commission: l.commission,
      paniers: l.paniers,
    })),
  });

  const chemin = `groupes/${groupe.id}/${reference}.pdf`;
  const { error: erreurUpload } = await supabase.storage
    .from(BUCKET)
    .upload(chemin, pdf, { contentType: "application/pdf", upsert: true });

  if (erreurUpload) {
    console.error("[groupes] archivage du récapitulatif impossible :", erreurUpload);
  } else if (enregistre) {
    await supabase.from("groupe_recaps").update({ pdf_url: chemin }).eq("id", enregistre.id);
  }

  // Sans adresse de contact, le document reste archivé et consultable depuis
  // l'espace enseigne : il n'y a pas d'échec, seulement pas d'envoi.
  if (!groupe.contact_email) {
    return { reference, deja: false, envoye: false };
  }

  const envoye = await sendEmailWithAttachment({
    to: groupe.contact_email,
    ...emailRecapGroupe({
      enseigne: groupe.nom,
      periode: libellePeriode(periode),
      periodeSuivante: libellePeriode(periodeSuivante(periode)),
      magasins: lignes.length,
      caTotal,
      tauxApplique: groupe.taux_courant,
      tauxSuivant,
    }),
    attachments: [{ filename: `${reference}.pdf`, content: pdf }],
  });

  if (envoye && enregistre) {
    await supabase
      .from("groupe_recaps")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", enregistre.id);
  }

  return { reference, deja: false, envoye };
}

const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Le message qui accompagne le récapitulatif chez la centrale. */
function emailRecapGroupe(params: {
  enseigne: string;
  periode: string;
  periodeSuivante: string;
  magasins: number;
  caTotal: number;
  tauxApplique: number | null;
  tauxSuivant: number;
}): { subject: string; html: string } {
  const montant = (v: number) => v.toFixed(2).replace(".", ",");
  const enseigne = echapper(params.enseigne);

  // Le changement de taux est dit dès l'objet : c'est la seule information du
  // message qui appelle une décision, et personne n'ouvre toutes ses pièces
  // jointes.
  const changement =
    params.tauxApplique !== null && params.tauxSuivant !== params.tauxApplique
      ? ` — commission ${params.tauxSuivant} % à compter de ${params.periodeSuivante}`
      : "";

  return {
    subject: `Kshare — Récapitulatif ${enseigne}, ${params.periode}${changement}`,
    html: `
      <p>Bonjour,</p>
      <p>
        Voici le récapitulatif de votre enseigne pour ${echapper(params.periode)} :
        <strong>${montant(params.caTotal)} €</strong> de ventes sur
        ${params.magasins} magasin${params.magasins > 1 ? "s" : ""}.
      </p>
      <p>
        La commission applicable à compter de ${echapper(params.periodeSuivante)} est de
        <strong>${params.tauxSuivant} %</strong>, pour l'ensemble de vos points de vente.
        Elle découle du chiffre d'affaires consolidé du mois écoulé et ne varie pas
        en cours de mois.
      </p>
      <p>
        Chaque magasin reçoit par ailleurs son relevé de ventes et sa facture,
        établis à son nom. Le récapitulatif ci-joint est un document de synthèse.
      </p>
      <p>Bien à vous,<br>L'équipe Kshare</p>
    `,
  };
}

/** Le volet « enseignes » du compte rendu envoyé à l'admin après le cron. */
export function compteRenduGroupes(periode: string, resultats: ResultatGroupe[]): string {
  if (resultats.length === 0) return "";
  const aPartirDe = periodeSuivante(periode);

  const lignes = resultats
    .map((r) => {
      if (r.erreur) {
        return `<li><strong>${r.nom}</strong> — <span style="color:#b91c1c;">échec — ${r.erreur}</span></li>`;
      }
      const evolution =
        r.tauxApplique === null
          ? `taux ${r.tauxSuivant} %`
          : r.tauxSuivant === r.tauxApplique
            ? `taux inchangé à ${r.tauxSuivant} %`
            : `taux ${r.tauxApplique} % → <strong>${r.tauxSuivant} %</strong>`;
      const recap = r.deja
        ? " <em>(déjà calculé)</em>"
        : r.envoye
          ? " · récapitulatif envoyé"
          : ` · <span style="color:#b45309;">récapitulatif non envoyé</span>`;
      return (
        `<li><strong>${r.nom}</strong> — ${r.magasins} magasins, ` +
        `${r.caConsolide.toFixed(2)} € consolidés · ${evolution} à partir de ${aPartirDe}` +
        recap +
        `</li>`
      );
    })
    .join("");

  return `<p>Enseignes :</p><ul>${lignes}</ul>`;
}
