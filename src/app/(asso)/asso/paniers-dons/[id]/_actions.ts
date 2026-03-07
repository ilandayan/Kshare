"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function reserverPanierDon(basketId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Vérifier que l'utilisateur est bien une association
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "association") redirect("/connexion");

  const { data: asso } = await supabase
    .from("associations")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!asso) redirect("/connexion");

  // Récupérer les infos du panier
  const { data: basket } = await supabase
    .from("baskets")
    .select("id, commerce_id, sold_price, pickup_start, pickup_end, quantity_total, quantity_reserved, status")
    .eq("id", basketId)
    .eq("is_donation", true)
    .eq("status", "published")
    .single();

  if (!basket) redirect("/asso/paniers-dons");

  const available = basket.quantity_total - basket.quantity_reserved;
  if (available <= 0) redirect("/asso/paniers-dons");

  // Créer la réservation via la table orders (is_donation: true)
  await supabase.from("orders").insert({
    basket_id: basket.id,
    commerce_id: basket.commerce_id,
    client_id: user.id,
    association_id: asso.id,
    is_donation: true,
    unit_price: 0,
    total_amount: 0,
    commission_amount: 0,
    net_amount: 0,
    pickup_date: new Date().toISOString().split("T")[0],
    pickup_start: basket.pickup_start,
    pickup_end: basket.pickup_end,
    status: "created",
    quantity: 1,
  });

  redirect("/asso/mes-reservations");
}
