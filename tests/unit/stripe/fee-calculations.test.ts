import { describe, it, expect } from "vitest";
import {
  calculateCommission,
  calculateServiceFee,
  getCommissionRateForPlan,
  validateBasketPrice,
} from "@/lib/stripe/client";

describe("calculateServiceFee", () => {
  it("returns 0.79€ + 1.5% for a standard basket", () => {
    // 10€ basket: 10 * 0.015 + 0.79 = 0.15 + 0.79 = 0.94
    expect(calculateServiceFee(10)).toBe(0.94);
  });

  it("returns correct fee for minimum basket price (5€)", () => {
    // 5€ basket: 5 * 0.015 + 0.79 = 0.075 + 0.79 = 0.865 → 0.87
    expect(calculateServiceFee(5)).toBe(0.87);
  });

  it("returns correct fee for larger baskets", () => {
    // 20€ basket: 20 * 0.015 + 0.79 = 0.30 + 0.79 = 1.09
    expect(calculateServiceFee(20)).toBe(1.09);
  });

  it("returns fixed fee for 0€ basket", () => {
    expect(calculateServiceFee(0)).toBe(0.79);
  });
});

describe("calculateCommission", () => {
  it("calculates 18% commission (starter plan)", () => {
    const result = calculateCommission(100, 18);
    expect(result.commission).toBe(18);
    expect(result.net).toBe(82);
  });

  it("calculates 12% commission (pro plan)", () => {
    const result = calculateCommission(100, 12);
    expect(result.commission).toBe(12);
    expect(result.net).toBe(88);
  });

  it("handles small amounts correctly", () => {
    const result = calculateCommission(5, 18);
    expect(result.commission).toBe(0.9);
    expect(result.net).toBe(4.1);
  });

  it("handles zero amount", () => {
    const result = calculateCommission(0, 18);
    expect(result.commission).toBe(0);
    expect(result.net).toBe(0);
  });
});

describe("getCommissionRateForPlan", () => {
  it("returns 18 for starter plan", () => {
    expect(getCommissionRateForPlan("starter")).toBe(18);
  });

  it("returns 12 for pro plan", () => {
    expect(getCommissionRateForPlan("pro")).toBe(12);
  });
});

describe("validateBasketPrice", () => {
  it("returns null for valid prices", () => {
    // 10€ sold, 20€ original = 50% discount, >= 40% required
    expect(validateBasketPrice(10, 20, false)).toBeNull();
  });

  it("rejects prices below minimum", () => {
    const error = validateBasketPrice(3, 10, false);
    expect(error).toContain("5 €");
  });

  it("rejects insufficient discount", () => {
    // 18€ sold, 20€ original = 10% discount, need 40%
    const error = validateBasketPrice(18, 20, false);
    expect(error).toContain("40%");
  });

  it("accepts exact minimum discount", () => {
    // 12€ sold, 20€ original = 40% discount exactly
    expect(validateBasketPrice(12, 20, false)).toBeNull();
  });

  it("skips validation for donations", () => {
    expect(validateBasketPrice(1, 2, true)).toBeNull();
  });

  it("accepts minimum price exactly", () => {
    expect(validateBasketPrice(5, 20, false)).toBeNull();
  });
});
