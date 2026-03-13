"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyOrderStatusChange } from "@/lib/notifications";

export type ScanResult =
  | {
      success: true;
      order: {
        id: string;
        orderNumber: string;
        status: string;
        quantity: number;
        totalAmount: number;
        isDonation: boolean;
        basketType: string;
        pickupStart: string;
        pickupEnd: string;
        clientName: string;
        qrCodeToken: string;
      };
    }
  | { success: false; error: string };

export type ConfirmResult =
  | { success: true }
  | { success: false; error: string };

/** Look up an order by QR code token for the current commerce */
export async function rechercherParCode(
  token: string
): Promise<ScanResult> {
  if (!token || token.trim().length < 4) {
    return { success: false, error: "Code invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie." };

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!commerce) return { success: false, error: "Commerce introuvable." };

  const cleanToken = token.trim();

  // Query order directly — avoid joining profiles (RLS blocks cross-user reads)
  // and baskets (pickup times already stored on order row)
  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, status, quantity, total_amount, is_donation, qr_code_token, created_at,
      pickup_start, pickup_end, pickup_date, client_id,
      baskets(type)
    `)
    .eq("commerce_id", commerce.id)
    .eq("qr_code_token", cleanToken)
    .single();

  if (!order) {
    return { success: false, error: "Aucune commande trouvée avec ce code." };
  }

  // Fetch client name separately using the commerce's own context
  // (RLS on profiles only allows reading own profile, so we fall back gracefully)
  let clientName = "Client";
  if (order.client_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", order.client_id)
      .single();
    if (profile?.full_name) clientName = profile.full_name;
  }

  const basket = order.baskets as { type: string } | null;

  const year = new Date(order.created_at).getFullYear();
  const short = order.id.replace(/-/g, "").slice(-4).toUpperCase();

  return {
    success: true,
    order: {
      id: order.id,
      orderNumber: `CMD-${year}-${short}`,
      status: order.status,
      quantity: order.quantity ?? 1,
      totalAmount: order.total_amount ?? 0,
      isDonation: order.is_donation ?? false,
      basketType: basket?.type ?? "",
      pickupStart: order.pickup_start?.slice(0, 5) ?? "",
      pickupEnd: order.pickup_end?.slice(0, 5) ?? "",
      clientName,
      qrCodeToken: order.qr_code_token ?? "",
    },
  };
}

/** Confirm pickup for an order */
export async function confirmerRetraitScan(
  orderId: string
): Promise<ConfirmResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie." };

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, name")
    .eq("profile_id", user.id)
    .single();
  if (!commerce) return { success: false, error: "Commerce introuvable." };

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, commerce_id, client_id")
    .eq("id", orderId)
    .single();

  if (!order || order.commerce_id !== commerce.id) {
    return { success: false, error: "Commande introuvable." };
  }

  if (order.status !== "paid" && order.status !== "ready_for_pickup") {
    return { success: false, error: "Cette commande ne peut pas etre confirmee." };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: "picked_up",
      picked_up_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("commerce_id", commerce.id);

  if (error) return { success: false, error: "Erreur lors de la confirmation." };

  // Send push notification to client (fire-and-forget)
  notifyOrderStatusChange(orderId, order.client_id, "picked_up", commerce.name ?? "le commerce");

  revalidatePath("/shop/scan");
  revalidatePath("/shop/paniers/orders");
  return { success: true };
}
