"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { notifyNewBasket } from "@/lib/notifications";

type BasketType = Database["public"]["Enums"]["basket_type"];
type BasketDay = Database["public"]["Enums"]["basket_day"];
type BasketStatus = Database["public"]["Enums"]["basket_status"];

export type UpdateBasketData = {
  type: BasketType;
  day: BasketDay;
  description: string;
  originalPrice: number;
  soldPrice: number;
  quantityTotal: number;
  pickupStart: string;
  pickupEnd: string;
  isDonation: boolean;
  status: BasketStatus;
};

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

async function getCommerceId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("commerces")
    .select("id")
    .eq("profile_id", userId)
    .single();
  return data?.id ?? null;
}

/**
 * Un panier PAYANT ne peut être publié que si le commerce a un compte Stripe
 * Connect configuré — sinon le client tomberait sur « commerce non configuré »
 * au moment du paiement (même contrôle que l'Edge Function create-payment-intent).
 * Les paniers dons ne nécessitent pas de compte Stripe.
 */
async function assertCanPublishPaid(
  supabase: Awaited<ReturnType<typeof createClient>>,
  commerceId: string,
  isDonation: boolean
): Promise<string | null> {
  if (isDonation) return null;
  const { data: commerce } = await supabase
    .from("commerces")
    .select("stripe_account_id")
    .eq("id", commerceId)
    .single();
  if (!commerce?.stripe_account_id) {
    return "Configurez d'abord vos paiements (Stripe Connect) dans « Paiements » avant de publier un panier payant.";
  }
  return null;
}

export async function updateBasket(
  basketId: string,
  data: UpdateBasketData
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const commerceId = await getCommerceId(supabase, user.id);
  if (!commerceId) return { success: false, error: "Commerce introuvable." };

  // Validate minimum 20% discount for non-donation baskets
  if (!data.isDonation && data.originalPrice > 0 && data.soldPrice > data.originalPrice * 0.8) {
    return { success: false, error: "La réduction doit être d'au moins 20 %." };
  }

  // Gate Stripe Connect si on publie un panier payant
  if (data.status === "published") {
    const gateError = await assertCanPublishPaid(supabase, commerceId, data.isDonation);
    if (gateError) return { success: false, error: gateError };
  }

  const { error } = await supabase
    .from("baskets")
    .update({
      type: data.type,
      day: data.day,
      description: data.description || null,
      original_price: data.originalPrice,
      sold_price: data.soldPrice,
      quantity_total: data.quantityTotal,
      pickup_start: data.pickupStart,
      pickup_end: data.pickupEnd,
      is_donation: data.isDonation,
      status: data.status,
    })
    .eq("id", basketId)
    .eq("commerce_id", commerceId);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour du panier." };
  }

  return { success: true };
}

export async function toggleBasketStatus(
  basketId: string,
  currentStatus: BasketStatus
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const commerceId = await getCommerceId(supabase, user.id);
  if (!commerceId) return { success: false, error: "Commerce introuvable." };

  const newStatus: BasketStatus =
    currentStatus === "disabled" ? "published" : "disabled";

  // Gate Stripe Connect avant de (re)publier un panier payant
  if (newStatus === "published") {
    const { data: basketToPublish } = await supabase
      .from("baskets")
      .select("is_donation")
      .eq("id", basketId)
      .eq("commerce_id", commerceId)
      .single();
    const gateError = await assertCanPublishPaid(
      supabase,
      commerceId,
      basketToPublish?.is_donation ?? false
    );
    if (gateError) return { success: false, error: gateError };
  }

  const { error } = await supabase
    .from("baskets")
    .update({ status: newStatus })
    .eq("id", basketId)
    .eq("commerce_id", commerceId);

  if (error) {
    return { success: false, error: "Erreur lors du changement de statut." };
  }

  // Notify favorites when basket is re-published (non-blocking)
  if (newStatus === "published") {
    const { data: basketInfo } = await supabase
      .from("baskets")
      .select("type, sold_price, is_donation")
      .eq("id", basketId)
      .single();

    const { data: commerceInfo } = await supabase
      .from("commerces")
      .select("name")
      .eq("id", commerceId)
      .single();

    if (basketInfo && commerceInfo) {
      notifyNewBasket(
        commerceId,
        commerceInfo.name,
        basketInfo.type,
        basketInfo.sold_price,
        basketInfo.is_donation ?? false,
      ).catch(() => {});
    }
  }

  return { success: true };
}

/** Publish a draft basket (draft → published) */
export async function publishBasket(
  basketId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const commerceId = await getCommerceId(supabase, user.id);
  if (!commerceId) return { success: false, error: "Commerce introuvable." };

  // Verify the basket is in draft status
  const { data: basket } = await supabase
    .from("baskets")
    .select("id, status, commerce_id, type, sold_price, is_donation")
    .eq("id", basketId)
    .single();

  if (!basket || basket.commerce_id !== commerceId) {
    return { success: false, error: "Panier introuvable." };
  }

  if (basket.status !== "draft") {
    return { success: false, error: "Seuls les paniers en brouillon peuvent être publiés." };
  }

  // Check commerce is validated before allowing publish
  const { data: commerce } = await supabase
    .from("commerces")
    .select("status")
    .eq("id", commerceId)
    .single();

  if (commerce?.status !== "validated") {
    return { success: false, error: "Votre commerce doit être validé pour publier des paniers." };
  }

  const gateError = await assertCanPublishPaid(supabase, commerceId, basket.is_donation ?? false);
  if (gateError) return { success: false, error: gateError };

  const { error } = await supabase
    .from("baskets")
    .update({ status: "published" })
    .eq("id", basketId)
    .eq("commerce_id", commerceId);

  if (error) {
    return { success: false, error: "Erreur lors de la publication." };
  }

  // Notify clients who favorited this commerce (non-blocking)
  const { data: commerceInfo } = await supabase
    .from("commerces")
    .select("name")
    .eq("id", commerceId)
    .single();

  if (commerceInfo && basket) {
    notifyNewBasket(
      commerceId,
      commerceInfo.name,
      basket.type,
      basket.sold_price,
      basket.is_donation ?? false,
    ).catch(() => {});
  }

  return { success: true };
}

export async function deleteBasket(basketId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const commerceId = await getCommerceId(supabase, user.id);
  if (!commerceId) redirect("/connexion");

  await supabase
    .from("baskets")
    .delete()
    .eq("id", basketId)
    .eq("commerce_id", commerceId);

  redirect("/shop/paniers");
}
