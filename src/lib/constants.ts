// ── Subscription Plans ────────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  starter: {
    name: "Starter",
    monthlyPrice: 0,
    commissionRate: 18,
    description: "Idéal pour démarrer — sans abonnement",
  },
  pro: {
    name: "Pro",
    monthlyPrice: 29,
    commissionRate: 12,
    description: "Pour les commerces actifs — commission réduite",
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;

// ── Service Fee (paid by client, kept by Kshare) ─────────────
export const SERVICE_FEE_FIXED = 0.79; // EUR
export const SERVICE_FEE_PERCENT = 0.015; // 1.5%

// ── Basket Constraints ───────────────────────────────────────
export const BASKET_MIN_PRICE = 5; // EUR minimum sold_price
export const BASKET_MIN_DISCOUNT = 0.40; // 40% minimum discount

// ── Payout Schedule ──────────────────────────────────────────
export const PAYOUT_WEEKLY_ANCHOR = "tuesday" as const;

// ── Pickup Confirmation ──────────────────────────────────────
export const PICKUP_CONFIRMATION_TEXT =
  "Je confirme avoir reçu ma commande et que son contenu est conforme";

// ── App ──────────────────────────────────────────────────────
export const ADMIN_URL = "/kshare-admin";
export const SUPPORT_EMAIL = "contact@k-share.fr";

export const BASKET_TYPES = [
  {
    value: "bassari",
    label: "Bassari",
    icon: "UtensilsCrossed",
    shortDescription: "Panier viande",
    description:
      "Panier surprise de produits carnés casher.",
  },
  {
    value: "halavi",
    label: "Halavi",
    icon: "Milk",
    shortDescription: "Panier laitier",
    description:
      "Panier surprise de produits laitiers casher.",
  },
  {
    value: "parve",
    label: "Parvé",
    icon: "Leaf",
    shortDescription: "Panier neutre",
    description:
      "Panier surprise de produits parvé casher.",
  },
  {
    value: "shabbat",
    label: "Shabbat",
    icon: "Wine",
    shortDescription: "Panier Shabbat",
    description:
      "Panier surprise spécial Shabbat composé d'un assortiment de produits casher pour le repas du Shabbat.",
  },
  {
    value: "mix",
    label: "Mix",
    icon: "Layers",
    shortDescription: "Panier mixte",
    description:
      "Panier surprise mixte composé d'un assortiment varié de produits casher.",
  },
] as const;

export const COMMERCE_TYPES = [
  "Boucherie",
  "Boulangerie",
  "Épicerie",
  "Supermarché",
  "Restaurant Bassari",
  "Restaurant Halavi",
  "Traiteur Bassari",
  "Traiteur Halavi",
] as const;

/** Basket types available per commerce type */
export const BASKET_TYPES_BY_COMMERCE: Record<string, string[]> = {
  "Boucherie":          ["bassari", "parve", "shabbat"],
  "Boulangerie":        ["halavi", "parve", "shabbat"],
  "Épicerie":           ["bassari", "halavi", "parve", "mix", "shabbat"],
  "Supermarché":        ["bassari", "halavi", "parve", "mix", "shabbat"],
  "Restaurant Bassari": ["bassari", "parve", "shabbat"],
  "Restaurant Halavi":  ["halavi", "parve", "shabbat"],
  "Traiteur Bassari":   ["bassari", "parve", "mix", "shabbat"],
  "Traiteur Halavi":    ["halavi", "parve", "mix", "shabbat"],
};

/** Subscription status labels in French */
export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  offered: "Offert",
  trialing: "Période d'essai",
  past_due: "Impayé",
  canceled: "Résilié",
  incomplete: "Incomplet",
  incomplete_expired: "Expiré",
  unpaid: "Impayé",
};

/** Commerce account status labels in French */
export const COMMERCE_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  validated: "Validé",
  suspended: "Suspendu",
  rejected: "Rejeté",
};

export const HASHGAKHA_LIST = [
  "Beth Din de Paris",
  "Maharam de Paris",
  "Beth Din de Marseille",
  "Beth Din de Lyon",
  "Hechsher Séfarade",
  "Mehadrin",
  "Badatz",
  "Consistoire",
  "Autre",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  created: "Créée",
  paid: "Payée",
  pending_association: "En attente (asso)",
  ready_for_pickup: "Prête au retrait",
  picked_up: "Récupérée",
  no_show: "Non récupérée",
  expired: "Expirée",
  refunded: "Remboursée",
  cancelled_admin: "Annulée (admin)",
};

export const BASKET_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publiée",
  sold_out: "Épuisée",
  expired: "Expirée",
  disabled: "Désactivée",
};

export const MAX_DISTANCE_OPTIONS = [1, 3, 5, 10, 15] as const;

// ── Support / Contact ────────────────────────────────────────────

export const SUPPORT_CATEGORIES = [
  { value: "question_generale", label: "Question générale", icon: "HelpCircle" },
  { value: "probleme_commande", label: "Problème avec une commande", icon: "ShoppingBag" },
  { value: "inscription_commerce", label: "Inscription commerce", icon: "Store" },
  { value: "inscription_association", label: "Inscription association", icon: "Heart" },
  { value: "abonnement_facturation", label: "Abonnement / Facturation", icon: "CreditCard" },
  { value: "bug_technique", label: "Bug technique", icon: "Bug" },
  { value: "partenariat", label: "Partenariat / Presse", icon: "Handshake" },
  { value: "autre", label: "Autre", icon: "MessageSquare" },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]["value"];

