import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const ALLOWED_ORIGINS = [
  "https://k-share.fr",
  "https://www.k-share.fr",
  "http://localhost:3000",
  "http://localhost:8081",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
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
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { basket_id, amount } = await req.json() as {
      basket_id: string;
      amount: number; // in cents
    };

    if (!basket_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "basket_id and amount are required" }),
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

    // ── Fee calculations ──
    // Plan-based commission rate (fallback to DB value then 18%)
    const PLAN_RATES: Record<string, number> = { starter: 18, pro: 12 };
    const commissionRate =
      PLAN_RATES[commerce.subscription_plan ?? "starter"] ??
      commerce.commission_rate ??
      18;
    const commissionInCents = Math.round(amount * (commissionRate / 100));

    // Service fee: 1.5% + 0.79€ (paid by client, kept by Kshare)
    const SERVICE_FEE_PERCENT = 0.015;
    const SERVICE_FEE_FIXED_CENTS = 79;
    const serviceFeeInCents =
      Math.round(amount * SERVICE_FEE_PERCENT) + SERVICE_FEE_FIXED_CENTS;

    // Client pays basket price + service fee
    const totalAmountInCents = amount + serviceFeeInCents;
    // Kshare keeps commission + service fee
    const applicationFee = commissionInCents + serviceFeeInCents;

    // Idempotency key for ledger deduplication
    const idempotencyKey = crypto.randomUUID();

    // Init Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-02-25",
    });

    // Create Stripe Payment Intent with Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountInCents,
      currency: "eur",
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: commerce.stripe_account_id,
      },
      metadata: {
        basket_id,
        commerce_id: commerce.id,
        user_id: user.id,
        commission_rate: String(commissionRate),
        basket_amount: String(amount),
        commission_amount: String(commissionInCents),
        service_fee_amount: String(serviceFeeInCents),
        idempotency_key: idempotencyKey,
      },
      automatic_payment_methods: { enabled: true },
    });

    // Generate 6-digit pickup token
    const pickupToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Create order in Supabase (status: created, awaiting payment confirmation)
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        basket_id,
        client_id: user.id,
        quantity: 1,
        total_amount: totalAmountInCents / 100, // store in euros (basket + service fee)
        status: "created",
        stripe_payment_intent_id: paymentIntent.id,
        is_donation: basket.is_donation ?? false,
        qr_code: pickupToken,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      // Rollback: cancel the payment intent
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
      throw new Error("Failed to create order: " + orderError?.message);
    }

    // Reserve basket quantity optimistically
    await adminClient
      .from("baskets")
      .update({ quantity_reserved: basket.quantity_reserved + 1 })
      .eq("id", basket_id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        pickupToken,
        basketAmountCents: amount,
        serviceFeeCents: serviceFeeInCents,
        totalAmountCents: totalAmountInCents,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[create-payment-intent]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
