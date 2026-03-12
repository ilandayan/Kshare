import { describe, it, expect } from "vitest";

// Order status flow validation - tests the business rules
// These mirror the checks in the server actions

const VALID_TRANSITIONS: Record<string, string[]> = {
  created:            ["paid", "cancelled_admin"],
  paid:               ["ready_for_pickup", "picked_up", "no_show", "refunded", "cancelled_admin"],
  ready_for_pickup:   ["picked_up", "no_show", "cancelled_admin"],
  picked_up:          [], // terminal state
  no_show:            ["refunded"],
  refunded:           [], // terminal state
  cancelled_admin:    [], // terminal state
  pending_association:["paid", "expired", "cancelled_admin"],
  expired:            [], // terminal state
};

function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe("Order status transitions", () => {
  it("paid → ready_for_pickup is valid", () => {
    expect(canTransition("paid", "ready_for_pickup")).toBe(true);
  });

  it("paid → picked_up is valid (direct pickup)", () => {
    expect(canTransition("paid", "picked_up")).toBe(true);
  });

  it("ready_for_pickup → picked_up is valid", () => {
    expect(canTransition("ready_for_pickup", "picked_up")).toBe(true);
  });

  it("picked_up → anything is invalid (terminal)", () => {
    expect(canTransition("picked_up", "paid")).toBe(false);
    expect(canTransition("picked_up", "refunded")).toBe(false);
    expect(canTransition("picked_up", "no_show")).toBe(false);
  });

  it("created → picked_up is invalid (must be paid first)", () => {
    expect(canTransition("created", "picked_up")).toBe(false);
  });

  it("no_show → refunded is valid", () => {
    expect(canTransition("no_show", "refunded")).toBe(true);
  });

  it("refunded is terminal", () => {
    expect(canTransition("refunded", "paid")).toBe(false);
    expect(canTransition("refunded", "picked_up")).toBe(false);
  });

  it("ready_for_pickup → no_show is valid", () => {
    expect(canTransition("ready_for_pickup", "no_show")).toBe(true);
  });

  it("cancelled_admin is terminal", () => {
    expect(canTransition("cancelled_admin", "paid")).toBe(false);
  });
});

describe("Order number formatting", () => {
  function formatOrderNumber(id: string, createdAt: string): string {
    const year = new Date(createdAt).getFullYear();
    const short = id.replace(/-/g, "").slice(-4).toUpperCase();
    return `CMD-${year}-${short}`;
  }

  it("formats order number correctly", () => {
    const result = formatOrderNumber("a1b2c3d4-e5f6-7890-abcd-ef1234567890", "2026-03-12T10:00:00Z");
    expect(result).toBe("CMD-2026-7890");
  });

  it("uses correct year", () => {
    const result = formatOrderNumber("abc", "2025-01-01T00:00:00Z");
    expect(result).toMatch(/^CMD-2025-/);
  });
});

describe("Pickup code validation", () => {
  function isValidPickupCode(code: string): boolean {
    return /^\d{6}$/.test(code.trim());
  }

  it("accepts 6-digit codes", () => {
    expect(isValidPickupCode("847291")).toBe(true);
    expect(isValidPickupCode("100000")).toBe(true);
    expect(isValidPickupCode("999999")).toBe(true);
  });

  it("rejects short codes", () => {
    expect(isValidPickupCode("1234")).toBe(false);
    expect(isValidPickupCode("12345")).toBe(false);
  });

  it("rejects non-numeric codes", () => {
    expect(isValidPickupCode("abcdef")).toBe(false);
    expect(isValidPickupCode("12ab56")).toBe(false);
  });

  it("handles whitespace", () => {
    expect(isValidPickupCode(" 847291 ")).toBe(true);
  });
});

describe("Commission calculations for orders", () => {
  const COMMISSION_RATE_STARTER = 18;
  const COMMISSION_RATE_PRO = 12;
  const SUBSCRIPTION_MONTHLY = 30;

  it("starter plan: 18% of 10€ = 1.80€", () => {
    const commission = Math.round(10 * (COMMISSION_RATE_STARTER / 100) * 100) / 100;
    expect(commission).toBe(1.8);
  });

  it("pro plan: 12% of 10€ = 1.20€", () => {
    const commission = Math.round(10 * (COMMISSION_RATE_PRO / 100) * 100) / 100;
    expect(commission).toBe(1.2);
  });

  it("subscription is 30€/month", () => {
    expect(SUBSCRIPTION_MONTHLY).toBe(30);
  });

  it("net amount = total - commission", () => {
    const total = 25;
    const commission = total * (COMMISSION_RATE_STARTER / 100);
    const net = total - commission;
    expect(net).toBe(20.5);
  });
});
