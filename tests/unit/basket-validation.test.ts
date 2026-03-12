import { describe, it, expect } from "vitest";

// Business rules for basket creation/validation

const BASKET_TYPES = ["bassari", "halavi", "parve", "shabbat", "mix"] as const;
type BasketType = (typeof BASKET_TYPES)[number];

const BASKET_LABELS: Record<BasketType, string> = {
  bassari: "Bassari",
  halavi: "Halavi",
  parve: "Parvé",
  shabbat: "Shabbat",
  mix: "Mix",
};

const MIN_PRICE = 5;
const MAX_PRICE = 50;
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 20;
const MIN_DISCOUNT_PERCENT = 40;

interface BasketInput {
  type: BasketType;
  originalPrice: number;
  soldPrice: number;
  quantity: number;
  pickupStart: string;
  pickupEnd: string;
}

function validateBasket(input: BasketInput): string[] {
  const errors: string[] = [];

  if (!BASKET_TYPES.includes(input.type)) {
    errors.push("Type de panier invalide");
  }

  if (input.soldPrice < MIN_PRICE) {
    errors.push(`Prix minimum: ${MIN_PRICE}€`);
  }

  if (input.soldPrice > MAX_PRICE) {
    errors.push(`Prix maximum: ${MAX_PRICE}€`);
  }

  if (input.quantity < MIN_QUANTITY || input.quantity > MAX_QUANTITY) {
    errors.push(`Quantite entre ${MIN_QUANTITY} et ${MAX_QUANTITY}`);
  }

  if (input.originalPrice > 0) {
    const discount = ((input.originalPrice - input.soldPrice) / input.originalPrice) * 100;
    if (discount < MIN_DISCOUNT_PERCENT) {
      errors.push(`Reduction minimale de ${MIN_DISCOUNT_PERCENT}% requise`);
    }
  }

  // Validate pickup times
  if (input.pickupStart >= input.pickupEnd) {
    errors.push("L'heure de fin doit etre apres l'heure de debut");
  }

  return errors;
}

describe("Basket validation", () => {
  const validBasket: BasketInput = {
    type: "bassari",
    originalPrice: 20,
    soldPrice: 10,
    quantity: 3,
    pickupStart: "14:00",
    pickupEnd: "17:00",
  };

  it("accepts a valid basket", () => {
    expect(validateBasket(validBasket)).toHaveLength(0);
  });

  it("rejects price below minimum", () => {
    const errors = validateBasket({ ...validBasket, soldPrice: 3 });
    expect(errors.some((e) => e.includes("minimum"))).toBe(true);
  });

  it("rejects price above maximum", () => {
    const errors = validateBasket({ ...validBasket, soldPrice: 60 });
    expect(errors.some((e) => e.includes("maximum"))).toBe(true);
  });

  it("rejects insufficient discount", () => {
    const errors = validateBasket({ ...validBasket, soldPrice: 18, originalPrice: 20 });
    expect(errors.some((e) => e.includes("40%"))).toBe(true);
  });

  it("accepts exact 40% discount", () => {
    const errors = validateBasket({ ...validBasket, soldPrice: 12, originalPrice: 20 });
    expect(errors).toHaveLength(0);
  });

  it("rejects quantity 0", () => {
    const errors = validateBasket({ ...validBasket, quantity: 0 });
    expect(errors.some((e) => e.includes("Quantite"))).toBe(true);
  });

  it("rejects quantity > 20", () => {
    const errors = validateBasket({ ...validBasket, quantity: 25 });
    expect(errors.some((e) => e.includes("Quantite"))).toBe(true);
  });

  it("rejects invalid pickup times", () => {
    const errors = validateBasket({ ...validBasket, pickupStart: "17:00", pickupEnd: "14:00" });
    expect(errors.some((e) => e.includes("fin"))).toBe(true);
  });
});

describe("Basket types", () => {
  it("all types have labels", () => {
    for (const type of BASKET_TYPES) {
      expect(BASKET_LABELS[type]).toBeDefined();
      expect(BASKET_LABELS[type].length).toBeGreaterThan(0);
    }
  });

  it("has exactly 5 types", () => {
    expect(BASKET_TYPES).toHaveLength(5);
  });
});