// ── Départements français ───────────────────────────────────────
export const DEPARTMENTS = [
  { code: "01", label: "Ain" },
  { code: "02", label: "Aisne" },
  { code: "03", label: "Allier" },
  { code: "04", label: "Alpes-de-Haute-Provence" },
  { code: "05", label: "Hautes-Alpes" },
  { code: "06", label: "Alpes-Maritimes" },
  { code: "07", label: "Ardèche" },
  { code: "08", label: "Ardennes" },
  { code: "09", label: "Ariège" },
  { code: "10", label: "Aube" },
  { code: "11", label: "Aude" },
  { code: "12", label: "Aveyron" },
  { code: "13", label: "Bouches-du-Rhône" },
  { code: "14", label: "Calvados" },
  { code: "15", label: "Cantal" },
  { code: "16", label: "Charente" },
  { code: "17", label: "Charente-Maritime" },
  { code: "18", label: "Cher" },
  { code: "19", label: "Corrèze" },
  { code: "2A", label: "Corse-du-Sud" },
  { code: "2B", label: "Haute-Corse" },
  { code: "21", label: "Côte-d'Or" },
  { code: "22", label: "Côtes-d'Armor" },
  { code: "23", label: "Creuse" },
  { code: "24", label: "Dordogne" },
  { code: "25", label: "Doubs" },
  { code: "26", label: "Drôme" },
  { code: "27", label: "Eure" },
  { code: "28", label: "Eure-et-Loir" },
  { code: "29", label: "Finistère" },
  { code: "30", label: "Gard" },
  { code: "31", label: "Haute-Garonne" },
  { code: "32", label: "Gers" },
  { code: "33", label: "Gironde" },
  { code: "34", label: "Hérault" },
  { code: "35", label: "Ille-et-Vilaine" },
  { code: "36", label: "Indre" },
  { code: "37", label: "Indre-et-Loire" },
  { code: "38", label: "Isère" },
  { code: "39", label: "Jura" },
  { code: "40", label: "Landes" },
  { code: "41", label: "Loir-et-Cher" },
  { code: "42", label: "Loire" },
  { code: "43", label: "Haute-Loire" },
  { code: "44", label: "Loire-Atlantique" },
  { code: "45", label: "Loiret" },
  { code: "46", label: "Lot" },
  { code: "47", label: "Lot-et-Garonne" },
  { code: "48", label: "Lozère" },
  { code: "49", label: "Maine-et-Loire" },
  { code: "50", label: "Manche" },
  { code: "51", label: "Marne" },
  { code: "52", label: "Haute-Marne" },
  { code: "53", label: "Mayenne" },
  { code: "54", label: "Meurthe-et-Moselle" },
  { code: "55", label: "Meuse" },
  { code: "56", label: "Morbihan" },
  { code: "57", label: "Moselle" },
  { code: "58", label: "Nièvre" },
  { code: "59", label: "Nord" },
  { code: "60", label: "Oise" },
  { code: "61", label: "Orne" },
  { code: "62", label: "Pas-de-Calais" },
  { code: "63", label: "Puy-de-Dôme" },
  { code: "64", label: "Pyrénées-Atlantiques" },
  { code: "65", label: "Hautes-Pyrénées" },
  { code: "66", label: "Pyrénées-Orientales" },
  { code: "67", label: "Bas-Rhin" },
  { code: "68", label: "Haut-Rhin" },
  { code: "69", label: "Rhône" },
  { code: "70", label: "Haute-Saône" },
  { code: "71", label: "Saône-et-Loire" },
  { code: "72", label: "Sarthe" },
  { code: "73", label: "Savoie" },
  { code: "74", label: "Haute-Savoie" },
  { code: "75", label: "Paris" },
  { code: "76", label: "Seine-Maritime" },
  { code: "77", label: "Seine-et-Marne" },
  { code: "78", label: "Yvelines" },
  { code: "79", label: "Deux-Sèvres" },
  { code: "80", label: "Somme" },
  { code: "81", label: "Tarn" },
  { code: "82", label: "Tarn-et-Garonne" },
  { code: "83", label: "Var" },
  { code: "84", label: "Vaucluse" },
  { code: "85", label: "Vendée" },
  { code: "86", label: "Vienne" },
  { code: "87", label: "Haute-Vienne" },
  { code: "88", label: "Vosges" },
  { code: "89", label: "Yonne" },
  { code: "90", label: "Territoire de Belfort" },
  { code: "91", label: "Essonne" },
  { code: "92", label: "Hauts-de-Seine" },
  { code: "93", label: "Seine-Saint-Denis" },
  { code: "94", label: "Val-de-Marne" },
  { code: "95", label: "Val-d'Oise" },
  { code: "971", label: "Guadeloupe" },
  { code: "972", label: "Martinique" },
  { code: "973", label: "Guyane" },
  { code: "974", label: "La Réunion" },
  { code: "976", label: "Mayotte" },
] as const;
