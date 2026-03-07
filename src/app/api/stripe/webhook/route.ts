import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

function generatePickupCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = createAdminClient();

  const { basketId, quantity, profileId, commerceId, totalAmount, commissionAmount } =
    session.metadata ?? {};

  if (!basketId || !quantity || !profileId || !commerceId) {
    console.error("[webhook] Missing metadata in checkout.session.completed", session.id);
    return;
  }

  const quantityNum = parseInt(quantity, 10);
  const totalAmountNum = parseInt(totalAmount ?? "0", 10) / 100;
  const commissionAmountNum = parseInt(commissionAmount ?? "0", 10) / 100;
  const netAmountNum = totalAmountNum - commissionAmountNum;

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

  const pickupCode = generatePickupCode();

  // Create order
  const { error: orderError } = await supabase.from("orders").insert({
    basket_id: basketId,
    client_id: profileId,
    commerce_id: commerceId,
    total_amount: totalAmountNum,
    unit_price: basket.sold_price,
    quantity: quantityNum,
    commission_amount: commissionAmountNum,
    net_amount: netAmountNum,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null,
    status: "paid",
    qr_code_token: pickupCode,
    is_donation: false,
    pickup_start: basket.pickup_start,
    pickup_end: basket.pickup_end,
    pickup_date: basket.day,
  });

  if (orderError) {
    console.error("[webhook] Failed to create order:", orderError);
    return;
  }

  // Update basket quantities
  const { data: currentBasket } = await supabase
    .from("baskets")
    .select("quantity_sold, quantity_reserved")
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

  const { data: commerce, error: commerceError } = await supabase
    .from("commerces")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (commerceError || !commerce) {
    console.error("[webhook] Commerce not found for customer:", customerId);
    return;
  }

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

  // Upsert subscription record
  const { error: upsertError } = await supabase.from("subscriptions").upsert(
    {
      commerce_id: commerce.id,
      stripe_subscription_id: subscription.id,
      status: mappedStatus,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      monthly_price: 30,
    },
    { onConflict: "commerce_id" }
  );

  if (upsertError) {
    console.error("[webhook] Failed to upsert subscription:", upsertError);
  }

  // Update commerce subscription_status
  await supabase
    .from("commerces")
    .update({ subscription_status: mappedStatus })
    .eq("id", commerce.id);
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

  await supabase
    .from("subscriptions")
    .update({
      status: "cancellation_requested",
      canceled_at: new Date().toISOString(),
    })
    .eq("commerce_id", commerce.id);

  await supabase
    .from("commerces")
    .update({ subscription_status: "cancellation_requested" })
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
