import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

Deno.serve(async (req: Request) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecretKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25" });

  // Verify Stripe signature
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature failed";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  // Init Supabase admin client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  console.log(`[stripe-webhook] Processing event: ${event.type}`);

  try {
    switch (event.type) {
      // ── Payment succeeded → mark order as paid ──────────────────────────
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const basket_id = pi.metadata?.basket_id;

        // Update order status
        const { data: order, error } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("stripe_payment_intent_id", pi.id)
          .select("id, basket_id, quantity, is_donation, association_id")
          .single();

        if (error) {
          console.error("[stripe-webhook] Failed to update order:", error.message);
          break;
        }

        console.log(`[stripe-webhook] Order ${order?.id} marked as paid`);

        // Update basket sold count & release reservation
        if (basket_id && order) {
          const { data: basket } = await supabase
            .from("baskets")
            .select("quantity_reserved, quantity_sold")
            .eq("id", basket_id)
            .single();

          if (basket) {
            await supabase
              .from("baskets")
              .update({
                quantity_reserved: Math.max(0, basket.quantity_reserved - order.quantity),
                quantity_sold: basket.quantity_sold + order.quantity,
              })
              .eq("id", basket_id);
          }
        }

        // If donation, create donation record
        if (order?.is_donation && order.association_id) {
          await supabase.from("donations").insert({
            basket_id: order.basket_id,
            association_id: order.association_id,
            status: "available",
          });
        }
        break;
      }

      // ── Payment failed → release reservation ────────────────────────────
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;

        const { data: order } = await supabase
          .from("orders")
          .update({ status: "cancelled_admin" })
          .eq("stripe_payment_intent_id", pi.id)
          .select("basket_id, quantity")
          .single();

        // Release reserved quantity
        if (order?.basket_id) {
          const { data: basket } = await supabase
            .from("baskets")
            .select("quantity_reserved")
            .eq("id", order.basket_id)
            .single();

          if (basket && basket.quantity_reserved > 0) {
            await supabase
              .from("baskets")
              .update({
                quantity_reserved: Math.max(
                  0,
                  basket.quantity_reserved - (order.quantity ?? 1),
                ),
              })
              .eq("id", order.basket_id);
          }
        }

        console.log(`[stripe-webhook] Payment failed for PI: ${pi.id}`);
        break;
      }

      // ── Stripe Connect account updated ──────────────────────────────────
      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        // If charges enabled, the merchant is fully onboarded
        if (account.charges_enabled) {
          await supabase
            .from("commerces")
            .update({ stripe_account_id: account.id })
            .eq("stripe_account_id", account.id);

          console.log(`[stripe-webhook] Account ${account.id} charges_enabled`);
        }
        break;
      }

      // ── Subscription updated / deleted ───────────────────────────────────
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const mappedStatus = (() => {
          if (sub.status === "active" || sub.status === "trialing") return "active";
          if (sub.status === "past_due" || sub.status === "unpaid") return "unpaid";
          if (sub.status === "canceled") return "canceled";
          return "unpaid";
        })();

        await supabase
          .from("subscriptions")
          .update({
            status: mappedStatus,
            next_billing_date: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", sub.id);

        console.log(`[stripe-webhook] Subscription ${sub.id} → ${mappedStatus}`);
        break;
      }

      // ── Invoice payment failed → subscription unpaid ─────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

        if (subscriptionId) {
          await supabase
            .from("subscriptions")
            .update({ status: "unpaid" })
            .eq("stripe_subscription_id", subscriptionId);

          console.log(`[stripe-webhook] Subscription ${subscriptionId} marked unpaid`);
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Handler error";
    console.error(`[stripe-webhook] Error processing ${event.type}:`, message);
    // Return 200 to prevent Stripe from retrying (we log the error)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
