import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, calculateCommission, calculateServiceFee, getCommissionRateForPlan } from "@/lib/stripe/client";
import { checkRateLimit, getClientIp, PAYMENT_RATE_LIMIT } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-log";
import { BASKET_MIN_PRICE, DONATION_SERVICE_FEE_FIXED, SERVICE_FEE_PERCENT, type SubscriptionPlanId } from "@/lib/constants";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

interface CheckoutRequestBody {
  basketId: string;
  quantity: number;
  isDonation?: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting — 5 requests/minute per IP
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`checkout:${ip}`, PAYMENT_RATE_LIMIT);
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

    // Vérifier que l'utilisateur a le rôle client
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "client") {
      return NextResponse.json({ error: "Accès réservé aux clients" }, { status: 403 });
    }

    let body: CheckoutRequestBody;
    try {
      body = (await request.json()) as CheckoutRequestBody;
    } catch {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const { basketId, quantity, isDonation: isClientDonation } = body;

    if (!basketId || typeof basketId !== "string") {
      return NextResponse.json({ error: "basketId requis" }, { status: 400 });
    }
    if (!quantity || typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json({ error: "quantity invalide" }, { status: 400 });
    }

    const { data: basket, error: basketError } = await supabase
      .from("baskets")
      .select(
        "id, sold_price, original_price, type, description, commerce_id, quantity_total, quantity_sold, quantity_reserved, status, pickup_start, pickup_end, pickup_date:day, is_donation, commerces(id, name, stripe_account_id, commission_rate, subscription_plan, email)"
      )
      .eq("id", basketId)
      .single();

    if (basketError || !basket) {
      return NextResponse.json({ error: "Panier introuvable" }, { status: 404 });
    }

    if (basket.status !== "published") {
      return NextResponse.json({ error: "Ce panier n'est plus disponible" }, { status: 400 });
    }

    const availableQty =
      basket.quantity_total - basket.quantity_sold - basket.quantity_reserved;
    if (quantity > availableQty) {
      return NextResponse.json(
        { error: `Quantité insuffisante — ${availableQty} disponible(s)` },
        { status: 400 }
      );
    }

    const commerce = basket.commerces as {
      id: string;
      name: string;
      stripe_account_id: string | null;
      commission_rate: number;
      subscription_plan: string | null;
      email: string;
    } | null;

    if (!commerce) {
      return NextResponse.json({ error: "Commerce introuvable" }, { status: 404 });
    }

    if (!commerce.stripe_account_id) {
      return NextResponse.json(
        { error: "Ce commerce n'a pas encore configuré son compte de paiement" },
        { status: 400 }
      );
    }

    // Safeguard: validate basket minimum price (already enforced at creation)
    if (!isClientDonation && basket.sold_price < BASKET_MIN_PRICE) {
      return NextResponse.json(
        { error: `Le prix minimum d'un panier est de ${BASKET_MIN_PRICE} €.` },
        { status: 400 }
      );
    }

    // Déterminer si c'est un don (commerçant ou client)
    const isBasketDonation = !!(basket as Record<string, unknown>).is_donation;

    // --- Price, commission & service fee calculations ---
    // service_fee = (basket_price * 1.5%) + 0.79€ — covers Stripe costs, paid by client, kept by Kshare
    // commission = basket_price * commission_rate% — Kshare revenue
    // application_fee_amount = commission + service_fee (total kept by Kshare)
    // Client pays: basket_price + service_fee (for regular purchases)

    let unitPrice: number; // basket price per unit (what commerce receives)
    let commissionInCents: number;
    let serviceFeeInCents: number;

    if (isClientDonation) {
      // Don client: prix = sold_price - commission Kshare, frais réels Stripe (1.5% + 0.25€)
      const planRate = getCommissionRateForPlan(
        (commerce.subscription_plan as SubscriptionPlanId) ?? "starter"
      );
      const { commission } = calculateCommission(basket.sold_price, planRate);
      unitPrice = Math.round((basket.sold_price - commission) * 100) / 100;
      commissionInCents = 0;
      const donationTotal = unitPrice * quantity;
      serviceFeeInCents = Math.round(
        (donationTotal * SERVICE_FEE_PERCENT + DONATION_SERVICE_FEE_FIXED) * 100
      );
    } else if (isBasketDonation) {
      unitPrice = basket.sold_price;
      commissionInCents = 0;
      serviceFeeInCents = 0;
    } else {
      unitPrice = basket.sold_price;
      const basketTotal = basket.sold_price * quantity;
      const planRate = getCommissionRateForPlan(
        (commerce.subscription_plan as SubscriptionPlanId) ?? "starter"
      );
      const { commission } = calculateCommission(basketTotal, planRate);
      commissionInCents = Math.round(commission * 100);
      const serviceFee = calculateServiceFee(basketTotal);
      serviceFeeInCents = Math.round(serviceFee * 100);
    }

    // application_fee = commission + service_fee (both kept by Kshare)
    const applicationFeeInCents = commissionInCents + serviceFeeInCents;
    const basketTotalInCents = Math.round(unitPrice * quantity * 100);
    // Client pays basket price + service fee
    const totalChargedInCents = basketTotalInCents + serviceFeeInCents;

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const basketTypeLabels: Record<string, string> = {
      bassari: "Panier Bassari",
      halavi: "Panier Halavi",
      parve: "Panier Parvé",
      shabbat: "Panier Shabbat",
      mix: "Panier Mix",
    };
    const basketLabel = basketTypeLabels[basket.type] ?? "Panier";

    // Build line items: basket + service fee (separate line)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: isClientDonation
              ? `${basketLabel} — Don pour une association`
              : `${basketLabel} — ${commerce.name}`,
            description: isClientDonation
              ? `Don solidaire via ${commerce.name}`
              : (basket.description ?? undefined),
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity,
      },
    ];

    // Add service fee as a separate line item (visible on Stripe Checkout)
    if (serviceFeeInCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Frais de service plateforme",
          },
          unit_amount: serviceFeeInCents,
        },
        quantity: 1,
      });
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: applicationFeeInCents,
        transfer_data: {
          destination: commerce.stripe_account_id,
        },
        ...(isClientDonation ? { capture_method: "manual" as const } : {}),
      },
      mode: "payment",
      metadata: {
        basketId,
        quantity: String(quantity),
        profileId: user.id,
        commerceId: commerce.id,
        basketAmount: String(basketTotalInCents),
        commissionAmount: String(commissionInCents),
        serviceFeeAmount: String(serviceFeeInCents),
        idempotencyKey: crypto.randomUUID(),
        ...(isClientDonation ? { isDonation: "true" } : {}),
      },
      success_url: isClientDonation
        ? `${baseUrl}/client/commandes?donation=1`
        : `${baseUrl}/client/commandes?success=1`,
      cancel_url: `${baseUrl}/client/paniers`,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    logAuditEvent({
      action: isClientDonation ? "payment.checkout_donation" : "payment.checkout_created",
      actor_id: user.id,
      ip,
      metadata: { basketId, quantity, commerceId: commerce.id, totalChargedInCents },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/checkout] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
