/**
 * Capture différée des paiements de paniers.
 *
 * La réservation autorise le paiement sans l'encaisser. La capture intervient
 * ensuite, en totalité ou partiellement, ou l'autorisation est relâchée.
 *
 * Trois raisons de préférer cette mécanique au remboursement :
 * relâcher une autorisation ne coûte rien, là où un remboursement laisse les
 * frais Stripe à la charge de la plateforme ; le client n'est jamais débité,
 * ce qui évite la contestation bancaire et son impact sur le taux de litiges ;
 * et le geste commercial peut être ajusté au centime.
 */

import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPaymentLedgerEntries } from "@/lib/stripe/ledger";

/** Commande telle que lue par les appelants (cron, actions admin). */
export interface OrderForCapture {
  id: string;
  stripe_payment_intent_id: string | null;
  total_amount: number | string | null;
  service_fee_amount: number | string | null;
  commission_amount: number | string | null;
  capture_status: string | null;
  commerce_id?: string | null;
}

export type CaptureResult =
  | { success: true; capturedAmount: number; partial: boolean }
  | { success: false; error: string };

export type CancelResult = { success: true } | { success: false; error: string };

const toNumber = (v: number | string | null | undefined): number => Number(v ?? 0);

/**
 * Montants d'une commande, en centimes.
 *
 * L'autorisation porte sur le prix du panier majoré des frais de service, et
 * la commission de plateforme prélevée par Stripe agrège commission et frais
 * de service, qui reviennent tous deux à Kshare.
 */
export function montantsCommande(order: OrderForCapture): {
  totalCents: number;
  feeCents: number;
} {
  const panier = toNumber(order.total_amount);
  const fraisService = toNumber(order.service_fee_amount);
  const commission = toNumber(order.commission_amount);

  return {
    totalCents: Math.round((panier + fraisService) * 100),
    feeCents: Math.round((commission + fraisService) * 100),
  };
}

/**
 * Montants à capturer pour une proportion donnée.
 *
 * Tout est réduit dans la même proportion : la part du commerce comme la
 * commission de Kshare. Conserver une commission pleine sur un panier reconnu
 * défectueux donnerait des taux effectifs indéfendables — 72 % de commission
 * sur un remboursement de 75 %.
 *
 * Isolé du reste pour être testable : c'est le calcul qui manipule l'argent.
 */
export function montantsCapture(
  order: OrderForCapture,
  ratio: number,
): { captureCents: number; captureFeeCents: number } {
  const { totalCents, feeCents } = montantsCommande(order);
  const captureCents = Math.round(totalCents * ratio);
  return {
    captureCents,
    // Stripe refuse une commission supérieure au montant capturé.
    captureFeeCents: Math.min(Math.round(feeCents * ratio), captureCents),
  };
}

/**
 * Capture une commande autorisée.
 *
 * `ratio` vaut 1 pour une capture intégrale, moins pour un geste commercial.
 */
