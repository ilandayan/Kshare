export const COMMISSION_RATE_DEFAULT = 15; // percentage
export const COMMISSION_RATE_EARLY = 10; // percentage for first 50 merchants
export const SUBSCRIPTION_PRICE = 30; // EUR/month
export const EARLY_ADOPTER_LIMIT = 50; // first N merchants
export const EARLY_ADOPTER_OFFER_MONTHS = 3;
export const NEW_MERCHANT_FREE_MONTHS = 1;
export const ADMIN_URL = "/kshare-admin";
export const SUPPORT_EMAIL = "contact@k-share.fr";

export const BASKET_TYPES = [
  { value: "bassari", label: "Bassari", emoji: "🥩", description: "Panier viande" },
  { value: "halavi", label: "Halavi", emoji: "🧀", description: "Panier laitier" },
  { value: "parve", label: "Parvé", emoji: "🌿", description: "Panier neutre" },
  { value: "shabbat", label: "Shabbat", emoji: "🍷", description: "Panier Shabbat" },
  { value: "mix", label: "Mix", emoji: "➕", description: "Panier mélange" },
] as const;

export const COMMERCE_TYPES = [
  "Boucherie",
  "Boulangerie",
  "Supermarché",
  "Traiteur",
  "Épicerie",
  "Fromagerie",
  "Restaurant",
  "Pâtisserie",
  "Autre",
] as const;

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
  ready_for_pickup: "Prête au retrait",
  picked_up: "Récupérée",
  no_show: "Non récupérée",
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
