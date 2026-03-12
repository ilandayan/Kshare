"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type BasketType = Database["public"]["Enums"]["basket_type"];
type BasketDay = Database["public"]["Enums"]["basket_day"];

export type CreateDonationBasketData = {
  type: BasketType;
  day: BasketDay;
  description: string;
  quantityTotal: number;
  pickupStart: string;
  pickupEnd: string;
};

export type CreateDonationBasketResult =
  | { success: true }
  | { success: false; error: string };

export async function createDonationBasket(
  data: CreateDonationBasketData,
): Promise<CreateDonationBasketResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, status")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) return { success: false, error: "Commerce introuvable." };
  if (commerce.status === "suspended") {
    return {
      success: false,
      error:
        "Votre compte est suspendu. Veuillez régulariser votre abonnement pour créer des paniers.",
    };
  }
  if (commerce.status !== "validated") {
    return {
      success: false,
      error: "Votre compte doit être validé pour créer des paniers.",
    };
  }

  if (
    typeof data.quantityTotal !== "number" ||
    data.quantityTotal < 1 ||
    !Number.isInteger(data.quantityTotal)
  ) {
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
    original_price: 0,
    sold_price: 0,
    quantity_total: data.quantityTotal,
    pickup_start: data.pickupStart,
    pickup_end: data.pickupEnd,
    is_donation: true,
    status: "draft",
  });

  if (error) {
    return { success: false, error: "Erreur lors de la création du panier don." };
  }

  redirect("/shop/paniers");
}
