/**
 * Ce qui compte comme une recette, et pour qui.
 *
 * Trois écrans mesuraient la même chose de trois façons, et trois chiffres
 * différents s'affichaient : l'espace admin annonçait 12,36 € de commission
 * quand l'entreprise en avait encaissé zéro. Les règles vivent donc ici, un
 * seul endroit, et chaque écran s'y réfère.
 *
 * Trois décisions arrêtées avec Ilan :
 *
 * — **Les comptes de démonstration ne comptent pas.** Cinq commerces de seed
 *   portent des commandes de jeu ; les additionner revenait à afficher un
 *   chiffre d'affaires qui n'existe pas.
 * — **La commission se compte à la capture.** Une commande seulement autorisée
 *   n'a rien rapporté, et un signalement peut encore l'annuler. C'est aussi la
 *   règle de la facturation : les deux doivent tomber sur le même montant.
 * — **Les remboursements se déduisent.** Sans quoi la commission affichée
 *   n'est pas encaissable.
 */

/**
 * États de capture correspondant à un encaissement réel.
 *
 * `pending` est une autorisation, `canceled` une autorisation relâchée,
 * `failed` un encaissement qui n'a jamais abouti.
 */
export const CAPTURES_ENCAISSEES = ["captured", "partially_captured"] as const;

/** Colonnes à lire pour calculer une recette sur une commande. */
export const COLONNES_RECETTE =
  "total_amount, captured_amount, refunded_amount, commission_amount, commission_refunded, service_fee_amount, stripe_fee_amount, is_donation, captured_at, commerce_id";

export interface CommandeEncaissee {
  total_amount: number;
  captured_amount: number | null;
  refunded_amount: number | null;
  commission_amount: number;
  commission_refunded: number | null;
  service_fee_amount: number | null;
  stripe_fee_amount: number | null;
  is_donation: boolean;
}

export interface Recettes {
  paniers: number;
  dons: number;
  /** Prix payé par les clients. Appartient aux commerces, pas à Kshare. */
  ventes: number;
  /** Commission acquise, remboursements déduits. */
  commission: number;
  /** Frais de service, payés par le client et conservés en totalité. */
  fraisService: number;
  /** À la charge de Kshare, et non récupérables. */
  fraisStripe: number;
  /** Commission et frais de service. Hors abonnements, qui ne sont pas ici. */
  recettes: number;
  /** Reversé aux commerces. */
  netCommerces: number;
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Agrège des commandes déjà filtrées sur les captures encaissées.
 *
 * La fonction ne filtre rien elle-même : le filtre appartient à la requête,
 * pour que la base ne renvoie pas des lignes qu'on jetterait ensuite.
 */
export function agregerRecettes(commandes: CommandeEncaissee[]): Recettes {
  let paniers = 0;
  let dons = 0;
  let ventes = 0;
  let commission = 0;
  let fraisService = 0;
  let fraisStripe = 0;

  for (const o of commandes) {
    if (o.is_donation) dons += 1;
    else paniers += 1;

    // L'encaissement réel : le montant capturé s'écarte du prix affiché en cas
    // de geste commercial, et le remboursement s'en retranche.
    const encaisse = Number(o.captured_amount ?? o.total_amount) - Number(o.refunded_amount ?? 0);
    ventes += encaisse;
    commission += Number(o.commission_amount) - Number(o.commission_refunded ?? 0);
    fraisService += Number(o.service_fee_amount ?? 0);
    fraisStripe += Number(o.stripe_fee_amount ?? 0);
  }

  const recettes = commission + fraisService;
  return {
    paniers,
    dons,
    ventes: arrondi(ventes),
    commission: arrondi(commission),
    fraisService: arrondi(fraisService),
    fraisStripe: arrondi(fraisStripe),
    recettes: arrondi(recettes),
    netCommerces: arrondi(ventes - commission),
  };
}
