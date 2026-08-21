import { describe, it, expect } from "vitest";
import { montantsCommande, montantsCapture, decisionCapture } from "@/lib/stripe/capture";

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

/**
 * Quand encaisser : la confirmation du client ouvre un délai de grâce, la fin
 * du créneau déclenche le no-show. Le doute profite toujours au client.
 */
const MAINTENANT = new Date("2026-08-20T15:00:00Z").getTime();
const HEURE = 60 * 60 * 1000;

const enAttente = {
  status: "paid",
  picked_up_at: null,
  // 20 août : Paris est à UTC+2, le créneau se ferme donc à 16 h UTC.
  pickup_date: "2026-08-20",
  pickup_end: "18:00",
};

describe("decisionCapture", () => {
  it("patiente pendant les deux heures qui suivent la confirmation", () => {
    const commande = {
      ...enAttente,
      status: "picked_up",
      picked_up_at: new Date(MAINTENANT - HEURE).toISOString(),
    };
    expect(decisionCapture(commande, MAINTENANT)).toBe("grace");
  });

  it("encaisse une fois le délai de grâce écoulé", () => {
    const commande = {
      ...enAttente,
      status: "picked_up",
      picked_up_at: new Date(MAINTENANT - 3 * HEURE).toISOString(),
    };
    expect(decisionCapture(commande, MAINTENANT)).toBe("capturer");
  });

  it("n'encaisse pas avant la fin du créneau si personne n'est venu", () => {
    // 15 h UTC, soit 17 h à Paris : le créneau court jusqu'à 18 h.
    expect(decisionCapture(enAttente, MAINTENANT)).toBe("attendre");
  });

  it("laisse une demi-heure au retardataire avant de le déclarer absent", () => {
    // Créneau clos à 16 h UTC ; à 16 h 20 le client peut encore confirmer.
    const vingtMinutesApres = MAINTENANT + HEURE + 20 * 60 * 1000;
    expect(decisionCapture(enAttente, vingtMinutesApres)).toBe("attendre");
  });

  it("constate le no-show passé la tolérance, sans attendre la nuit", () => {
    const apresLeCreneau = MAINTENANT + 2 * HEURE; // 17 h UTC, 19 h à Paris
    expect(decisionCapture(enAttente, apresLeCreneau)).toBe("no_show");
  });

  it("s'en remet au créneau quand l'horodatage de retrait manque", () => {
    const sansHorodatage = { ...enAttente, status: "picked_up" };
    expect(decisionCapture(sansHorodatage, MAINTENANT)).toBe("attendre");
    expect(decisionCapture(sansHorodatage, MAINTENANT + 2 * HEURE)).toBe("capturer");
  });

  it("patiente plutôt que d'encaisser sur une date inexploitable", () => {
    for (const pickup_date of ["today", "tomorrow", null]) {
      expect(decisionCapture({ ...enAttente, pickup_date }, MAINTENANT)).toBe("attendre");
    }
    expect(decisionCapture({ ...enAttente, pickup_end: null }, MAINTENANT)).toBe("attendre");
  });

  it("ne se laisse pas berner par un horodatage illisible", () => {
    const illisible = { ...enAttente, status: "picked_up", picked_up_at: "jamais" };
    // Sans grâce mesurable, on retombe sur le créneau — jamais sur une capture.
    expect(decisionCapture(illisible, MAINTENANT)).toBe("attendre");
  });
});
