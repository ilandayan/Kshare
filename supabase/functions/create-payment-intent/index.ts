import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const IS_DEV = Deno.env.get("ENVIRONMENT") === "development";

const PROD_ORIGINS = [
  "https://k-share.fr",
  "https://www.k-share.fr",
];

const DEV_ORIGINS = [
  ...PROD_ORIGINS,
  "http://localhost:3000",
  "http://localhost:8081",
];

const ALLOWED_ORIGINS = IS_DEV ? DEV_ORIGINS : PROD_ORIGINS;

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: verify Supabase JWT
    const authHeader = req.headers.get("Authorization");
    console.log("[create-payment-intent] Auth header present:", !!authHeader, authHeader?.substring(0, 20));
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Init Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client (validates JWT)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client (bypasses RLS for writes)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    console.log("[create-payment-intent] Auth result:", user?.id, authError?.message);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", detail: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { basket_id, amount, quantity: reqQuantity, is_donation: isClientDonation } = await req.json() as {
      basket_id: string;
      amount?: number; // in cents — validated against DB price
      quantity?: number;
      is_donation?: boolean;
    };

    const quantity = reqQuantity && Number.isInteger(reqQuantity) && reqQuantity >= 1 && reqQuantity <= 99
      ? reqQuantity
      : 1;

    if (!basket_id) {
      return new Response(
        JSON.stringify({ error: "basket_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch basket + commerce info
    const { data: basket, error: basketError } = await adminClient
      .from("baskets")
      .select(
        `
        id, type, day, sold_price,
        quantity_total, quantity_reserved, quantity_sold,
        status, is_donation, pickup_start, pickup_end, commerce_id,
        commerces (
          id, name, stripe_account_id, commission_rate, subscription_plan, status
        )
      `,
      )
      .eq("id", basket_id)
      .single();

    if (basketError || !basket) {
      return new Response(JSON.stringify({ error: "Basket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate basket availability
    if (basket.status !== "published") {
      return new Response(
        JSON.stringify({ error: "Ce panier n'est plus disponible." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const remaining =
      basket.quantity_total - basket.quantity_reserved - basket.quantity_sold;
    if (remaining <= 0) {
      return new Response(
        JSON.stringify({ error: "Ce panier est épuisé." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (quantity > remaining) {
      return new Response(
        JSON.stringify({ error: `Quantité insuffisante — ${remaining} disponible(s).` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate commerce has Stripe Connect set up
    const commerce = basket.commerces as {
      id: string;
      name: string;
      stripe_account_id: string | null;
      commission_rate: number;
      subscription_plan: string | null;
      status: string;
    };

    if (!commerce.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "Ce commerce n'est pas encore configuré pour les paiements." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (commerce.status !== "validated") {
      return new Response(
        JSON.stringify({ error: "Ce commerce n'est pas encore validé." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Server-side amount calculation from DB price (never trust client) ──
    const SERVICE_FEE_PERCENT = 0.015;
    const SERVICE_FEE_FIXED_CENTS = 79; // 0.79€ — paniers normaux
    const DONATION_SERVICE_FEE_FIXED_CENTS = 25; // 0.25€ — frais réels Stripe pour dons

    // Plan-based commission rate (fallback to DB value then 18%)
    const PLAN_RATES: Record<string, number> = { starter: 18, pro: 12 };
    const commissionRate =
      PLAN_RATES[commerce.subscription_plan ?? "starter"] ??
      commerce.commission_rate ??
      18;

    let basketAmountInCents: number;
    let commissionInCents: number;
    let serviceFeeInCents: number;

    if (isClientDonation) {
      // Don client: prix = sold_price - commission, frais réels Stripe (1.5% + 0.25€)
      const commissionAmount = Math.round(basket.sold_price * quantity * 100 * (commissionRate / 100));
      const unitPriceCents = Math.round(basket.sold_price * 100) - Math.round(basket.sold_price * 100 * (commissionRate / 100));
      basketAmountInCents = unitPriceCents * quantity;
      commissionInCents = 0;
      serviceFeeInCents = Math.round(basketAmountInCents * SERVICE_FEE_PERCENT) + DONATION_SERVICE_FEE_FIXED_CENTS;
    } else {
      basketAmountInCents = Math.round(basket.sold_price * quantity * 100);
      commissionInCents = Math.round(basketAmountInCents * (commissionRate / 100));
      serviceFeeInCents = Math.round(basketAmountInCents * SERVICE_FEE_PERCENT) + SERVICE_FEE_FIXED_CENTS;
    }

    // If client sent an amount, validate it matches DB price (tolerance: 1 cent)
    if (amount !== undefined && !isClientDonation && Math.abs(amount - basketAmountInCents) > 1) {
      return new Response(
        JSON.stringify({ error: "Le montant ne correspond pas au prix du panier." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Client pays basket price + service fee
    const totalAmountInCents = basketAmountInCents + serviceFeeInCents;
    // Kshare keeps commission + service fee
    const applicationFee = commissionInCents + serviceFeeInCents;

    // Idempotency key for ledger deduplication
    const idempotencyKey = crypto.randomUUID();

    // Init Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeSecretKey);

    // ── Get or create Stripe Customer for this user ──
    // Check if user already has a stripe_customer_id in profiles
    const { data: profile } = await adminClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Create a new Stripe Customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Save it to profiles
      await adminClient
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);
    }

    // Create an ephemeral key for the customer (allows Payment Sheet to save cards)
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: stripeCustomerId },
      { apiVersion: "2024-12-18.acacia" },
    );

    // Create Stripe Payment Intent with Connect
    console.log("[create-payment-intent] Creating PI", {
      amount: totalAmountInCents,
      fee: applicationFee,
      destination: commerce.stripe_account_id,
      customer: stripeCustomerId,
    });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountInCents,
      currency: "eur",
      customer: stripeCustomerId,
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: commerce.stripe_account_id,
      },
      ...(isClientDonation ? { capture_method: "manual" as const } : {}),
      metadata: {
        basket_id,
        commerce_id: commerce.id,
        user_id: user.id,
        quantity: String(quantity),
        commission_rate: String(commissionRate),
        basket_amount: String(basketAmountInCents),
        commission_amount: String(commissionInCents),
        service_fee_amount: String(serviceFeeInCents),
        idempotency_key: idempotencyKey,
        source: "mobile",
        ...(isClientDonation ? { isDonation: "true" } : {}),
      },
      ...(isClientDonation ? {} : { setup_future_usage: "off_session" as const }),
      payment_method_types: ["card"],
    });

    // Generate 6-digit pickup token (cryptographically secure)
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const pickupToken = (100000 + (randomArray[0] % 900000)).toString();

    // Create order in Supabase (status: created, awaiting payment confirmation)
    const basketAmountEur = basketAmountInCents / 100;
    const commissionAmountEur = commissionInCents / 100;
    const serviceFeeAmountEur = serviceFeeInCents / 100;
    const netAmountEur = basketAmountEur - commissionAmountEur;

    // Compute donation expiration if applicable
    let donationExpiresAt: string | null = null;
    if (isClientDonation) {
      const now = new Date();
      const targetDate =
        basket.day === "tomorrow"
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const [h, m] = basket.pickup_end.split(":").map(Number);
      targetDate.setHours(h, m, 0, 0);
      donationExpiresAt = targetDate.toISOString();
    }

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        basket_id,
        client_id: user.id,
        commerce_id: commerce.id,
        quantity,
        total_amount: basketAmountEur,
        unit_price: basketAmountEur / quantity,
        commission_amount: commissionAmountEur,
        net_amount: netAmountEur,
        service_fee_amount: serviceFeeAmountEur,
        status: isClientDonation ? "pending_association" : "created",
        stripe_payment_intent_id: paymentIntent.id,
        is_donation: isClientDonation || (basket.is_donation ?? false),
        qr_code_token: isClientDonation ? null : pickupToken,
        pickup_start: basket.pickup_start,
        pickup_end: basket.pickup_end,
        pickup_date: basket.day,
        ...(donationExpiresAt ? { donation_expires_at: donationExpiresAt } : {}),
      })
      .select("id")
      .single();

    if (orderError || !order) {
      // Rollback: cancel the payment intent
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
      throw new Error("Failed to create order: " + orderError?.message);
    }

    // Reserve basket quantity atomically (prevents race conditions)
    const { data: reserved, error: reserveError } = await adminClient
      .rpc("reserve_basket_quantity", {
        p_basket_id: basket_id,
        p_quantity: quantity,
      });

    if (reserveError || reserved === false) {
      // Rollback: cancel the payment intent and order
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
      await adminClient.from("orders").delete().eq("id", order.id);
      return new Response(
        JSON.stringify({ error: "Ce panier vient d'être réservé par quelqu'un d'autre." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customerId: stripeCustomerId,
        orderId: order.id,
        pickupToken,
        basketAmountCents: basketAmountInCents,
        serviceFeeCents: serviceFeeInCents,
        totalAmountCents: totalAmountInCents,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const stripeError = err as { type?: string; code?: string; message?: string; statusCode?: number };
    const detail = {
      error: stripeError.message ?? "Internal server error",
      type: stripeError.type,
      code: stripeError.code,
      statusCode: stripeError.statusCode,
    };
    console.error("[create-payment-intent] ERROR", JSON.stringify(detail));
    return new Response(JSON.stringify(detail), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
