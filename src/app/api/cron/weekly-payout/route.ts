import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * Cron job: weekly payout to commerces via Stripe Connect.
 * Runs every Tuesday at 06:00 UTC via Vercel cron.
 *
 * Calculates net_amount for all picked_up orders since last payout
 * and triggers a Stripe payout for each commerce.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    console.error("[cron/weekly-payout] CRON_SECRET not configured or too short");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Get all commerces with a Stripe account
  const { data: commerces, error: commercesError } = await supabase
    .from("commerces")
    .select("id, name, stripe_account_id")
    .not("stripe_account_id", "is", null)
    .eq("status", "validated");

  if (commercesError || !commerces) {
    return NextResponse.json(
      { error: "Failed to fetch commerces", detail: commercesError?.message },
      { status: 500 },
    );
  }

  const results: Array<{
    commerceId: string;
    commerceName: string;
    orderCount: number;
    netAmount: number;
    status: string;
  }> = [];

  for (const commerce of commerces) {
    if (!commerce.stripe_account_id) continue;

    // Get picked_up orders not yet paid out
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, net_amount")
      .eq("commerce_id", commerce.id)
      .eq("status", "picked_up")
      .eq("payout_status", "pending")
      .gt("net_amount", 0);

    if (ordersError || !orders || orders.length === 0) {
      results.push({
        commerceId: commerce.id,
        commerceName: commerce.name,
        orderCount: 0,
        netAmount: 0,
        status: "no_orders",
      });
      continue;
    }

    const totalNet = orders.reduce(
      (sum, o) => sum + Number(o.net_amount),
      0,
    );

    // Minimum payout: 1€
    if (totalNet < 1) {
      results.push({
        commerceId: commerce.id,
        commerceName: commerce.name,
        orderCount: orders.length,
        netAmount: totalNet,
        status: "below_minimum",
      });
      continue;
    }

    try {
      // Check Stripe Connect balance for this account
      const balance = await stripe.balance.retrieve({
        stripeAccount: commerce.stripe_account_id,
      });

      const availableEur = balance.available.find(
        (b) => b.currency === "eur",
      );
      const availableAmount = (availableEur?.amount ?? 0) / 100;

      if (availableAmount < totalNet) {
        results.push({
          commerceId: commerce.id,
          commerceName: commerce.name,
          orderCount: orders.length,
          netAmount: totalNet,
          status: `insufficient_balance (${availableAmount.toFixed(2)}€ available)`,
        });
        continue;
      }

      // Create payout on the connected account
      await stripe.payouts.create(
        {
          amount: Math.round(totalNet * 100),
          currency: "eur",
          description: `Kshare — Reversement hebdomadaire (${orders.length} commande${orders.length > 1 ? "s" : ""})`,
        },
        { stripeAccount: commerce.stripe_account_id },
      );

      // Mark orders as paid out
      const orderIds = orders.map((o) => o.id);
      await supabase
        .from("orders")
        .update({
          payout_status: "paid" as unknown as string,
          payout_date: new Date().toISOString(),
        } as Record<string, unknown>)
        .in("id", orderIds);

      results.push({
        commerceId: commerce.id,
        commerceName: commerce.name,
        orderCount: orders.length,
        netAmount: totalNet,
        status: "payout_created",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({
        commerceId: commerce.id,
        commerceName: commerce.name,
        orderCount: orders.length,
        netAmount: totalNet,
        status: `error: ${message}`,
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
