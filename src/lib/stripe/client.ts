import Stripe from "stripe";
import {
  SUBSCRIPTION_PLANS,
  SERVICE_FEE_FIXED,
  SERVICE_FEE_PERCENT,
  DONATION_SERVICE_FEE_FIXED,
  BASKET_MIN_PRICE,
  BASKET_MIN_DISCOUNT,
  type SubscriptionPlanId,
} from "@/lib/constants";

// Lazy initialization — Stripe client only instantiated when used server-side
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// ── Commission ────────────────────────────────────────────────

/** Pure commission calculation. */
export function calculateCommission(
  amount: number,
  commissionRate: number
): { commission: number; net: number } {
  const commission = Math.round(amount * (commissionRate / 100) * 100) / 100;
  const net = Math.round((amount - commission) * 100) / 100;
  return { commission, net };
}

/** Get commission rate for a subscription plan. */
export function getCommissionRateForPlan(plan: SubscriptionPlanId): number {
  return SUBSCRIPTION_PLANS[plan].commissionRate;
}

// ── Service Fee ───────────────────────────────────────────────

/**
 * Service fee to cover Stripe costs (paid by client, kept by Kshare).
 * Normal: basketPrice * 1.5% + 0.79€
 * Donation: basketPrice * 1.5% + 0.25€ (frais réels Stripe)
 */
export function calculateServiceFee(basketPrice: number, isDonation = false): number {
  const fixedFee = isDonation ? DONATION_SERVICE_FEE_FIXED : SERVICE_FEE_FIXED;
  return Math.round((basketPrice * SERVICE_FEE_PERCENT + fixedFee) * 100) / 100;
}

// ── Basket Validation ─────────────────────────────────────────

/**
 * Validate basket pricing constraints.
 * Returns null if valid, error message if invalid.
 */
export function validateBasketPrice(
  soldPrice: number,
  originalPrice: number,
  isDonation: boolean
): string | null {
  if (isDonation) return null;

  if (soldPrice < BASKET_MIN_PRICE) {
    return `Le prix minimum d'un panier est de ${BASKET_MIN_PRICE} €.`;
  }

  const maxSoldPrice = originalPrice * (1 - BASKET_MIN_DISCOUNT);
  if (soldPrice > maxSoldPrice) {
    return `La réduction doit être d'au moins ${BASKET_MIN_DISCOUNT * 100}%. Prix maximum : ${maxSoldPrice.toFixed(2)} €.`;
  }

  return null;
}
