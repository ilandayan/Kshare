import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { createRefundLedgerEntries } from "@/lib/stripe/ledger";
import { checkRateLimit, getClientIp, PAYMENT_RATE_LIMIT } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

interface RefundRequestBody {
  orderId: string;
  amount?: number; // partial refund in euros (omit for full)
  reason?: string;
}

/**
 * Admin-only endpoint for issuing refunds on orders.
 * Supports full and partial refunds via Stripe + ledger entries.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`refund:${ip}`, PAYMENT_RATE_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer dans quelques instants." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Admin only
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    let body: RefundRequestBody;
    try {
      body = (await request.json()) as RefundRequestBody;
    } catch {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const { orderId, amount: partialAmount, reason } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "orderId requis" }, { status: 400 });
    }

    // Fetch order
    const adminSupabase = createAdminClient();
    const { data: order, error: orderError } = await adminSupabase
      .from("orders")
      .select("id, total_amount, commission_amount, net_amount, stripe_payment_intent_id, status, commerce_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json({ error: "Pas de paiement Stripe associé" }, { status: 400 });
    }

    if (order.status === "refunded") {
      return NextResponse.json({ error: "Cette commande a déjà été remboursée" }, { status: 400 });
    }

    const stripe = getStripe();
    const refundAmountEur = partialAmount ?? order.total_amount;
    const refundAmountCents = Math.round(refundAmountEur * 100);

    // Calculate proportional commission refund
    const refundRatio = refundAmountEur / order.total_amount;
    const commissionRefund = Math.round(order.commission_amount * refundRatio * 100) / 100;

    // Create Stripe refund (refund_application_fee returns commission to client)
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: refundAmountCents,
      refund_application_fee: true,
      reason: reason === "duplicate" ? "duplicate" : reason === "fraudulent" ? "fraudulent" : "requested_by_customer",
    });

    // Update order status
    const isFullRefund = refundAmountEur >= order.total_amount;
    await adminSupabase
      .from("orders")
      .update({ status: isFullRefund ? "refunded" : "paid" })
      .eq("id", orderId);

    // Create ledger entries
    try {
      await createRefundLedgerEntries({
        commerceId: order.commerce_id,
        orderId,
        refundAmount: refundAmountEur,
        commissionRefund,
        stripeRefundId: refund.id,
      });
    } catch (ledgerErr) {
      console.error("[refund] Ledger entry failed:", ledgerErr);
    }

    logAuditEvent({
      action: "admin.refund_order",
      actor_id: user.id,
      target_id: orderId,
      ip,
      metadata: {
        orderId,
        refundAmount: refundAmountEur,
        stripeRefundId: refund.id,
        isFullRefund,
      },
    });

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refundAmountEur,
      isFullRefund,
    });
  } catch (error) {
    console.error("[stripe/refund] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors du remboursement" },
      { status: 500 }
    );
  }
}
