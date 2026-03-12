import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { createPaymentLedgerEntries } from "@/lib/stripe/ledger";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/lib/constants";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

function generatePickupCode(): string {
  // Use crypto for cryptographically secure random number generation
  return randomInt(100000, 1000000).toString();
}

function computeDonationExpiresAt(
  pickupEnd: string,
  day: string
): string {
  // Build expiration timestamp based on pickup_end + day
  const now = new Date();
  const targetDate =
    day === "tomorrow"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [hours, minutes] = pickupEnd.split(":").map(Number);
  targetDate.setHours(hours, minutes, 0, 0);

  return targetDate.toISOString();
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = createAdminClient();

  const {
    basketId,
    quantity,
    profileId,
    commerceId,
    basketAmount,
    commissionAmount,
    serviceFeeAmount,
    isDonation,
    // Legacy fallback for old metadata format
    totalAmount: legacyTotalAmount,
  } = session.metadata ?? {};

  if (!basketId || !quantity || !profileId || !commerceId) {
    console.error("[webhook] Missing metadata in checkout.session.completed", session.id);
    return;
  }

  const isClientDonation = isDonation === "true";
  const quantityNum = parseInt(quantity, 10);
  // basketAmount = price of baskets only (without service fee)
  const basketAmountNum = parseInt(basketAmount ?? legacyTotalAmount ?? "0", 10) / 100;
  const commissionAmountNum = parseInt(commissionAmount ?? "0", 10) / 100;
  const serviceFeeAmountNum = parseInt(serviceFeeAmount ?? "0", 10) / 100;
  const netAmountNum = basketAmountNum - commissionAmountNum;

  // Fetch basket info for pickup times
  const { data: basket, error: basketError } = await supabase
    .from("baskets")
    .select("sold_price, pickup_start, pickup_end, day")
    .eq("id", basketId)
    .single();

  if (basketError || !basket) {
    console.error("[webhook] Basket not found:", basketId);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  if (isClientDonation) {
    // Don client: order en attente d'une association
    const donationExpiresAt = computeDonationExpiresAt(
      basket.pickup_end,
      basket.day
    );

    const { error: orderError } = await supabase.from("orders").insert({
      basket_id: basketId,
      client_id: profileId,
      commerce_id: commerceId,
      total_amount: basketAmountNum,
      unit_price: basketAmountNum / quantityNum,
      quantity: quantityNum,
      commission_amount: 0,
      net_amount: basketAmountNum,
      service_fee_amount: serviceFeeAmountNum,
      stripe_payment_intent_id: paymentIntentId,
      status: "pending_association",
      qr_code_token: null,
      is_donation: true,
      pickup_start: basket.pickup_start,
      pickup_end: basket.pickup_end,
      pickup_date: basket.day,
      donation_expires_at: donationExpiresAt,
    });

    if (orderError) {
      console.error("[webhook] Failed to create donation order:", orderError);
      return;
    }

    // Increment quantity_reserved (not quantity_sold)
    const { data: currentBasket } = await supabase
      .from("baskets")
      .select("quantity_reserved")
      .eq("id", basketId)
      .single();

    if (currentBasket) {
      await supabase
        .from("baskets")
        .update({
          quantity_reserved: currentBasket.quantity_reserved + quantityNum,
        })
        .eq("id", basketId);
    }
  } else {
    // Achat classique
    const pickupCode = generatePickupCode();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        basket_id: basketId,
        client_id: profileId,
        commerce_id: commerceId,
        total_amount: basketAmountNum,
        unit_price: basket.sold_price,
        quantity: quantityNum,
        commission_amount: commissionAmountNum,
        net_amount: netAmountNum,
        service_fee_amount: serviceFeeAmountNum,
        stripe_payment_intent_id: paymentIntentId,
        status: "paid",
        qr_code_token: pickupCode,
        is_donation: false,
        pickup_start: basket.pickup_start,
        pickup_end: basket.pickup_end,
        pickup_date: basket.day,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("[webhook] Failed to create order:", orderError);
      return;
    }

    // Create ledger entries for the payment
    if (order && paymentIntentId && commissionAmountNum > 0) {
      try {
        await createPaymentLedgerEntries({
          commerceId,
          orderId: order.id,
          totalAmount: basketAmountNum,
          commissionAmount: commissionAmountNum,
          serviceFeeAmount: serviceFeeAmountNum,
          netAmount: netAmountNum,
          stripePaymentIntentId: paymentIntentId,
        });
      } catch (ledgerErr) {
        // Non-blocking: log but don't fail the webhook
        console.error("[webhook] Ledger entry failed:", ledgerErr);
      }
    }

    // Update basket quantities
    const { data: currentBasket } = await supabase
      .from("baskets")
      .select("quantity_sold")
      .eq("id", basketId)
      .single();

    if (currentBasket) {
      await supabase
        .from("baskets")
        .update({
          quantity_sold: currentBasket.quantity_sold + quantityNum,
        })
        .eq("id", basketId);
    }
  }
}

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  if (!account.charges_enabled) return;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("commerces")
    .update({ stripe_account_id: account.id })
    .eq("stripe_account_id", account.id);

  if (error) {
    console.error("[webhook] Failed to update commerce for account:", account.id, error);
  }
}

async function handleSubscriptionCreatedOrUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createAdminClient();

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Fetch commerce with current state BEFORE any updates
  // (needed to distinguish admin-suspend from auto-suspend for non-payment)
  const { data: commerce, error: commerceError } = await supabase
    .from("commerces")
    .select("id, status, subscription_status")
    .eq("stripe_customer_id", customerId)
    .single();

  if (commerceError || !commerce) {
    console.error("[webhook] Commerce not found for customer:", customerId);
    return;
  }

  const previousStatus = commerce.status;
  const previousSubscriptionStatus = commerce.subscription_status;

  const statusMap: Record<string, "active" | "offered" | "unpaid" | "cancellation_requested"> = {
    active: "active",
    trialing: "offered",
    past_due: "unpaid",
    unpaid: "unpaid",
    canceled: "cancellation_requested",
    incomplete: "unpaid",
    incomplete_expired: "unpaid",
    paused: "unpaid",
  };

  const mappedStatus = statusMap[subscription.status] ?? "unpaid";

  const firstItem = subscription.items.data[0];
  const periodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;

  // Determine plan from subscription metadata
  const plan = (subscription.metadata?.plan ?? "pro") as SubscriptionPlanId;
  const planConfig = SUBSCRIPTION_PLANS[plan] ?? SUBSCRIPTION_PLANS.pro;

  // Upsert subscription record
  const { error: upsertError } = await supabase.from("subscriptions").upsert(
    {
      commerce_id: commerce.id,
      stripe_subscription_id: subscription.id,
      status: mappedStatus,
      plan,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      monthly_price: planConfig.monthlyPrice,
      commission_rate: planConfig.commissionRate,
    },
    { onConflict: "commerce_id" }
  );

  if (upsertError) {
    console.error("[webhook] Failed to upsert subscription:", upsertError);
  }

  // Update commerce subscription_status + plan + commission_rate
  await supabase
    .from("commerces")
    .update({
      subscription_status: mappedStatus,
      subscription_plan: plan,
      commission_rate: planConfig.commissionRate,
    })
    .eq("id", commerce.id);

  // Auto-suspend commerce when subscription becomes unpaid
  // (only if commerce was previously validated — don't re-suspend an already suspended commerce)
  if (mappedStatus === "unpaid" && previousStatus === "validated") {
    await supabase
      .from("commerces")
      .update({ status: "suspended" })
      .eq("id", commerce.id);
  }

  // Auto-restore commerce when subscription becomes active again
  // ONLY if the suspension was caused by non-payment (previous subscription_status was "unpaid")
  // This prevents restoring commerces suspended manually by admin for other reasons
  if (
    (mappedStatus === "active" || mappedStatus === "offered") &&
    previousStatus === "suspended" &&
    previousSubscriptionStatus === "unpaid"
  ) {
    await supabase
      .from("commerces")
      .update({ status: "validated" })
      .eq("id", commerce.id);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createAdminClient();

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const { data: commerce, error: commerceError } = await supabase
    .from("commerces")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (commerceError || !commerce) {
    console.error("[webhook] Commerce not found for customer:", customerId);
    return;
  }

  // Downgrade to Starter plan (commerce stays active, just loses Pro benefits)
  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      plan: "starter",
      monthly_price: 0,
      commission_rate: SUBSCRIPTION_PLANS.starter.commissionRate,
      canceled_at: new Date().toISOString(),
      stripe_subscription_id: null,
    })
    .eq("commerce_id", commerce.id);

  await supabase
    .from("commerces")
    .update({
      subscription_status: "active",
      subscription_plan: "starter",
      commission_rate: SUBSCRIPTION_PLANS.starter.commissionRate,
    })
    .eq("id", commerce.id);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret non configuré" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Signature Stripe manquante" },
      { status: 400 }
    );
  }

  // Read raw body — do NOT use request.json()
  const rawBody = await request.arrayBuffer();
  const body = Buffer.from(rawBody);

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Signature invalide" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionCreatedOrUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      default:
        // Ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[webhook] Error handling event ${event.type}:`, error);
    return NextResponse.json(
      { error: "Erreur lors du traitement de l'événement" },
      { status: 500 }
    );
  }
}
