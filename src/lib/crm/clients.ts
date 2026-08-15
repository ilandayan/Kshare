/**
 * Lecture de la clientèle : les commerces inscrits, et ce qu'ils rapportent.
 *
 * L'onglet ne cherche pas à répliquer l'espace admin, qui sert à valider des
 * comptes et à traiter des commandes. Il répond à une autre question : qui
 * rapporte, qui décroche, et qui a un blocage qui l'empêche de vendre.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

/** Un motif d'alerte sur un compte, du plus grave au plus anodin. */
export type AlerteClient =
  | "paiement_echoue"
  | "connect_incomplet"
  | "contrat_non_signe"
  | "aucune_vente"
  | "endormi";

export const ALERTES: Record<AlerteClient, { label: string; grave: boolean }> = {
  paiement_echoue: { label: "Prélèvement en échec", grave: true },
  connect_incomplet: { label: "Stripe incomplet — ne peut pas être payé", grave: true },
  contrat_non_signe: { label: "Contrat non signé", grave: true },
  aucune_vente: { label: "Jamais vendu", grave: false },
  endormi: { label: "Aucune vente depuis 30 jours", grave: false },
};

export interface Client {
  id: string;
  nom: string;
  ville: string | null;
  codePostal: string | null;
  email: string;
  telephone: string | null;
  type: string;
  siret: string | null;
  representant: string | null;
  plan: string;
  tauxCommission: number;
  abonnementStatut: string | null;
  abonnementPrix: number;
  inscritLe: string;
  valideLe: string | null;
  contratSigneLe: string | null;
  stripePret: boolean;
  paiementEchoueLe: string | null;
  /** Volume depuis l'inscription. */
  paniers: number;
  ventes: number;
  commission: number;
  premiereVente: string | null;
  derniereVente: string | null;
  /** Volume des trente derniers jours, pour voir la tendance. */
  paniers30j: number;
  ventes30j: number;
  commission30j: number;
  alertes: AlerteClient[];
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Les commerces inscrits, avec leur volume.
 *
 * Les comptes de démonstration sont écartés : ils fausseraient chaque total et
 * n'appellent aucune action commerciale.
 */
export async function listerClients(): Promise<Client[]> {
  const supabase = createAdminClient();

  const [{ data: commerces }, { data: volumes }, { data: abonnements }] = await Promise.all([
    supabase
      .from("commerces")
      .select(
        "id, name, city, postal_code, email, phone, commerce_type, siret, subscription_plan, commission_rate, subscription_status, created_at, validated_at, contract_signed_at, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted, payment_failed_at, representative_first_name, representative_last_name",
      )
      .eq("is_demo", false)
      .order("name"),
    supabase.rpc("crm_clients"),
    supabase.from("subscriptions").select("commerce_id, plan, status, monthly_price, canceled_at"),
  ]);

  const parCommerce = new Map((volumes ?? []).map((v) => [v.commerce_id, v]));
  const abonnementParCommerce = new Map((abonnements ?? []).map((a) => [a.commerce_id, a]));

  const maintenant = Date.now();
  const TRENTE_JOURS = 30 * 24 * 3600 * 1000;

  return (commerces ?? []).map((c) => {
    const v = parCommerce.get(c.id);
    const abo = abonnementParCommerce.get(c.id);
    const plan = (c.subscription_plan as string | null) ?? "starter";

    // Un compte Connect n'est utilisable que si les trois drapeaux sont levés :
    // un commerce peut encaisser sans pouvoir être viré, et l'argent s'accumule
    // alors chez Stripe sans que personne ne s'en aperçoive.
    const stripePret =
      c.stripe_charges_enabled && c.stripe_payouts_enabled && c.stripe_details_submitted;

    const derniereVente = v?.derniere_vente ?? null;
    const alertes: AlerteClient[] = [];
    if (c.payment_failed_at) alertes.push("paiement_echoue");
    if (!stripePret) alertes.push("connect_incomplet");
    if (!c.contract_signed_at) alertes.push("contrat_non_signe");
    if (!derniereVente) alertes.push("aucune_vente");
    else if (maintenant - new Date(derniereVente).getTime() > TRENTE_JOURS) alertes.push("endormi");

    const representant = [c.representative_first_name, c.representative_last_name]
      .filter(Boolean)
      .join(" ");

    return {
      id: c.id,
      nom: c.name,
      ville: c.city,
      codePostal: c.postal_code,
      email: c.email,
      telephone: c.phone,
      type: c.commerce_type,
      siret: c.siret,
      representant: representant || null,
      plan,
      tauxCommission:
        c.commission_rate != null
          ? Number(c.commission_rate)
          : plan === "pro"
            ? SUBSCRIPTION_PLANS.pro.commissionRate
            : SUBSCRIPTION_PLANS.starter.commissionRate,
      abonnementStatut: (abo?.status as string | null) ?? (c.subscription_status as string | null),
      abonnementPrix: abo && !abo.canceled_at ? Number(abo.monthly_price) : 0,
      inscritLe: c.created_at,
      valideLe: c.validated_at,
      contratSigneLe: c.contract_signed_at,
      stripePret,
      paiementEchoueLe: c.payment_failed_at,
      paniers: v?.paniers ?? 0,
      ventes: arrondi(Number(v?.ventes ?? 0)),
      commission: arrondi(Number(v?.commission ?? 0)),
      premiereVente: v?.premiere_vente ?? null,
      derniereVente,
      paniers30j: v?.paniers_30j ?? 0,
      ventes30j: arrondi(Number(v?.ventes_30j ?? 0)),
      commission30j: arrondi(Number(v?.commission_30j ?? 0)),
      alertes,
    };
  });
}

/**
 * Seuil de bascule Starter → Pro, en chiffre d'affaires mensuel.
 *
 * En dessous, l'abonnement coûte plus cher que les six points de commission
 * qu'il fait gagner. Le calculer plutôt que de le figer permet de suivre un
 * changement de tarif sans réécrire la règle.
 */
export function seuilBasculePro(): number {
  const ecart = (SUBSCRIPTION_PLANS.starter.commissionRate - SUBSCRIPTION_PLANS.pro.commissionRate) / 100;
  return Math.round(SUBSCRIPTION_PLANS.pro.monthlyPrice / ecart);
}

/**
 * Un commerce a-t-il intérêt à changer de formule ?
 *
 * Le conseiller soi-même, y compris quand cela réduit la commission perçue,
 * construit la confiance — et un commerce qui reste sur une formule
 * défavorable finit par partir.
 */
export function conseilPlan(client: Client): "passer_pro" | "revenir_starter" | null {
  const seuil = seuilBasculePro();
  if (client.plan === "starter" && client.ventes30j > seuil * 1.2) return "passer_pro";
  if (client.plan === "pro" && client.paniers30j > 0 && client.ventes30j < seuil * 0.8) {
    return "revenir_starter";
  }
  return null;
}
