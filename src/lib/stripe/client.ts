import Stripe from "stripe";

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

// Commission calculation (pure function, usable anywhere)
export function calculateCommission(
  amount: number,
  commissionRate: number
): { commission: number; net: number } {
  const commission = Math.round(amount * (commissionRate / 100) * 100) / 100;
  const net = Math.round((amount - commission) * 100) / 100;
  return { commission, net };
}
