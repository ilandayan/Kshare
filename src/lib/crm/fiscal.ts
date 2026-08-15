/**
 * Barèmes du régime micro-entrepreneur, applicables en 2026.
 *
 * Vérifiés le 15 août 2026 sur les sources officielles — Urssaf, impots.gouv.fr
 * et Bpifrance Création. Ils ont beaucoup bougé : la franchise en base devait
 * tomber à 25 000 €, la mesure a été repoussée puis fixée à 37 500 €, et le
 * taux BNC est passé de 24,6 % à 25,6 % au 1er janvier 2026. Ils sont donc
 * rassemblés ici, datés, plutôt que dispersés dans les écrans.
 *
 * **À confirmer par Ilan** : la catégorie d'activité. Une commission
 * d'intermédiaire relève normalement des BIC — prestation de services
 * commerciale — mais c'est la déclaration d'activité qui tranche, et l'écart
 * de taux est de plus de quatre points.
 */

export const ANNEE_BAREME = 2026;
export const VERIFIE_LE = "2026-08-15";

/** Catégories fiscales possibles pour une prestation de services. */
export type CategorieActivite = "bic_services" | "bnc";

export const LIBELLES_CATEGORIE: Record<CategorieActivite, string> = {
  bic_services: "Prestations de services commerciales ou artisanales (BIC)",
  bnc: "Autres prestations de services (BNC)",
};

/**
 * Catégorie retenue par défaut.
 *
 * Kshare met en relation des commerces et des clients et prélève une
 * commission : c'est une activité d'intermédiaire commercial, donc BIC. À
 * corriger si la déclaration d'activité dit autre chose.
 */
export const CATEGORIE_PAR_DEFAUT: CategorieActivite = "bic_services";

/** Taux global de cotisations sociales, en pourcentage du chiffre d'affaires. */
export const TAUX_COTISATIONS: Record<CategorieActivite, number> = {
  bic_services: 21.2,
  bnc: 25.6,
};

/**
 * Versement libératoire de l'impôt sur le revenu, si l'option a été prise.
 *
 * Elle est facultative et soumise à condition de revenu fiscal de référence :
 * l'écran demande donc si elle s'applique plutôt que de la supposer.
 */
export const TAUX_VERSEMENT_LIBERATOIRE: Record<CategorieActivite, number> = {
  bic_services: 1.7,
  bnc: 2.2,
};

/**
 * Contribution à la formation professionnelle.
 *
 * **Non vérifiée** faute de source officielle consultable au moment de
 * l'écriture : elle vaut historiquement 0,1 % pour un commerçant, 0,3 % pour un
 * artisan et 0,2 % pour une profession libérale. Laissée à zéro par défaut pour
 * ne pas afficher un chiffre inventé.
 */
export const TAUX_CFP: Record<CategorieActivite, number> = {
  bic_services: 0,
  bnc: 0,
};

/** Plafond du régime micro pour les prestations de services. */
export const PLAFOND_MICRO = 83_600;

/**
 * Franchise en base de TVA, prestations de services.
 *
 * Deux seuils, et la nuance compte : dépasser le seuil de base sans franchir le
 * seuil majoré laisse la franchise acquise jusqu'à la fin de l'année civile.
 * Franchir le seuil majoré la fait tomber **à la date du dépassement**, ce qui
 * oblige à facturer la TVA du jour au lendemain.
 */
export const SEUIL_FRANCHISE_TVA = 37_500;
export const SEUIL_FRANCHISE_TVA_MAJORE = 41_250;

export interface EtatSeuil {
  libelle: string;
  /** Chiffre d'affaires retenu pour ce seuil. */
  realise: number;
  seuil: number;
  /** Part du seuil déjà consommée, en pourcentage. */
  part: number;
  /** Projection en fin d'année au rythme actuel. */
  projection: number;
  /** Vrai si la projection dépasse le seuil. */
  depassementPrevu: boolean;
  depasse: boolean;
  consequence: string;
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Projette le chiffre d'affaires de fin d'année au rythme constaté.
 *
 * La projection est linéaire, ce qui est faux pour une activité saisonnière —
 * mais c'est une alerte, pas une prévision : mieux vaut regarder tôt un seuil
 * qu'on ne franchira peut-être pas que le découvrir en décembre.
 */
export function projeter(realise: number, jourDeLAnnee: number, joursDansLAnnee: number): number {
  if (jourDeLAnnee <= 0) return 0;
  return arrondi((realise / jourDeLAnnee) * joursDansLAnnee);
}

export function etatDesSeuils(caAnnuel: number, aujourdHui = new Date()): EtatSeuil[] {
  const debutAnnee = new Date(Date.UTC(aujourdHui.getUTCFullYear(), 0, 1));
  const finAnnee = new Date(Date.UTC(aujourdHui.getUTCFullYear() + 1, 0, 1));
  const jour = Math.max(
    1,
    Math.floor((aujourdHui.getTime() - debutAnnee.getTime()) / 86_400_000) + 1,
  );
  const joursDansLAnnee = Math.round((finAnnee.getTime() - debutAnnee.getTime()) / 86_400_000);
  const projection = projeter(caAnnuel, jour, joursDansLAnnee);

  const construire = (libelle: string, seuil: number, consequence: string): EtatSeuil => ({
    libelle,
    realise: arrondi(caAnnuel),
    seuil,
    part: arrondi((caAnnuel / seuil) * 100),
    projection,
    depassementPrevu: projection > seuil && caAnnuel <= seuil,
    depasse: caAnnuel > seuil,
    consequence,
  });

  return [
    construire(
      "Franchise en base de TVA",
      SEUIL_FRANCHISE_TVA,
      "Au-delà, la franchise reste acquise jusqu'au 31 décembre tant que le seuil majoré n'est pas franchi.",
    ),
    construire(
      "Franchise en base — seuil majoré",
      SEUIL_FRANCHISE_TVA_MAJORE,
      "Franchi, la TVA devient exigible dès la date du dépassement : il faut facturer la TVA sans délai.",
    ),
    construire(
      "Plafond du régime micro",
      PLAFOND_MICRO,
      "Dépassé deux années consécutives, le régime micro cesse de s'appliquer au 1er janvier suivant.",
    ),
  ];
}
