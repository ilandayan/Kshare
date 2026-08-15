/**
 * Ce que Kshare gagne, et ce que ça lui coûte.
 *
 * L'écart avec l'espace admin est volontaire : celui-ci mesure l'activité de
 * la plateforme — volume vendu, commandes traitées. Celui-ci mesure le revenu
 * de l'entreprise, ce qui n'est pas la même chose. Trois différences comptent :
 *
 * — **Les frais Stripe sont une charge de Kshare**, pas une retenue sur le
 *   commerce. Les oublier surestimait la rentabilité d'environ un point et demi.
 * — **Les frais de service sont un revenu**, payés par le client final et
 *   conservés en totalité.
 * — **Les remboursements se déduisent de la commission**, sans quoi le revenu
 *   affiché ne correspond à rien d'encaissable.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface MoisChiffre {
  /** `YYYY-MM`. */
  mois: string;
  libelle: string;
  paniers: number;
  /** Prix de vente encaissé, remboursements déduits. Ce n'est pas le revenu. */
  ventes: number;
  /** Commission acquise, remboursements déduits. */
  commission: number;
  fraisService: number;
  abonnements: number;
  /** Somme des trois lignes ci-dessus. */
  recettes: number;
  fraisStripe: number;
  charges: number;
  /** Recettes moins frais Stripe et charges. */
  marge: number;
  dons: number;
}

export interface Chiffres {
  mois: MoisChiffre[];
  cumul: Omit<MoisChiffre, "mois" | "libelle">;
  /** Part des frais Stripe dans les recettes, en pourcentage. */
  poidsStripe: number;
  /** Vrai tant qu'aucune commande n'a porté de frais Stripe connus. */
  fraisStripeIncomplets: boolean;
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}

function libelleMois(cle: string): string {
  const [a, m] = cle.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function cleMois(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Les `n` derniers mois, mois en cours compris.
 *
 * Contrairement à la facturation, on montre le mois courant : c'est un
 * tableau de bord, pas un document figé, et le chiffre du mois en cours est
 * précisément ce qu'on vient regarder.
 */
export async function chiffres(nbMois = 12): Promise<Chiffres> {
  const supabase = createAdminClient();

  const maintenant = new Date();
  const debut = new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - (nbMois - 1), 1),
  );
  const fin = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() + 1, 1));

  const [{ data: parMois, error }, { data: abonnements }, { data: lignesCharges }] =
    await Promise.all([
      supabase.rpc("crm_chiffres", { p_debut: debut.toISOString(), p_fin: fin.toISOString() }),
      supabase
        .from("subscriptions")
        .select("monthly_price, status, created_at, canceled_at, plan")
        .eq("plan", "pro"),
      supabase
        .from("charges")
        .select("amount, incurred_on")
        .gte("incurred_on", debut.toISOString().slice(0, 10)),
    ]);

  if (error) throw new Error(`Chiffres : ${error.message}`);

  const parCle = new Map((parMois ?? []).map((m) => [cleMois(new Date(m.mois)), m]));

  // Les charges sont datées au jour : on les replie sur leur mois.
  const chargesParMois = new Map<string, number>();
  for (const c of lignesCharges ?? []) {
    const cle = c.incurred_on.slice(0, 7);
    chargesParMois.set(cle, (chargesParMois.get(cle) ?? 0) + Number(c.amount));
  }

  const mois: MoisChiffre[] = [];
  for (let i = 0; i < nbMois; i++) {
    const d = new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth() + i, 1));
    const cle = cleMois(d);
    const brut = parCle.get(cle);

    const commission = arrondi(
      Number(brut?.commission ?? 0) - Number(brut?.commission_rendue ?? 0),
    );
    const fraisService = arrondi(Number(brut?.frais_service ?? 0));

    // Un abonnement compte pour le mois s'il courait alors et n'était pas
    // offert : c'est la même règle que la facturation, et les deux écrans
    // doivent tomber sur le même chiffre.
    const finMois = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    const abonnementsMois = (abonnements ?? [])
      .filter(
        (a) =>
          a.status !== "offered" &&
          new Date(a.created_at) < finMois &&
          (!a.canceled_at || new Date(a.canceled_at) >= d),
      )
      .reduce((s, a) => s + Number(a.monthly_price), 0);

    const fraisStripe = arrondi(Number(brut?.frais_stripe ?? 0));
    const charges = arrondi(chargesParMois.get(cle) ?? 0);
    const recettes = arrondi(commission + fraisService + abonnementsMois);

    mois.push({
      mois: cle,
      libelle: libelleMois(cle),
      paniers: brut?.paniers ?? 0,
      ventes: arrondi(Number(brut?.ventes ?? 0)),
      commission,
      fraisService,
      abonnements: arrondi(abonnementsMois),
      recettes,
      fraisStripe,
      charges,
      marge: arrondi(recettes - fraisStripe - charges),
      dons: brut?.dons ?? 0,
    });
  }

  const cumul = mois.reduce(
    (acc, m) => ({
      paniers: acc.paniers + m.paniers,
      ventes: arrondi(acc.ventes + m.ventes),
      commission: arrondi(acc.commission + m.commission),
      fraisService: arrondi(acc.fraisService + m.fraisService),
      abonnements: arrondi(acc.abonnements + m.abonnements),
      recettes: arrondi(acc.recettes + m.recettes),
      fraisStripe: arrondi(acc.fraisStripe + m.fraisStripe),
      charges: arrondi(acc.charges + m.charges),
      marge: arrondi(acc.marge + m.marge),
      dons: acc.dons + m.dons,
    }),
    {
      paniers: 0, ventes: 0, commission: 0, fraisService: 0, abonnements: 0,
      recettes: 0, fraisStripe: 0, charges: 0, marge: 0, dons: 0,
    },
  );

  return {
    mois,
    cumul,
    poidsStripe: cumul.recettes > 0 ? arrondi((cumul.fraisStripe / cumul.recettes) * 100) : 0,
    // Les frais réels ne sont connus qu'après la capture, via la transaction
    // Stripe. S'ils sont tous à zéro alors que des ventes existent, c'est que
    // la réconciliation n'a pas tourné — et la marge affichée est trop belle.
    fraisStripeIncomplets: cumul.paniers > 0 && cumul.fraisStripe === 0,
  };
}
