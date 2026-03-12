import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

/**
 * Expire les dons clients non récupérés par une association.
 * Annule l'autorisation Stripe et met à jour le statut de la commande.
 *
 * Appelable via Vercel Cron ou manuellement.
 * Sécurisé par CRON_SECRET en production.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Vérifier le secret cron — obligatoire en production
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/expire-donations] CRON_SECRET non configuré");
    return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const stripe = getStripe();

  // Récupérer les dons expirés
  const { data: expiredOrders, error: fetchError } = await supabase
    .from("orders")
    .select("id, basket_id, quantity, stripe_payment_intent_id")
    .eq("status", "pending_association")
    .eq("is_donation", true)
    .lt("donation_expires_at", new Date().toISOString());

  if (fetchError) {
    console.error("[cron/expire-donations] Fetch error:", fetchError);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des dons expirés" },
      { status: 500 }
    );
  }

  if (!expiredOrders || expiredOrders.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  let expiredCount = 0;

  for (const order of expiredOrders) {
    try {
      // Annuler l'autorisation Stripe
      if (order.stripe_payment_intent_id) {
        try {
          await stripe.paymentIntents.cancel(order.stripe_payment_intent_id);
        } catch (stripeErr) {
          // L'autorisation a peut-être déjà expiré côté Stripe (7 jours max)
          console.warn(
            `[cron/expire-donations] Stripe cancel failed for ${order.stripe_payment_intent_id}:`,
            stripeErr
          );
        }
      }

      // Mettre à jour le statut de la commande
      await supabase
        .from("orders")
        .update({ status: "expired" })
        .eq("id", order.id);

      // Décrémenter quantity_reserved du panier
      const { data: basket } = await supabase
        .from("baskets")
        .select("quantity_reserved")
        .eq("id", order.basket_id)
        .single();

      if (basket) {
        await supabase
          .from("baskets")
          .update({
            quantity_reserved: Math.max(
              0,
              basket.quantity_reserved - order.quantity
            ),
          })
          .eq("id", order.basket_id);
      }

      expiredCount++;
    } catch (err) {
      console.error(
        `[cron/expire-donations] Error expiring order ${order.id}:`,
        err
      );
    }
  }

  return NextResponse.json({ expired: expiredCount });
}
