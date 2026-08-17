/**
 * Catégories de classement du CRM.
 *
 * Ces listes vivent hors des fichiers d'actions parce qu'un module marqué
 * `"use server"` **ne peut exporter que des fonctions asynchrones**. Elles y
 * étaient déclarées, et les composants qui les importaient faisaient échouer
 * les onglets Documents et Charges à l'exécution — sans que la compilation ni
 * les tests ne s'en aperçoivent.
 */

// ── Documents ────────────────────────────────────────────────────

export const CATEGORIES_DOCUMENT = [
  "juridique",
  "fiscal",
  "social",
  "banque",
  "assurance",
  "fournisseur",
  "contrat",
  "autre",
] as const;

export type CategorieDocument = (typeof CATEGORIES_DOCUMENT)[number];

export const LIBELLES_CATEGORIE: Record<CategorieDocument, string> = {
  juridique: "Juridique",
  fiscal: "Fiscal",
  social: "Social / URSSAF",
  banque: "Banque",
  assurance: "Assurance",
  fournisseur: "Fournisseur",
  contrat: "Contrat",
  autre: "Autre",
};

// ── Charges ──────────────────────────────────────────────────────

export const CATEGORIES_CHARGE = [
  "hebergement",
  "logiciel",
  "banque",
  "marketing",
  "materiel",
  "honoraires",
  "assurance",
  "deplacement",
  "telecom",
  "autre",
] as const;

export type CategorieCharge = (typeof CATEGORIES_CHARGE)[number];

export const LIBELLES_CHARGE: Record<CategorieCharge, string> = {
  hebergement: "Hébergement / infrastructure",
  logiciel: "Logiciels et abonnements",
  banque: "Frais bancaires",
  marketing: "Marketing et communication",
  materiel: "Matériel",
  honoraires: "Honoraires",
  assurance: "Assurance",
  deplacement: "Déplacements",
  telecom: "Téléphonie et internet",
  autre: "Autre",
};
