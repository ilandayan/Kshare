"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ValiderDonResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Récupère un don client en attente : assigne l'association et génère un
 * code de retrait. Le paiement Stripe n'est PAS capturé à cette étape —
 * il sera capturé uniquement lorsque l'asso confirme la collecte physique.
 * Cela permet à l'asso d'annuler avant collecte (remise en pending_association).
 */
export async function validerDonClient(
  orderId: string
): Promise<ValiderDonResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  // Vérifier rôle association
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

  // Récupérer l'order en attente (admin client pour bypasser RLS)
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, basket_id, stripe_payment_intent_id, quantity, status, is_donation"
    )
    .eq("id", orderId)
    .eq("status", "pending_association")
    .eq("is_donation", true)
    .single();

  if (!order)
    return { success: false, error: "Commande introuvable ou déjà traitée." };

  if (!order.stripe_payment_intent_id)
    return { success: false, error: "Identifiant de paiement manquant." };

  // Générer un code de retrait (12-char hex = 281 trillion combinations)
  const { randomBytes } = await import("crypto");
  const pickupCode = randomBytes(6).toString("hex").toUpperCase();

  // Assigner l'association — le paiement sera capturé à la collecte
  const { error: updateError } = await admin
    .from("orders")
    .update({
      status: "paid",
      association_id: asso.id,
      qr_code_token: pickupCode,
    })
    .eq("id", order.id);

  if (updateError) {
    console.error("[validerDonClient] Failed to update order:", updateError);
    return { success: false, error: "Erreur lors de la mise à jour." };
  }

  revalidatePath("/asso/paniers-dons");
  revalidatePath("/asso/mes-reservations");
  revalidatePath("/asso/dashboard");
  return { success: true };
}
