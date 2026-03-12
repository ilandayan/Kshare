"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export type AdminOrderActionResult =
  | { success: true }
  | { success: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return { user };
}

/** Admin: mark order as refunded */
export async function adminRembourserCommande(
  orderId: string
): Promise<AdminOrderActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorise." };

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, stripe_payment_intent_id, total_amount")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Commande introuvable." };

  if (["refunded", "cancelled_admin"].includes(order.status)) {
    return { success: false, error: "Cette commande est deja remboursee ou annulee." };
  }

  // Attempt Stripe refund if payment intent exists
  if (order.stripe_payment_intent_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2026-02-25.clover",
      });
      await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
      });
    } catch (err) {
      console.error("[admin] Stripe refund error:", err);
      return {
        success: false,
        error: "Echec du remboursement Stripe. Veuillez réessayer ou traiter manuellement.",
      };
    }
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", orderId);

  if (error) return { success: false, error: "Erreur lors du remboursement." };

  revalidatePath("/kshare-admin/commandes");
  return { success: true };
}

/** Admin: cancel order */
export async function adminAnnulerCommande(
  orderId: string
): Promise<AdminOrderActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorise." };

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, basket_id, quantity")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Commande introuvable." };

  if (["refunded", "cancelled_admin", "picked_up"].includes(order.status)) {
    return { success: false, error: "Cette commande ne peut pas etre annulee." };
  }

  // Restore basket quantity
  if (order.basket_id) {
    const { data: basket } = await supabase
      .from("baskets")
      .select("quantity_sold")
      .eq("id", order.basket_id)
      .single();

    if (basket) {
      await supabase
        .from("baskets")
        .update({
          quantity_sold: Math.max(0, (basket.quantity_sold ?? 0) - (order.quantity ?? 1)),
        })
        .eq("id", order.basket_id);
    }
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled_admin" })
    .eq("id", orderId);

  if (error) return { success: false, error: "Erreur lors de l'annulation." };

  revalidatePath("/kshare-admin/commandes");
  return { success: true };
}

/** Admin: change order status */
export async function adminChangerStatutCommande(
  orderId: string,
  newStatus: string
): Promise<AdminOrderActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorise." };

  const validStatuses = [
    "created",
    "paid",
    "ready_for_pickup",
    "picked_up",
    "no_show",
    "refunded",
    "cancelled_admin",
  ];

  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: "Statut invalide." };
  }

  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "picked_up") {
    updateData.picked_up_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (error) return { success: false, error: "Erreur lors du changement de statut." };

  revalidatePath("/kshare-admin/commandes");
  return { success: true };
}
