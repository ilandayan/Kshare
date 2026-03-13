import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getCommissionRateForPlan } from "@/lib/stripe/client";
import { checkRateLimit, getClientIp, PAYMENT_RATE_LIMIT } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-log";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/subscription/change-plan
 * Body: { plan: 'starter' | 'pro' }
 *
 * Rules:
 * - 1 plan change per year (after initial choice at signup)
 * - Change takes effect next month (pending_plan + pending_plan_effective_at)
 * - Starter → Pro: creates Stripe Checkout, effective on subscription start
 * - Pro → Starter: cancels Stripe sub at period end, plan switches when period ends
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`plan-change:${ip}`, PAYMENT_RATE_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer dans quelques instants." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const newPlan = body.plan as SubscriptionPlanId;
    if (newPlan !== "starter" && newPlan !== "pro") {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

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
      .select("id, name, email, stripe_customer_id, subscription_plan, last_plan_change_at")
      .eq("profile_id", user.id)
      .single();

    if (commerceError || !commerce) {
      return NextResponse.json({ error: "Commerce introuvable" }, { status: 404 });
    }

    // Check same plan
    if (commerce.subscription_plan === newPlan) {
      return NextResponse.json({ error: "Vous êtes déjà sur ce plan." }, { status: 400 });
    }

    // Check 1 change per year
    if (commerce.last_plan_change_at) {
      const lastChange = new Date(commerce.last_plan_change_at);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (lastChange > oneYearAgo) {
        const nextAllowedDate = new Date(lastChange);
        nextAllowedDate.setFullYear(nextAllowedDate.getFullYear() + 1);
        const formattedDate = nextAllowedDate.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        return NextResponse.json(
          { error: `Vous ne pouvez changer de plan qu'une fois par an. Prochain changement possible le ${formattedDate}.` },
          { status: 400 }
        );
      }
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, current_period_end")
      .eq("commerce_id", commerce.id)
      .single();

    // ── Starter → Pro ──
    if (newPlan === "pro") {
      const stripe = getStripe();
      let customerId = commerce.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: commerce.email,
          name: commerce.name,
          metadata: { commerce_id: commerce.id, profile_id: user.id },
        });
        customerId = customer.id;
        await supabase
          .from("commerces")
          .update({ stripe_customer_id: customerId })
          .eq("id", commerce.id);
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const planConfig = SUBSCRIPTION_PLANS.pro;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["sepa_debit"],
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
            is_plan_change: "true",
          },
        },
        success_url: `${siteUrl}/shop/abonnement?success=true&plan=pro`,
        cancel_url: `${siteUrl}/shop/abonnement?canceled=true`,
        metadata: {
          commerce_id: commerce.id,
          profile_id: user.id,
          plan: "pro",
          is_plan_change: "true",
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // ── Pro → Starter ──
    if (subscription?.stripe_subscription_id) {
      const stripe = getStripe();

      // Cancel at end of current billing period
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      // Record pending change — will take effect when subscription period ends
      const effectiveAt = subscription.current_period_end
        ? new Date(subscription.current_period_end).toISOString()
        : new Date().toISOString();

      await supabase
        .from("subscriptions")
        .update({
          pending_plan: "starter",
          pending_plan_effective_at: effectiveAt,
        })
        .eq("commerce_id", commerce.id);
    }

    // Record plan change date
    await supabase
      .from("commerces")
      .update({ last_plan_change_at: new Date().toISOString() })
      .eq("id", commerce.id);

    logAuditEvent({
      action: "payment.plan_changed",
      actor_id: user.id,
      ip,
      metadata: {
        commerceId: commerce.id,
        from: commerce.subscription_plan,
        to: newPlan,
        effectiveNextMonth: true,
      },
    });

    return NextResponse.json({
      success: true,
      pendingPlan: newPlan,
      message: "Votre changement de plan prendra effet le mois prochain.",
    });
  } catch (error) {
    console.error("[stripe/subscription/change-plan] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
