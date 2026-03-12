"use server";

import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit-log";

/**
 * Server Action: client confirms they picked up their order.
 * Verifies ownership and order status before updating.
 */
export async function confirmPickup(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Non authentifié" };

  // Fetch order — verify ownership and status
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, client_id, status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: "Commande introuvable" };
  }

  if (order.client_id !== user.id) {
    return { success: false, error: "Vous n'êtes pas le propriétaire de cette commande" };
  }

  if (order.status !== "paid" && order.status !== "ready_for_pickup") {
    return { success: false, error: "Cette commande ne peut pas être confirmée" };
  }

  // Update order status
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "picked_up" })
    .eq("id", orderId);

  if (updateError) {
    return { success: false, error: "Erreur lors de la confirmation" };
  }

  logAuditEvent({
    action: "order.confirmed_pickup",
    actor_id: user.id,
    target_id: orderId,
    metadata: { orderId },
  });

  return { success: true };
}
