import { describe, it, expect } from "vitest";
import { montantsCommande, montantsCapture } from "@/lib/stripe/capture";

/**
 * Panier à 13,80 € : commission 18 %, frais de service 1,5 % + 0,79 €.
 * Le client règle donc 14,79 €, dont 3,47 € reviennent à Kshare.
 */
const commande = {
  id: "test",
  stripe_payment_intent_id: "pi_test",
  total_amount: 13.8,
  commission_amount: 2.48,
  service_fee_amount: 0.99,
  capture_status: "pending",
};

describe("montantsCommande", () => {
  it("autorise le panier majoré des frais de service", () => {
    expect(montantsCommande(commande).totalCents).toBe(1479);
  });

  it("agrège commission et frais de service dans la part Kshare", () => {
    expect(montantsCommande(commande).feeCents).toBe(347);
  });

  it("ne casse pas sur des montants absents", () => {
    const vide = { ...commande, total_amount: null, commission_amount: null, service_fee_amount: null };
    expect(montantsCommande(vide)).toEqual({ totalCents: 0, feeCents: 0 });
  });
});

describe("montantsCapture", () => {
  it("capture l'intégralité à ratio 1", () => {
    expect(montantsCapture(commande, 1)).toEqual({ captureCents: 1479, captureFeeCents: 347 });
  });

  it("réduit la commission dans la même proportion que la part du commerce", () => {
    const { captureCents, captureFeeCents } = montantsCapture(commande, 0.5);
    expect(captureCents).toBe(740);
    expect(captureFeeCents).toBe(174);

    // Le taux effectif de Kshare reste stable : c'est tout l'intérêt du
    // proportionnel, un taux qui s'envole sur un geste commercial serait
    // indéfendable auprès du commerce.
    const tauxPlein = 347 / 1479;
    const tauxPartiel = captureFeeCents / captureCents;
    expect(Math.abs(tauxPartiel - tauxPlein)).toBeLessThan(0.005);
  });

  it("ne laisse jamais la commission dépasser le montant capturé", () => {
    // Cas limite : un panier offert dont seuls les frais de service subsistent.
    const presqueGratuit = { ...commande, total_amount: 0.5, commission_amount: 0.09, service_fee_amount: 0.79 };
    for (const ratio of [1, 0.75, 0.5, 0.25, 0.1]) {
      const { captureCents, captureFeeCents } = montantsCapture(presqueGratuit, ratio);
      expect(captureFeeCents).toBeLessThanOrEqual(captureCents);
    }
  });

  it("arrondit au centime sans jamais produire de fraction", () => {
    const { captureCents, captureFeeCents } = montantsCapture(commande, 0.33);
    expect(Number.isInteger(captureCents)).toBe(true);
    expect(Number.isInteger(captureFeeCents)).toBe(true);
  });
});
