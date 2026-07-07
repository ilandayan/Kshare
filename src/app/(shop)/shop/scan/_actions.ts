"use server";

import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit-log";

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
        qrCodeToken: string;
      };
    }
  | { success: false; error: string };

/** Look up an order by QR code token for the current commerce */
export async function rechercherParCode(
  token: string
): Promise<ScanResult> {
  try {
    if (!token || token.trim().length < 4) {
      return { success: false, error: "Code invalide." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[scan] Auth error:", authError.message);
      return { success: false, error: "Erreur d'authentification." };
    }
    if (!user) return { success: false, error: "Non authentifié." };

    const { data: commerce, error: commerceError } = await supabase
      .from("commerces")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (commerceError) {
      console.error("[scan] Commerce lookup error:", commerceError.message, "user:", user.id);
      return { success: false, error: "Commerce introuvable." };
    }
    if (!commerce) return { success: false, error: "Commerce introuvable." };

    const cleanToken = token.trim();

    // Query order — baskets join is optional (non-inner), won't block the query
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id, status, quantity, total_amount, is_donation, qr_code_token, created_at,
        pickup_start, pickup_end,
        baskets(type)
      `)
      .eq("commerce_id", commerce.id)
      .eq("qr_code_token", cleanToken)
      .single();

    if (orderError) {
      console.error("[scan] Order query error:", orderError.message, orderError.code, orderError.details);
      // PGRST116 = no rows found (single() with 0 results)
      if (orderError.code === "PGRST116") {
        return { success: false, error: "Aucune commande trouvée avec ce code." };
      }
      return { success: false, error: "Erreur lors de la recherche de commande." };
    }

    if (!order) {
      console.error("[scan] No order found for commerce:", commerce.id, "token:", cleanToken);
      return { success: false, error: "Aucune commande trouvée avec ce code." };
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
        qrCodeToken: order.qr_code_token ?? "",
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[scan] Unexpected error in rechercherParCode:", message);
    return { success: false, error: "Erreur inattendue. Veuillez réessayer." };
  }
}

/**
 * Le COMMERCE confirme le retrait après avoir remis le panier au client.
 * C'est bien le commerçant — et non le client — qui déclenche `picked_up`,
 * ce qui empêche un client de se déclarer « retiré » sans passer en magasin.
 */
export async function confirmerRetrait(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return { success: false, error: "Non authentifié." };

    const { data: commerce } = await supabase
      .from("commerces")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!commerce) return { success: false, error: "Commerce introuvable." };

    // Vérifier que la commande appartient bien à ce commerce et est retirable
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, commerce_id")
      .eq("id", orderId)
      .eq("commerce_id", commerce.id)
      .single();

    if (orderError || !order) return { success: false, error: "Commande introuvable." };

    if (order.status === "picked_up") {
      return { success: false, error: "Ce panier a déjà été retiré." };
    }
    if (order.status !== "paid" && order.status !== "ready_for_pickup") {
      return { success: false, error: "Cette commande ne peut pas être retirée dans son état actuel." };
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "picked_up", picked_up_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("commerce_id", commerce.id);

    if (updateError) {
      console.error("[scan] confirmerRetrait update error:", updateError.message);
      return { success: false, error: "Erreur lors de la confirmation du retrait." };
    }

    logAuditEvent({
      action: "order.picked_up_by_commerce",
      actor_id: user.id,
      target_id: orderId,
      metadata: { orderId, commerceId: commerce.id },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[scan] Unexpected error in confirmerRetrait:", message);
    return { success: false, error: "Erreur inattendue. Veuillez réessayer." };
  }
}
