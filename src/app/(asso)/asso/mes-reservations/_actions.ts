"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";

export type ReservationActionResult =
  | { success: true }
  | { success: false; error: string };

/** Mark a donation order as collected (picked up by association) */
export async function confirmerCollecte(
  orderId: string
): Promise<ReservationActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  // Vérifier que l'utilisateur est une association
  const { data: asso } = await supabase
    .from("associations")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!asso) return { success: false, error: "Association introuvable." };

  // Vérifier que la commande appartient à cette association
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, status, association_id, is_donation, stripe_payment_intent_id, basket_id, quantity"
    )
    .eq("id", orderId)
    .single();

  if (!order || order.association_id !== asso.id) {
    return { success: false, error: "Réservation introuvable." };
  }

  if (!order.is_donation) {
    return { success: false, error: "Cette commande n'est pas un don." };
  }

  if (!["created", "paid", "ready_for_pickup"].includes(order.status)) {
    return {
      success: false,
      error: "Cette réservation ne peut pas être marquée comme collectée.",
    };
  }

  // Pour les dons clients : capturer le paiement Stripe au moment de la collecte
  if (order.stripe_payment_intent_id) {
    const stripe = getStripe();
    try {
      await stripe.paymentIntents.capture(order.stripe_payment_intent_id);
    } catch (err) {
      console.error("[confirmerCollecte] Stripe capture error:", err);
      return {
        success: false,
        error:
          "Erreur lors de la capture du paiement. L'autorisation a peut-être expiré.",
      };
    }

    // Mettre à jour les quantités : reserved → sold
    const { data: basket } = await admin
      .from("baskets")
      .select("quantity_reserved, quantity_sold")
      .eq("id", order.basket_id)
      .single();

    if (basket) {
      await admin
        .from("baskets")
        .update({
          quantity_reserved: Math.max(
            0,
            basket.quantity_reserved - (order.quantity ?? 1)
          ),
          quantity_sold: basket.quantity_sold + (order.quantity ?? 1),
        })
        .eq("id", order.basket_id);
    }
  }

  const { error } = await admin
    .from("orders")
    .update({
      status: "picked_up",
      picked_up_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("association_id", asso.id);

  if (error)
    return { success: false, error: "Erreur lors de la confirmation." };

  revalidatePath("/asso/mes-reservations");
  revalidatePath("/asso/dashboard");
  revalidatePath("/asso/reporting");
  return { success: true };
}

/** Cancel a donation reservation.
 *  - Don commerçant (status=created) → cancelled_admin
 *  - Don client (status=paid, has stripe_payment_intent_id) → pending_association
 *    (remis à disposition des autres assos, pas de capture Stripe)
 */
export async function annulerReservation(
  orderId: string
): Promise<ReservationActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { data: asso } = await supabase
    .from("associations")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!asso) return { success: false, error: "Association introuvable." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, status, association_id, is_donation, basket_id, quantity, stripe_payment_intent_id"
    )
    .eq("id", orderId)
    .single();

  if (!order || order.association_id !== asso.id) {
    return { success: false, error: "Réservation introuvable." };
  }

  // Don client (paiement non encore capturé) → remettre en pending_association
  const isClientDonation =
    order.is_donation && order.stripe_payment_intent_id && order.status === "paid";

  if (isClientDonation) {
    const { error } = await admin
      .from("orders")
      .update({
        status: "pending_association",
        association_id: null,
        qr_code_token: null,
      })
      .eq("id", orderId);

    if (error)
      return { success: false, error: "Erreur lors de l'annulation." };

    revalidatePath("/asso/mes-reservations");
    revalidatePath("/asso/paniers-dons");
    return { success: true };
  }

  // Don commerçant → annuler définitivement
  if (order.status !== "created") {
    return {
      success: false,
      error: "Cette réservation ne peut plus être annulée.",
    };
  }

  // Restore basket reserved quantity
  if (order.basket_id) {
    const { data: basket } = await admin
      .from("baskets")
      .select("quantity_reserved")
      .eq("id", order.basket_id)
      .single();

    if (basket) {
      await admin
        .from("baskets")
        .update({
          quantity_reserved: Math.max(
            0,
            (basket.quantity_reserved ?? 0) - (order.quantity ?? 1)
          ),
        })
        .eq("id", order.basket_id);
    }
  }

  const { error } = await admin
    .from("orders")
    .update({ status: "cancelled_admin" })
    .eq("id", orderId)
    .eq("association_id", asso.id);

  if (error) return { success: false, error: "Erreur lors de l'annulation." };

  revalidatePath("/asso/mes-reservations");
  revalidatePath("/asso/paniers-dons");
  return { success: true };
}
