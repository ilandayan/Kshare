import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Cron job: mark orders as no_show when pickup_end has passed.
 * Runs every 30 minutes via Vercel cron.
 *
 * Targets orders with status "paid" or "ready_for_pickup" whose
 * pickup window has ended. No refund is issued.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret (Vercel sets this header)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    console.error("[cron/no-show] CRON_SECRET not configured or too short");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Find orders whose pickup window has expired
  // pickup_date + pickup_end < now, and status is still paid or ready_for_pickup
  const { data: expiredOrders, error } = await supabase
    .from("orders")
    .select("id, basket_id, pickup_date, pickup_end")
    .in("status", ["paid", "ready_for_pickup"])
    .not("pickup_date", "is", null)
    .not("pickup_end", "is", null);

  if (error) {
    console.error("[cron/no-show] Failed to fetch orders:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  let updated = 0;

  for (const order of expiredOrders ?? []) {
    // Build the actual pickup end datetime
    const pickupDate = order.pickup_date; // e.g. "2026-03-12" or "today"/"tomorrow"
    const pickupEnd = order.pickup_end; // e.g. "18:00"

    if (!pickupDate || !pickupEnd) continue;

    let endDateTime: Date;

    if (pickupDate === "today" || pickupDate === "tomorrow") {
      // Legacy format — skip, these should have been resolved at creation
      continue;
    }

    // Standard ISO date format
    const [hours, minutes] = pickupEnd.split(":").map(Number);
    endDateTime = new Date(pickupDate);
    endDateTime.setHours(hours, minutes, 0, 0);

    if (endDateTime.toISOString() < now) {
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "no_show" })
        .eq("id", order.id);

      if (!updateErr) updated++;
    }
  }

  return NextResponse.json({ updated, checked: expiredOrders?.length ?? 0 });
}
