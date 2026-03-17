"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyOrderStatusChange } from "@/lib/notifications";

export type OrderActionResult =
  | { success: true }
  | { success: false; error: string };

async function getCommerceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("commerces")
    .select("id")
    .eq("profile_id", userId)
    .single();
  return data?.id ?? null;
}

/** Mark order as "ready for pickup" */
export async function marquerPretRetrait(
  orderId: string
): Promise<OrderActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie." };

  const commerceId = await getCommerceId(supabase, user.id);
  if (!commerceId) return { success: false, error: "Commerce introuvable." };

  // Verify order belongs to this commerce and is in "paid" status
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, commerce_id, client_id")
    .eq("id", orderId)
    .single();

  if (!order || order.commerce_id !== commerceId) {
    return { success: false, error: "Commande introuvable." };
  }

  if (order.status !== "paid") {
    return { success: false, error: "Cette commande ne peut pas etre marquee comme prete." };
  }

  // Get commerce name for the notification
  const { data: commerceData } = await supabase
    .from("commerces")
    .select("name")
    .eq("id", commerceId)
    .single();

  const { error } = await supabase
    .from("orders")
    .update({ status: "ready_for_pickup" })
    .eq("id", orderId)
    .eq("commerce_id", commerceId);

  if (error) return { success: false, error: "Erreur lors de la mise a jour." };

  // Notify client (fire-and-forget)
  notifyOrderStatusChange(orderId, order.client_id, "ready_for_pickup", commerceData?.name ?? "le commerce");

  revalidatePath("/shop/paniers/orders");
  return { success: true };
}

/** Mark order as "no show" (client did not come) */
export async function marquerNoShow(
  orderId: string
): Promise<OrderActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie." };

  const commerceId = await getCommerceId(supabase, user.id);
  if (!commerceId) return { success: false, error: "Commerce introuvable." };

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, commerce_id, client_id")
    .eq("id", orderId)
    .single();

  if (!order || order.commerce_id !== commerceId) {
    return { success: false, error: "Commande introuvable." };
  }

  if (!["paid", "ready_for_pickup"].includes(order.status)) {
    return { success: false, error: "Cette commande ne peut pas etre marquee comme non venu." };
  }

  const { data: commerceData } = await supabase
    .from("commerces")
    .select("name")
    .eq("id", commerceId)
    .single();

  const { error } = await supabase
    .from("orders")
    .update({ status: "no_show" })
    .eq("id", orderId)
    .eq("commerce_id", commerceId);

  if (error) return { success: false, error: "Erreur lors de la mise a jour." };

  notifyOrderStatusChange(orderId, order.client_id, "no_show", commerceData?.name ?? "le commerce");

  revalidatePath("/shop/paniers/orders");
  return { success: true };
}
