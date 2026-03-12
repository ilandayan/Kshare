import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getCommissionRateForPlan } from "@/lib/stripe/client";
import { checkRateLimit, getClientIp, PAYMENT_RATE_LIMIT } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-log";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting — 5 requests/minute per IP
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`sub-create:${ip}`, PAYMENT_RATE_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer dans quelques instants." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
        }
      );
    }

    // Parse plan from request body
    let plan: SubscriptionPlanId = "starter";
    try {
      const body = await request.json();
      if (body.plan === "starter" || body.plan === "pro") {
        plan = body.plan;
      }
    } catch {
      // Default to starter if no body
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier le rôle commerce
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "commerce") {
      return NextResponse.json({ error: "Accès réservé aux commerçants" }, { status: 403 });
    }

    const { data: commerce, error: commerceError } = await supabase
      .from("commerces")
      .select("id, name, email, stripe_customer_id, subscription_status")
      .eq("profile_id", user.id)
      .single();

    if (commerceError || !commerce) {
      return NextResponse.json({ error: "Commerce introuvable" }, { status: 404 });
    }

    const commissionRate = getCommissionRateForPlan(plan);
    const planConfig = SUBSCRIPTION_PLANS[plan];

    // ── Starter plan: no Stripe subscription needed ──
    if (plan === "starter") {
      await supabase
        .from("commerces")
        .update({
          subscription_plan: "starter",
          commission_rate: commissionRate,
          subscription_status: "active",
        })
        .eq("id", commerce.id);

      // Upsert subscription record
      await supabase.from("subscriptions").upsert(
        {
          commerce_id: commerce.id,
          plan: "starter",
          status: "active",
          monthly_price: 0,
          commission_rate: commissionRate,
        },
        { onConflict: "commerce_id" }
      );

      logAuditEvent({
        action: "payment.plan_changed",
        actor_id: user.id,
        ip,
        metadata: { commerceId: commerce.id, plan: "starter" },
      });

      return NextResponse.json({ success: true, plan: "starter" });
    }

    // ── Pro plan: Stripe Checkout Session ──
    const stripe = getStripe();
    let customerId = commerce.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: commerce.email,
        name: commerce.name,
        metadata: {
          commerce_id: commerce.id,
          profile_id: user.id,
        },
      });
      customerId = customer.id;

      await supabase
        .from("commerces")
        .update({ stripe_customer_id: customerId })
        .eq("id", commerce.id);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["sepa_debit", "card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Abonnement Kshare ${planConfig.name}`,
              description: `${planConfig.description} — ${planConfig.commissionRate}% de commission`,
            },
            unit_amount: planConfig.monthlyPrice * 100,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          commerce_id: commerce.id,
          profile_id: user.id,
          plan: "pro",
        },
      },
      success_url: `${siteUrl}/shop/abonnement?success=true`,
      cancel_url: `${siteUrl}/shop/abonnement?canceled=true`,
      metadata: {
        commerce_id: commerce.id,
        profile_id: user.id,
        plan: "pro",
      },
    });

    logAuditEvent({
      action: "payment.subscription_created",
      actor_id: user.id,
      ip,
      metadata: { commerceId: commerce.id, plan: "pro" },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/subscription/create] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
