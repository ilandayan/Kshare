import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * Migration ponctuelle : passe TOUS les comptes Stripe Connect existants en
 * payout MANUEL, pour que le cron weekly-payout soit la seule source de
 * virement (évite le double-virement avec l'ancien schedule automatique).
 *
 * À appeler une fois, en admin :
 *   curl -X POST https://k-share.fr/api/stripe/connect/migrate-payouts-manual \
 *        -H "authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const { data: commerces, error } = await supabase
    .from("commerces")
    .select("id, name, stripe_account_id")
    .not("stripe_account_id", "is", null);

  if (error || !commerces) {
    return NextResponse.json(
      { error: "Failed to fetch commerces", detail: error?.message },
      { status: 500 },
    );
  }

  const results: Array<{ commerce: string; status: string }> = [];

  for (const commerce of commerces) {
    if (!commerce.stripe_account_id) continue;
    try {
      await stripe.accounts.update(commerce.stripe_account_id, {
        settings: { payouts: { schedule: { interval: "manual" } } },
      });
      results.push({ commerce: commerce.name, status: "manual_ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({ commerce: commerce.name, status: `error: ${message}` });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
