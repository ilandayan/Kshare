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
import type { Releve } from "@/lib/invoicing/releve";
import type { Json } from "@/types/database.types";

export type ResultatGroupe = {
  groupe: string;
  nom: string;
  magasins: number;
  caConsolide: number;
  tauxApplique: number | null;
  tauxSuivant: number;
  reference?: string;
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
    .select("id, nom, paliers, taux_courant")
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
        groupe.id,
        periode,
        bornes,
        lignes,
        caConsolide,
        commissionTotale,
        groupe.taux_courant,
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

/** Le récapitulatif de la centrale, émis une seule fois par période. */
async function emettreRecap(
  groupeId: string,
  periode: string,
  bornes: { debut: string; fin: string },
  lignes: LigneMagasin[],
  caTotal: number,
  commissionTotal: number,
  tauxApplique: number | null,
  tauxSuivant: number,
): Promise<{ reference: string; deja: boolean }> {
  const supabase = createAdminClient();
  const reference = referenceRecap(periode, groupeId);

  const { data: existant } = await supabase
    .from("groupe_recaps")
    .select("id, reference")
    .eq("groupe_id", groupeId)
    .eq("period_start", bornes.debut)
    .maybeSingle();

  if (existant) return { reference: existant.reference, deja: true };

  await supabase.from("groupe_recaps").insert({
    reference,
    groupe_id: groupeId,
    period_start: bornes.debut,
    period_end: bornes.fin,
    ca_total: caTotal,
    commission_total: commissionTotal,
    magasins: lignes as unknown as Json,
    taux_applique: tauxApplique,
    taux_suivant: tauxSuivant,
  });

  return { reference, deja: false };
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
      return (
        `<li><strong>${r.nom}</strong> — ${r.magasins} magasins, ` +
        `${r.caConsolide.toFixed(2)} € consolidés · ${evolution} à partir de ${aPartirDe}` +
        (r.deja ? " <em>(déjà calculé)</em>" : "") +
        `</li>`
      );
    })
    .join("");

  return `<p>Enseignes :</p><ul>${lignes}</ul>`;
}
