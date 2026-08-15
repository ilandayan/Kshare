/**
 * Identité légale de l'émetteur des factures.
 *
 * Deux identités cohabitent, et la confusion coûte cher :
 *
 * — le **nom commercial** (Kshare), qui est ce que le commerçant reconnaît ;
 * — la **dénomination légale**, qui pour une entreprise individuelle est le nom
 *   de l'entrepreneur, obligatoirement accompagné de la mention « Entrepreneur
 *   individuel » ou « EI » (art. L526-22 du code de commerce, issu de la loi du
 *   14 février 2022, et art. R123-237 pour les documents commerciaux).
 *
 * Le nom commercial peut s'ajouter, jamais se substituer. Une facture au seul
 * nom de « Kshare » n'identifie aucune personne juridique et est irrégulière.
 * Les deux vivent donc à des endroits différents du document : la marque et ses
 * coordonnées dans le cadre émetteur en tête, l'identité juridique en pied de
 * page. Toutes les mentions obligatoires figurent bien sur la facture, la loi
 * n'en fixant pas l'emplacement.
 *
 * Ces valeurs vivent en variables d'environnement plutôt qu'en dur : l'adresse
 * d'un micro-entrepreneur est son domicile, et n'a rien à faire dans
 * l'historique Git.
 */

export interface Emetteur {
  /** Ce que le commerçant reconnaît. Peut différer de la dénomination légale. */
  nomCommercial: string;
  /** Identité juridique : pour une EI, le nom de l'entrepreneur. */
  denominationLegale: string;
  /** « Entrepreneur individuel » ou « EI ». Obligatoire pour une EI. */
  mentionEI: string;
  adresse: string;
  codePostal: string;
  ville: string;
  siret: string;
  /** Micro-entrepreneur : « Dispensé d'immatriculation au RCS et au RM ». */
  immatriculation: string;
  email: string;
  site: string;
  /** Mention de franchise en base. Devient la mention de TVA le jour venu. */
  mentionTva: string;
}

export const EMETTEUR: Emetteur = {
  nomCommercial: process.env.KSHARE_NOM_COMMERCIAL ?? "Kshare",
  denominationLegale: process.env.KSHARE_DENOMINATION ?? "",
  mentionEI: process.env.KSHARE_MENTION_EI ?? "Entrepreneur individuel",
  adresse: process.env.KSHARE_ADRESSE ?? "",
  codePostal: process.env.KSHARE_CODE_POSTAL ?? "",
  ville: process.env.KSHARE_VILLE ?? "",
  siret: process.env.KSHARE_SIRET ?? "",
  immatriculation:
    process.env.KSHARE_IMMATRICULATION ?? "Dispensé d'immatriculation au RCS et au RM",
  email: "contact@k-share.fr",
  site: "k-share.fr",
  mentionTva: "TVA non applicable, article 293 B du code général des impôts",
};

/**
 * Bloc d'en-tête : la marque et ses coordonnées.
 *
 * C'est l'interlocuteur du commerce — celui qu'il reconnaît et à qui il écrit.
 * L'identité juridique de l'entrepreneur, elle, part en pied de page.
 */
export function blocEmetteurEnTete(): string[] {
  return [
    EMETTEUR.nomCommercial,
    EMETTEUR.adresse,
    `${EMETTEUR.codePostal} ${EMETTEUR.ville}`.trim(),
    `SIRET ${EMETTEUR.siret}`,
    EMETTEUR.email,
  ].filter((l) => l.trim() && l.trim() !== "SIRET");
}

/**
 * Bloc de pied de page : l'identité juridique.
 *
 * Une entreprise individuelle doit faire figurer le nom de l'entrepreneur suivi
 * de sa qualité. La loi impose la mention, pas son emplacement : la porter en
 * pied de page, sur chaque page, satisfait l'obligation sans mettre le nom de
 * l'entrepreneur au même rang que celui du client.
 */
export function blocEmetteurPied(): string[] {
  return [
    `${EMETTEUR.denominationLegale} — ${EMETTEUR.mentionEI}`,
    EMETTEUR.immatriculation,
    EMETTEUR.site,
  ].filter((l) => l.trim() && l.trim() !== "—");
}

/**
 * Mentions obligatoires en B2B depuis la loi LME : sans elles, le retard de
 * paiement n'ouvre droit à rien.
 */
export const TAUX_PENALITES_RETARD =
  "En cas de retard de paiement, pénalités au taux de trois fois le taux d'intérêt légal, exigibles sans rappel.";
export const INDEMNITE_RECOUVREMENT =
  "Indemnité forfaitaire pour frais de recouvrement : 40 € (art. L441-10 et D441-5 du code de commerce).";
export const ESCOMPTE = "Aucun escompte pour paiement anticipé.";

/** Délai de conservation légal des factures, rappelé dans l'espace de gestion. */
export const CONSERVATION_ANNEES = 10;

/**
 * Renvoie la liste des mentions manquantes, vide si l'émetteur est complet.
 *
 * Appelée avant l'émission : mieux vaut un refus explicite qu'une facture
 * irrégulière envoyée à un commerce, qu'il faudrait ensuite annuler et
 * réémettre.
 */
export function mentionsManquantes(): string[] {
  const requis: Array<[keyof Emetteur, string]> = [
    ["denominationLegale", "dénomination légale (KSHARE_DENOMINATION)"],
    ["mentionEI", "mention « Entrepreneur individuel » (KSHARE_MENTION_EI)"],
    ["adresse", "adresse (KSHARE_ADRESSE)"],
    ["codePostal", "code postal (KSHARE_CODE_POSTAL)"],
    ["ville", "ville (KSHARE_VILLE)"],
    ["siret", "SIRET (KSHARE_SIRET)"],
  ];

  return requis.filter(([cle]) => !EMETTEUR[cle].trim()).map(([, libelle]) => libelle);
}
