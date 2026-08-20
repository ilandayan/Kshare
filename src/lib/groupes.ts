/**
 * La commission dégressive des enseignes à plusieurs magasins.
 *
 * Le taux d'un magasin ne dépend pas de ses propres ventes mais de celles de
 * toute l'enseigne : c'est ce qui distingue une offre réseau d'une offre
 * standard répétée. Les magasins les plus modestes bénéficient du volume des
 * plus actifs.
 *
 * Le taux est figé au moment du paiement — le tunnel de commande lit
 * `commerces.commission_rate` et le pose sur `application_fee_amount` — alors
 * que le palier dépend du cumul du mois, inconnu avant sa fin. On ne peut donc
 * pas appliquer aujourd'hui un taux qui dépend de ventes à venir.
 *
 * D'où la règle : **le chiffre d'affaires du mois M détermine le taux du mois
 * M+1**, verrouillé pour tout le mois. C'est le seul mécanisme compatible avec
 * Stripe sans régularisation, et le plus lisible pour l'enseigne, qui connaît
 * son taux à l'avance au lieu de le découvrir sur sa facture.
 */

/** Un palier s'applique dès que le chiffre d'affaires consolidé atteint `seuil`. */
export type Palier = {
  seuil: number;
  taux: number;
};

/**
 * Grille par défaut, calée sur un panier moyen à 8 €.
 *
 * Les seuils ne sont pas ronds par hasard : ils correspondent à 1, 2 et
 * 5 paniers par jour et par magasin sur un réseau de quinze magasins ouverts
 * vingt-cinq jours. 15 × 5 × 25 × 8 = 15 000 €.
 */
export const PALIERS_DEFAUT: readonly Palier[] = [
  { seuil: 0, taux: 18 },
  { seuil: 3000, taux: 16 },
  { seuil: 6000, taux: 14 },
  { seuil: 15000, taux: 12 },
];

/** Taux appliqué à un groupe dont aucun mois n'a encore été clos. */
export const TAUX_BASE = 18;

/**
 * Trie la grille et écarte les paliers inexploitables.
 *
 * La grille vient de la base, où un administrateur peut l'avoir saisie à la
 * main : on ne suppose ni l'ordre, ni la validité des valeurs.
 */
function grilleUtilisable(paliers: readonly Palier[] | null | undefined): Palier[] {
  const valides = (paliers ?? []).filter(
    (p) =>
      typeof p?.seuil === "number" &&
      typeof p?.taux === "number" &&
      Number.isFinite(p.seuil) &&
      Number.isFinite(p.taux) &&
      p.seuil >= 0 &&
      p.taux >= 0 &&
      p.taux <= 100,
  );
  return valides.sort((a, b) => a.seuil - b.seuil);
}

/**
 * Le taux dû pour un chiffre d'affaires consolidé donné.
 *
 * On retient le plus haut seuil atteint, la borne profitant au commerce :
 * 15 000 € pile donnent 12 %, et non 14 %. C'est ce que dit la proposition
 * commerciale — « à partir de 15 000 € » — et l'inverse serait une mauvaise
 * surprise sur la facture.
 *
 * Une grille vide ou illisible ramène au taux de base : jamais à un taux
 * réduit qui n'aurait été décidé par personne.
 */
export function resoudreTaux(
  ca: number,
  paliers: readonly Palier[] | null | undefined = PALIERS_DEFAUT,
): number {
  const grille = grilleUtilisable(paliers);
  if (grille.length === 0) return TAUX_BASE;
  if (!Number.isFinite(ca) || ca < 0) return TAUX_BASE;

  let retenu = grille[0].seuil === 0 ? grille[0].taux : TAUX_BASE;
  for (const palier of grille) {
    if (ca >= palier.seuil) retenu = palier.taux;
    else break;
  }
  return retenu;
}

/** Ce qu'il reste à vendre pour atteindre le palier suivant. */
export type ProchainPalier = {
  taux: number;
  seuil: number;
  manque: number;
};

/**
 * Le palier suivant, et la distance qui l'en sépare.
 *
 * Sert l'espace groupe : « encore 1 240 € ce mois-ci pour passer à 14 % » est
 * autrement plus parlant qu'un tableau de seuils.
 *
 * Renvoie `null` quand le meilleur taux est déjà atteint, ou quand aucun palier
 * supérieur n'est réellement plus avantageux — une grille mal saisie ne doit
 * pas promettre une remise qui n'existe pas.
 */
export function prochainPalier(
  ca: number,
  paliers: readonly Palier[] | null | undefined = PALIERS_DEFAUT,
): ProchainPalier | null {
  const grille = grilleUtilisable(paliers);
  const actuel = resoudreTaux(ca, grille);

  for (const palier of grille) {
    if (palier.seuil > ca && palier.taux < actuel) {
      return {
        taux: palier.taux,
        seuil: palier.seuil,
        manque: Math.round((palier.seuil - ca) * 100) / 100,
      };
    }
  }
  return null;
}

/** Le mois suivant, au format AAAA-MM. */
export function periodeSuivante(periode: string): string {
  const [annee, mois] = periode.split("-").map((n) => parseInt(n, 10));
  if (!Number.isFinite(annee) || !Number.isFinite(mois)) {
    throw new Error(`periodeSuivante : période illisible « ${periode} »`);
  }
  const suivant = new Date(Date.UTC(annee, mois, 1));
  return `${suivant.getUTCFullYear()}-${String(suivant.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Référence du récapitulatif remis à la centrale. */
export function referenceRecap(periode: string, groupeId: string): string {
  return `RCP-${periode}-${groupeId.slice(0, 8).toUpperCase()}`;
}
