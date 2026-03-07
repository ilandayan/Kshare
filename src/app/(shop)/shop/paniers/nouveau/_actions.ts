"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, status")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) return { success: false, error: "Commerce introuvable." };
  if (commerce.status !== "validated") {
    return { success: false, error: "Votre compte doit être validé pour créer des paniers." };
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
