import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { checkRateLimit, getClientIp, PAYMENT_RATE_LIMIT } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-log";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting — 5 requests/minute per IP
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`sub-cancel:${ip}`, PAYMENT_RATE_LIMIT);
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

    // Vérifier le rôle commerce
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "commerce") {
      return NextResponse.json({ error: "Accès réservé aux commerçants" }, { status: 403 });
    }

    // Get commerce + subscription info
    const { data: commerce, error: commerceError } = await supabase
      .from("commerces")
      .select("id, stripe_customer_id")
      .eq("profile_id", user.id)
      .single();

    if (commerceError || !commerce) {
      return NextResponse.json({ error: "Commerce introuvable" }, { status: 404 });
    }

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("commerce_id", commerce.id)
      .single();

    if (subError || !subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Aucun abonnement actif trouve" },
        { status: 404 }
      );
    }

    const stripe = getStripe();

    // Cancel Stripe subscription (Pro → Starter downgrade)
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id, {
      prorate: false,
    });

    // Downgrade to Starter plan instead of fully suspending
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

    logAuditEvent({
      action: "payment.plan_changed",
      actor_id: user.id,
      ip,
      metadata: { commerceId: commerce.id, from: "pro", to: "starter" },
    });

    return NextResponse.json({ success: true, plan: "starter" });
  } catch (error) {
    console.error("[stripe/subscription/cancel] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de l'abonnement" },
      { status: 500 }
    );
  }
}