export async function capturerCommande(
  order: OrderForCapture,
  ratio = 1,
  motif?: string,
): Promise<CaptureResult> {
  if (!order.stripe_payment_intent_id) {
    return { success: false, error: "Aucun paiement associé à cette commande." };
  }
  if (order.capture_status !== "pending") {
    return { success: false, error: "Cette commande n'est pas en attente de capture." };
  }
  if (ratio <= 0 || ratio > 1) {
    return { success: false, error: "La proportion doit être comprise entre 0 et 1." };
  }

  const { captureCents, captureFeeCents } = montantsCapture(order, ratio);

  if (captureCents <= 0) {
    return { success: false, error: "Le montant à capturer est nul." };
  }

  const supabase = createAdminClient();

  try {
    await getStripe().paymentIntents.capture(
      order.stripe_payment_intent_id,
      {
        amount_to_capture: captureCents,
        application_fee_amount: captureFeeCents,
      },
      // Le cron peut repasser sur la même commande après une erreur réseau.
      { idempotencyKey: `capture_${order.id}` },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Stripe inconnue";
    // Une capture qui échoue laisse un commerce ayant livré sans être payé :
    // on la trace pour qu'elle remonte, plutôt que de la perdre en logs.
    await supabase
      .from("orders")
      .update({ capture_status: "failed", capture_error: message })
      .eq("id", order.id);
    console.error("[capture] Échec pour la commande", order.id, message);
    return { success: false, error: message };
  }

  const partiel = ratio < 1;
  const commissionCapturee =
    Math.round(toNumber(order.commission_amount) * ratio * 100) / 100;
  const netCapture =
    Math.round(
      (toNumber(order.total_amount) - toNumber(order.commission_amount)) * ratio * 100,
    ) / 100;

  await supabase
    .from("orders")
    .update({
      capture_status: partiel ? "partially_captured" : "captured",
      captured_amount: captureCents / 100,
      captured_at: new Date().toISOString(),
      capture_error: null,
      ...(motif ? { capture_reason: motif } : {}),
      // Le commerce doit voir ce qu'il touchera réellement, pas le prix affiché.
      commission_amount: commissionCapturee,
      net_amount: netCapture,
    })
    .eq("id", order.id);

  // Frais Stripe réels : ils n'existent qu'une fois la transaction réglée. Les
  // lire à l'autorisation renvoyait toujours zéro, d'où la route de
  // réconciliation qui devait ensuite les rattraper commande par commande.
  try {
    const pi = await getStripe().paymentIntents.retrieve(
      order.stripe_payment_intent_id,
      { expand: ["latest_charge.balance_transaction"] },
    );
    const charge = pi.latest_charge as Stripe.Charge | null;
    const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
    if (bt) {
      await supabase
        .from("orders")
        .update({ stripe_fee_amount: bt.fee / 100 })
        .eq("id", order.id);
    }
  } catch (error) {
    // Sans gravité : la route de réconciliation sait rattraper une commande
    // dont les frais n'ont pas pu être lus.
    console.error("[capture] Frais Stripe non récupérés pour", order.id, error);
  }

  // Le grand livre est alimenté ici, et nulle part ailleurs : c'est le seul
  // moment où l'argent existe réellement, et le seul endroit qui connaisse le
  // montant effectivement capturé. Les écritures portées par les webhooks
  // créditaient le commerce dès l'autorisation, avec les montants d'origine.
  if (order.commerce_id) {
    try {
      await createPaymentLedgerEntries({
        commerceId: order.commerce_id,
        orderId: order.id,
        totalAmount: Math.round(toNumber(order.total_amount) * ratio * 100) / 100,
        commissionAmount: commissionCapturee,
        serviceFeeAmount:
          Math.round(toNumber(order.service_fee_amount) * ratio * 100) / 100,
        netAmount: netCapture,
        stripePaymentIntentId: order.stripe_payment_intent_id,
      });
    } catch (error) {
      // Non bloquant : l'argent est encaissé, seule la comptabilité est en
      // retard. Mieux vaut une écriture manquante qu'une capture annulée.
      console.error("[capture] Écritures comptables non créées pour", order.id, error);
    }
  }

  return { success: true, capturedAmount: captureCents / 100, partial: partiel };
}

/**
 * Relâche l'autorisation : le client n'est jamais débité, aucun frais n'est dû.
 * À privilégier sur le remboursement tant que la capture n'a pas eu lieu.
 */
export async function annulerAutorisation(
  order: OrderForCapture,
  motif?: string,
): Promise<CancelResult> {
  if (!order.stripe_payment_intent_id) {
    return { success: false, error: "Aucun paiement associé à cette commande." };
  }
  if (order.capture_status !== "pending") {
    return {
      success: false,
      error: "Le paiement est déjà encaissé : il faut passer par un remboursement.",
    };
  }

  try {
    await getStripe().paymentIntents.cancel(order.stripe_payment_intent_id);
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;
    // Une autorisation déjà annulée n'est pas une erreur pour l'appelant.
    if (stripeError?.code !== "payment_intent_unexpected_state") {
      const message = error instanceof Error ? error.message : "Erreur Stripe inconnue";
      console.error("[capture] Annulation impossible pour", order.id, message);
      return { success: false, error: message };
    }
  }

  await createAdminClient()
    .from("orders")
    .update({
      capture_status: "canceled",
      captured_amount: 0,
      net_amount: 0,
      commission_amount: 0,
      ...(motif ? { capture_reason: motif } : {}),
    })
    .eq("id", order.id);

  return { success: true };
}

/**
 * Commandes dont un signalement est encore ouvert.
 *
 * La capture doit les épargner : c'est précisément la fenêtre pendant laquelle
 * l'admin peut encore relâcher l'autorisation sans frais.
 */
export async function commandesAvecSignalementOuvert(
  orderIds: string[],
): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();

  const { data } = await createAdminClient()
    .from("support_tickets")
    .select("order_id")
    .in("order_id", orderIds)
    .in("status", ["open", "in_progress"]);

  return new Set((data ?? []).map((t) => t.order_id).filter(Boolean) as string[]);
}

