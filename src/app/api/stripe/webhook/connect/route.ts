import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { createLedgerEntry } from "@/lib/stripe/ledger";
import { logAuditEvent } from "@/lib/audit-log";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe Connect webhook — handles events from connected accounts.
 * Events: payout.*, charge.dispute.*, account.updated
 *
 * Requires env var: STRIPE_CONNECT_WEBHOOK_SECRET
 */

async function handlePayoutCreated(payout: Stripe.Payout, accountId: string): Promise<void> {
  const supabase = createAdminClient();

  // Find commerce by stripe_account_id
  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("stripe_account_id", accountId)
    .single();

  if (!commerce) {
    console.error("[connect-webhook] Commerce not found for account:", accountId);
    return;
  }

  await supabase.from("payouts").insert({
    commerce_id: commerce.id,
    stripe_payout_id: payout.id,
    stripe_account_id: accountId,
    amount: payout.amount / 100, // cents → euros
    currency: payout.currency,
    status: "pending",
    arrival_date: payout.arrival_date
      ? new Date(payout.arrival_date * 1000).toISOString()
      : null,
  });

  logAuditEvent({
    action: "payment.payout_created",
    metadata: { commerceId: commerce.id, payoutId: payout.id, amount: payout.amount / 100 },
  });
}

async function handlePayoutPaid(payout: Stripe.Payout, accountId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("stripe_account_id", accountId)
    .single();

  if (!commerce) return;

  // Update payout status
  await supabase
    .from("payouts")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("stripe_payout_id", payout.id);

  // Create ledger entry: payout debit (money left commerce balance)
  try {
    await createLedgerEntry({
      commerceId: commerce.id,
      type: "payout",
      debit: payout.amount / 100,
      credit: 0,
      description: `Versement bancaire — ${(payout.amount / 100).toFixed(2)} €`,
      stripeObjectId: payout.id,
      idempotencyKey: `payout:${payout.id}:paid`,
    });
  } catch (err) {
    console.error("[connect-webhook] Payout ledger entry failed:", err);
  }
}

async function handlePayoutFailed(payout: Stripe.Payout, accountId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("stripe_account_id", accountId)
    .single();

  if (!commerce) return;

  await supabase
    .from("payouts")
    .update({
      status: "failed",
      failure_message: payout.failure_message ?? "Unknown failure",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payout_id", payout.id);

  logAuditEvent({
    action: "payment.payout_failed",
    metadata: {
      commerceId: commerce.id,
      payoutId: payout.id,
      reason: payout.failure_message,
    },
  });
}

async function handleDisputeCreated(dispute: Stripe.Dispute, accountId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("stripe_account_id", accountId)
    .single();

  if (!commerce) return;

  // Find order by payment_intent (reliable link between dispute and order)
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  const paymentIntentId = typeof dispute.payment_intent === "string"
    ? dispute.payment_intent
    : dispute.payment_intent?.id;
  let orderId: string | null = null;

  if (paymentIntentId) {
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();
    orderId = order?.id ?? null;
  } else if (chargeId) {
    // Fallback: try to find by charge via Stripe API
    try {
      const stripe = getStripe();
      const charge = await stripe.charges.retrieve(chargeId);
      if (charge.payment_intent) {
        const piId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent.id;
        const { data: order } = await supabase
          .from("orders")
          .select("id")
          .eq("stripe_payment_intent_id", piId)
          .single();
        orderId = order?.id ?? null;
      }
    } catch (err) {
      console.error("[connect-webhook] Failed to resolve order from charge:", err);
    }
  }

  await supabase.from("disputes").insert({
    order_id: orderId,
    commerce_id: commerce.id,
    stripe_dispute_id: dispute.id,
    stripe_charge_id: chargeId ?? null,
    amount: dispute.amount / 100,
    currency: dispute.currency,
    reason: dispute.reason ?? null,
    status: "open",
    evidence_due_by: dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
      : null,
  });

  // Create ledger entry: dispute hold (potential debit)
  try {
    await createLedgerEntry({
      commerceId: commerce.id,
      orderId,
      type: "refund",
      debit: dispute.amount / 100,
      credit: 0,
      description: `Litige ouvert — ${dispute.reason ?? "raison inconnue"}`,
      stripeObjectId: dispute.id,
      idempotencyKey: `dispute:${dispute.id}:created`,
    });
  } catch (err) {
    console.error("[connect-webhook] Dispute ledger entry failed:", err);
  }

  logAuditEvent({
    action: "payment.dispute_created",
    metadata: {
      commerceId: commerce.id,
      disputeId: dispute.id,
      amount: dispute.amount / 100,
      reason: dispute.reason,
    },
  });
}

async function handleDisputeClosed(dispute: Stripe.Dispute, accountId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("stripe_account_id", accountId)
    .single();

  if (!commerce) return;

  const won = dispute.status === "won";

  await supabase
    .from("disputes")
    .update({
      status: won ? "won" : "lost",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_dispute_id", dispute.id);

  // If won, credit back the held amount
  if (won) {
    try {
      await createLedgerEntry({
        commerceId: commerce.id,
        type: "refund",
        debit: 0,
        credit: dispute.amount / 100,
        description: "Litige gagné — montant recrédité",
        stripeObjectId: dispute.id,
        idempotencyKey: `dispute:${dispute.id}:won`,
      });
    } catch (err) {
      console.error("[connect-webhook] Dispute won ledger entry failed:", err);
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret non configuré" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature Stripe manquante" }, { status: 400 });
  }

  const rawBody = await request.arrayBuffer();
  const body = Buffer.from(rawBody);

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[connect-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  // Connected account ID
  const accountId = event.account;
  if (!accountId) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "payout.created":
        await handlePayoutCreated(event.data.object as Stripe.Payout, accountId);
        break;

      case "payout.paid":
        await handlePayoutPaid(event.data.object as Stripe.Payout, accountId);
        break;

      case "payout.failed":
        await handlePayoutFailed(event.data.object as Stripe.Payout, accountId);
        break;

      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object as Stripe.Dispute, accountId);
        break;

      case "charge.dispute.closed":
        await handleDisputeClosed(event.data.object as Stripe.Dispute, accountId);
        break;

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[connect-webhook] Error handling ${event.type}:`, error);
    return NextResponse.json(
      { error: "Erreur lors du traitement" },
      { status: 500 }
    );
  }
}
