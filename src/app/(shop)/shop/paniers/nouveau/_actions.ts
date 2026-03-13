"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateBasketPrice } from "@/lib/stripe/client";
import { BASKET_TYPES_BY_COMMERCE } from "@/lib/constants";
import type { Database } from "@/types/database.types";

type BasketType = Database["public"]["Enums"]["basket_type"];
type BasketDay = Database["public"]["Enums"]["basket_day"];

export type CreateBasketData = {
  type: BasketType;
  day: BasketDay;
  description: string;
  originalPrice: number;
  soldPrice: number;
  quantityTotal: number;
  pickupStart: string;
  pickupEnd: string;
  isDonation: boolean;
};

export type CreateBasketResult =
  | { success: true }
  | { success: false; error: string };

export async function createBasket(data: CreateBasketData): Promise<CreateBasketResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, status, subscription_plan, commerce_type")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) return { success: false, error: "Commerce introuvable." };
  if (commerce.status === "suspended") {
    return { success: false, error: "Votre compte est suspendu. Veuillez régulariser votre abonnement pour créer des paniers." };
  }
  if (commerce.status !== "validated") {
    return { success: false, error: "Votre compte doit être validé pour créer des paniers." };
  }

  // Must choose a plan before publishing
  if (!commerce.subscription_plan) {
    return { success: false, error: "Vous devez choisir un plan (Starter ou Pro) avant de publier des paniers." };
  }

  // Validate basket type against commerce type rules
  if (commerce.commerce_type) {
    const allowedTypes = BASKET_TYPES_BY_COMMERCE[commerce.commerce_type];
    if (allowedTypes && !allowedTypes.includes(data.type)) {
      return {
        success: false,
        error: `Un commerce de type "${commerce.commerce_type}" ne peut pas créer de panier "${data.type}".`,
      };
    }
  }

  // Server-side validation of prices and quantities
  if (typeof data.originalPrice !== "number" || data.originalPrice <= 0) {
    return { success: false, error: "Le prix original doit être un nombre positif." };
  }
  if (typeof data.soldPrice !== "number" || data.soldPrice <= 0) {
    return { success: false, error: "Le prix de vente doit être un nombre positif." };
  }
  if (data.soldPrice > data.originalPrice) {
    return { success: false, error: "Le prix de vente ne peut pas dépasser le prix original." };
  }

  // Validate basket price constraints (min 5€, min 40% discount)
  const priceError = validateBasketPrice(data.soldPrice, data.originalPrice, data.isDonation);
  if (priceError) {
    return { success: false, error: priceError };
  }

  if (typeof data.quantityTotal !== "number" || data.quantityTotal < 1 || !Number.isInteger(data.quantityTotal)) {
    return { success: false, error: "La quantité doit être un entier positif." };
  }
  if (!data.pickupStart || !data.pickupEnd) {
    return { success: false, error: "Les horaires de retrait sont requis." };
  }

  const { error } = await supabase.from("baskets").insert({
    commerce_id: commerce.id,
    type: data.type,
    day: data.day,
    description: data.description || null,
    original_price: data.originalPrice,
    sold_price: data.soldPrice,
    quantity_total: data.quantityTotal,
    pickup_start: data.pickupStart,
    pickup_end: data.pickupEnd,
    is_donation: data.isDonation,
    status: "draft",
  });

  if (error) {
    return { success: false, error: "Erreur lors de la création du panier." };
  }

  redirect("/shop/paniers");
}