/**
 * Délai laissé au client pour signaler un problème après avoir confirmé son
 * retrait, avant que l'autorisation ne soit encaissée.
 *
 * Le client confirme devant le commerçant, mais n'ouvre son sac qu'une fois
 * rentré : le litige naît après la confirmation, pas pendant. Tant que
 * l'autorisation n'est pas capturée, l'admin la relâche sans frais ou n'en
 * prélève qu'une partie ; après capture il faut rembourser, et Stripe ne rend
 * pas sa commission. Ces deux heures ne coûtent rien : le virement au commerce
 * est hebdomadaire, capturer plus tôt ne le paie pas plus vite.
 */
export const DELAI_GRACE_MS = 2 * 60 * 60 * 1000;

/**
 * Convertit une date + heure murale « Europe/Paris » en instant UTC exact.
 * Gère automatiquement l'heure d'été/hiver (offset +1 ou +2).
 */
export function parisWallTimeToUtc(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const parisMs = new Date(
    new Date(utcGuess).toLocaleString("en-US", { timeZone: "Europe/Paris" }),
  ).getTime();
  const utcMs = new Date(
    new Date(utcGuess).toLocaleString("en-US", { timeZone: "UTC" }),
  ).getTime();
  return new Date(utcGuess - (parisMs - utcMs));
}

/** Ce qu'il convient de faire d'une commande en attente de capture. */
export type DecisionCapture = "capturer" | "no_show" | "grace" | "attendre";

export type CommandePourDecision = {
  status: string;
  picked_up_at: string | null;
  pickup_date: string | null;
  pickup_end: string | null;
};

/**
 * Faut-il encaisser cette commande maintenant ?
 *
 * Deux chemins mènent à la capture : le client a confirmé son retrait et le
 * délai de grâce est écoulé, ou le créneau est passé sans qu'il vienne — le
 * commerce a préparé le panier, il doit être payé.
 *
 * Le doute profite toujours au client : une date inexploitable renvoie
 * « attendre », jamais « capturer ».
 */
export function decisionCapture(
  order: CommandePourDecision,
  nowMs: number,
): DecisionCapture {
  const retraitConfirme = order.status === "picked_up";
  const confirmeLe = order.picked_up_at
    ? new Date(order.picked_up_at).getTime()
    : Number.NaN;

  if (retraitConfirme && !Number.isNaN(confirmeLe)) {
    return confirmeLe + DELAI_GRACE_MS > nowMs ? "grace" : "capturer";
  }

  // Retrait non confirmé, ou horodatage inexploitable : le délai de grâce est
  // incalculable. On s'en remet à la fin du créneau, toujours postérieure.
  const { pickup_date: pickupDate, pickup_end: pickupEnd } = order;
  if (!pickupDate || !pickupEnd) return "attendre";
  // Format hérité, jamais résolu en date réelle : on ne peut rien en déduire.
  if (pickupDate === "today" || pickupDate === "tomorrow") return "attendre";

  const fin = parisWallTimeToUtc(pickupDate, pickupEnd).getTime();
  if (Number.isNaN(fin) || fin >= nowMs) return "attendre";

  return retraitConfirme ? "capturer" : "no_show";
}
