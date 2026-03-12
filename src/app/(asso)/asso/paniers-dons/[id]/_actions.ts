"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReserverDonResult =
  | { success: true }
  | { success: false; error: string };

export async function reserverPanierDon(
  basketId: string,
  quantity: number = 1
): Promise<ReserverDonResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  // Vérifier que l'utilisateur est bien une association
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "association")
    return { success: false, error: "Accès réservé aux associations." };

  const { data: asso } = await supabase
    .from("associations")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!asso) return { success: false, error: "Association introuvable." };

  // Récupérer les infos du panier
  const { data: basket } = await supabase
    .from("baskets")
    .select(
      "id, commerce_id, sold_price, pickup_start, pickup_end, day, quantity_total, quantity_reserved, quantity_sold, status"
    )
    .eq("id", basketId)
    .eq("is_donation", true)
    .eq("status", "published")
    .single();

  if (!basket) return { success: false, error: "Panier introuvable ou indisponible." };

  const available =
    basket.quantity_total - (basket.quantity_reserved ?? 0) - (basket.quantity_sold ?? 0);

  if (quantity < 1) return { success: false, error: "Quantité invalide." };
  if (quantity > available)
    return {
      success: false,
      error: `Seulement ${available} panier${available > 1 ? "s" : ""} disponible${available > 1 ? "s" : ""}.`,
    };

  // Créer la réservation via la table orders (is_donation: true)
  const { error: orderError } = await supabase.from("orders").insert({
    basket_id: basket.id,
    commerce_id: basket.commerce_id,
    client_id: user.id,
    association_id: asso.id,
    is_donation: true,
    unit_price: 0,
    total_amount: 0,
    commission_amount: 0,
    net_amount: 0,
    pickup_date: basket.day === "today"
      ? new Date().toISOString().split("T")[0]
      : new Date(Date.now() + 86400000).toISOString().split("T")[0],
    pickup_start: basket.pickup_start,
    pickup_end: basket.pickup_end,
    status: "created",
    quantity,
  });

  if (orderError) return { success: false, error: "Erreur lors de la réservation." };

  // Mettre à jour la quantité réservée du panier
  await supabase
    .from("baskets")
    .update({
      quantity_reserved: (basket.quantity_reserved ?? 0) + quantity,
    })
    .eq("id", basket.id);

  revalidatePath("/asso/paniers-dons");
  revalidatePath("/asso/mes-reservations");
  revalidatePath("/asso/dashboard");
  return { success: true };
}
