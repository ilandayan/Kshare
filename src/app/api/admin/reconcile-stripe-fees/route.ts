import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  // Auth check: admin only
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Fetch orders missing stripe_fee_amount
  const admin = createAdminClient();
  const { data: orders, error: fetchError } = await admin
    .from("orders")
    .select("id, stripe_payment_intent_id")
    .not("stripe_payment_intent_id", "is", null)
    .or("stripe_fee_amount.is.null,stripe_fee_amount.eq.0")
    .limit(100);

  if (fetchError) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes", details: fetchError.message },
      { status: 500 }
    );
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ reconciled: 0, message: "Aucune commande à réconcilier" });
  }

  const stripe = getStripe();
  let reconciled = 0;
  const errors: string[] = [];

  for (const order of orders) {
    if (!order.stripe_payment_intent_id) continue;

    try {
      const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, {
        expand: ["latest_charge.balance_transaction"],
      });

      const charge = pi.latest_charge as Stripe.Charge | null;
      const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;

      if (bt) {
        const stripeFee = bt.fee / 100; // cents → EUR
        await admin
          .from("orders")
          .update({ stripe_fee_amount: stripeFee } as Record<string, unknown>)
          .eq("id", order.id);
        reconciled++;
      }
    } catch (err) {
      errors.push(`Order ${order.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return NextResponse.json({
    reconciled,
    total: orders.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
