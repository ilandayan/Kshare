"use server";

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

  if (quantity < 1) return { success: false, error: "Quantité invalide." };

  // Réservation atomique via RPC SECURITY DEFINER :
  // vérifie le rôle asso, verrouille le panier (FOR UPDATE), contrôle le stock,
  // incrémente quantity_reserved et crée la commande — le tout dans une seule
  // transaction, ce qui élimine la race « dernier panier réservé 2x ».
  const { error: rpcError } = await supabase.rpc("reserve_donation", {
    p_basket_id: basketId,
    p_quantity: quantity,
  });

  if (rpcError) {
    // Les messages métier (stock insuffisant, panier indisponible…) proviennent
    // des RAISE EXCEPTION de la fonction.
    return { success: false, error: rpcError.message || "Erreur lors de la réservation." };
  }

  revalidatePath("/asso/paniers-dons");
  revalidatePath("/asso/mes-reservations");
  revalidatePath("/asso/dashboard");
  return { success: true };
}
