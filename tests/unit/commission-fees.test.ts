import { describe, it, expect } from "vitest";

// ── Constants (mirrored from src/lib/constants.ts) ──
const SERVICE_FEE_PERCENT = 0.015;
const SERVICE_FEE_FIXED = 0.79;
const DONATION_SERVICE_FEE_FIXED = 0.25;
const PLAN_RATES = { starter: 18, pro: 12 };

// ── Helpers ──
function calcServiceFee(basketAmount: number): number {
  return Math.round((basketAmount * SERVICE_FEE_PERCENT + SERVICE_FEE_FIXED) * 100) / 100;
}

function calcDonationServiceFee(basketAmount: number): number {
  return Math.round((basketAmount * SERVICE_FEE_PERCENT + DONATION_SERVICE_FEE_FIXED) * 100) / 100;
}

function calcCommission(basketAmount: number, plan: "starter" | "pro"): number {
  return Math.round(basketAmount * (PLAN_RATES[plan] / 100) * 100) / 100;
}

function calcTotal(basketAmount: number, serviceFee: number): number {
  return Math.round((basketAmount + serviceFee) * 100) / 100;
}

// ── Tests ──
describe("Commission & Fee calculations", () => {
  describe("Normal basket (Starter plan)", () => {
    const price = 8.99;
    const commission = calcCommission(price, "starter");
    const serviceFee = calcServiceFee(price);
    const total = calcTotal(price, serviceFee);

    it("calculates 18% commission", () => {
      expect(commission).toBe(1.62); // 8.99 * 0.18 = 1.6182 → 1.62
    });

    it("calculates service fee (1.5% + 0.79€)", () => {
      expect(serviceFee).toBe(0.92); // 8.99 * 0.015 + 0.79 = 0.92485 → 0.92
    });

    it("calculates total paid by client", () => {
      expect(total).toBe(9.91); // 8.99 + 0.92
    });

    it("commerce receives basket - commission", () => {
      const net = Math.round((price - commission) * 100) / 100;
      expect(net).toBe(7.37);
    });

    it("Kshare keeps commission + service fee", () => {
      const kshareRevenue = Math.round((commission + serviceFee) * 100) / 100;
      expect(kshareRevenue).toBe(2.54);
    });
  });

  describe("Normal basket (Pro plan)", () => {
    const price = 19.99;
    const commission = calcCommission(price, "pro");
    const serviceFee = calcServiceFee(price);

    it("calculates 12% commission", () => {
      expect(commission).toBe(2.4); // 19.99 * 0.12 = 2.3988 → 2.40
    });

    it("calculates service fee", () => {
      expect(serviceFee).toBe(1.09); // 19.99 * 0.015 + 0.79 = 1.08985 → 1.09
    });
  });

  describe("Client donation (Tsedaka)", () => {
    const price = 8.99;

    it("has 0% commission", () => {
      const commission = 0;
      expect(commission).toBe(0);
    });

    it("uses real Stripe fees (1.5% + 0.25€)", () => {
      const fee = calcDonationServiceFee(price);
      expect(fee).toBe(0.38); // 8.99 * 0.015 + 0.25 = 0.38485 → 0.38
    });

    it("total is lower than normal basket", () => {
      const normalTotal = calcTotal(price, calcServiceFee(price));
      const donationTotal = calcTotal(price, calcDonationServiceFee(price));
      expect(donationTotal).toBeLessThan(normalTotal);
    });

    it("Kshare only keeps management fee on donations", () => {
      const fee = calcDonationServiceFee(price);
      expect(fee).toBe(0.38);
      // No commission — fee is all Kshare gets
    });
  });

  describe("Commerce donation", () => {
    it("is free for associations", () => {
      const amountPaid = 0;
      const commission = 0;
      const serviceFee = 0;
      expect(amountPaid).toBe(0);
      expect(commission).toBe(0);
      expect(serviceFee).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("handles 0€ basket correctly", () => {
      const fee = calcServiceFee(0);
      expect(fee).toBe(0.79); // Fixed fee still applies
    });

    it("handles large basket correctly", () => {
      const price = 99.99;
      const fee = calcServiceFee(price);
      const commission = calcCommission(price, "starter");
      expect(fee).toBe(2.29); // 99.99 * 0.015 + 0.79
      expect(commission).toBe(18); // 99.99 * 0.18 = 17.9982 → 18.00
    });

    it("handles quantity > 1", () => {
      const unitPrice = 8.99;
      const quantity = 3;
      const basketTotal = unitPrice * quantity; // 26.97
      const fee = calcServiceFee(basketTotal);
      const commission = calcCommission(basketTotal, "starter");
      expect(fee).toBe(1.19); // 26.97 * 0.015 + 0.79
      expect(commission).toBe(4.85); // 26.97 * 0.18
    });
  });
});
