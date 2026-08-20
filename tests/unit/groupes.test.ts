import { describe, it, expect } from "vitest";
import {
  resoudreTaux,
  prochainPalier,
  periodeSuivante,
  referenceRecap,
  PALIERS_DEFAUT,
  TAUX_BASE,
  type Palier,
} from "@/lib/groupes";

describe("resoudreTaux", () => {
  it("applique le taux de base sous le premier seuil", () => {
    expect(resoudreTaux(0)).toBe(18);
    expect(resoudreTaux(2999.99)).toBe(18);
  });

  it("fait profiter la borne au commerce", () => {
    // « à partir de 3 000 € » : le seuil atteint pile donne déjà le taux réduit.
    expect(resoudreTaux(3000)).toBe(16);
    expect(resoudreTaux(6000)).toBe(14);
    expect(resoudreTaux(15000)).toBe(12);
  });

  it("tient le meilleur taux au-delà du dernier palier", () => {
    expect(resoudreTaux(50000)).toBe(12);
  });

  it("correspond bien à 5 paniers par jour et par magasin", () => {
    // 15 magasins x 5 paniers x 25 jours x 8 € : c'est la promesse faite au réseau.
    expect(resoudreTaux(15 * 5 * 25 * 8)).toBe(12);
    // Un panier de moins par jour et par magasin, et le palier n'est pas atteint.
    expect(resoudreTaux(15 * 4 * 25 * 8)).toBe(14);
  });

  it("accepte une grille désordonnée", () => {
    const desordre: Palier[] = [
      { seuil: 15000, taux: 12 },
      { seuil: 0, taux: 18 },
      { seuil: 6000, taux: 14 },
    ];
    expect(resoudreTaux(7000, desordre)).toBe(14);
  });

  it("retombe sur le taux de base plutôt que d'inventer une remise", () => {
    expect(resoudreTaux(50000, [])).toBe(TAUX_BASE);
    expect(resoudreTaux(50000, null)).toBe(TAUX_BASE);
    // Valeurs aberrantes saisies à la main : elles sont écartées.
    expect(resoudreTaux(50000, [{ seuil: -1, taux: 3 }] as Palier[])).toBe(TAUX_BASE);
    expect(resoudreTaux(50000, [{ seuil: 0, taux: 250 }] as Palier[])).toBe(TAUX_BASE);
  });

  it("ne récompense pas un chiffre d'affaires impossible", () => {
    expect(resoudreTaux(-100)).toBe(TAUX_BASE);
    expect(resoudreTaux(Number.NaN)).toBe(TAUX_BASE);
  });

  it("n'accorde aucune remise si la grille ne couvre pas les petits volumes", () => {
    const sansPlancher: Palier[] = [{ seuil: 10000, taux: 12 }];
    expect(resoudreTaux(500, sansPlancher)).toBe(TAUX_BASE);
    expect(resoudreTaux(10000, sansPlancher)).toBe(12);
  });
});

describe("prochainPalier", () => {
  it("indique ce qu'il reste à vendre", () => {
    expect(prochainPalier(2000)).toEqual({ taux: 16, seuil: 3000, manque: 1000 });
    expect(prochainPalier(14000)).toEqual({ taux: 12, seuil: 15000, manque: 1000 });
  });

  it("ne promet rien quand le meilleur taux est atteint", () => {
    expect(prochainPalier(15000)).toBeNull();
    expect(prochainPalier(99999)).toBeNull();
  });

  it("ignore un palier supérieur qui ne serait pas plus avantageux", () => {
    // Grille mal saisie : le palier du dessus est moins bon, il ne doit pas
    // etre presente comme un objectif.
    const incoherente: Palier[] = [
      { seuil: 0, taux: 12 },
      { seuil: 5000, taux: 16 },
    ];
    expect(prochainPalier(1000, incoherente)).toBeNull();
  });

  it("arrondit au centime", () => {
    expect(prochainPalier(2999.994)?.manque).toBe(0.01);
  });
});

describe("periodeSuivante", () => {
  it("passe au mois suivant", () => {
    expect(periodeSuivante("2026-08")).toBe("2026-09");
  });

  it("franchit l'année", () => {
    expect(periodeSuivante("2026-12")).toBe("2027-01");
  });

  it("refuse une période illisible", () => {
    expect(() => periodeSuivante("aout")).toThrow(/illisible/);
  });
});

describe("referenceRecap", () => {
  it("porte la période et le groupe", () => {
    expect(referenceRecap("2026-08", "3f2a1b4c-dead-beef-0000-000000000000")).toBe(
      "RCP-2026-08-3F2A1B4C",
    );
  });
});

describe("PALIERS_DEFAUT", () => {
  it("est ordonnée et dégressive", () => {
    for (let i = 1; i < PALIERS_DEFAUT.length; i++) {
      expect(PALIERS_DEFAUT[i].seuil).toBeGreaterThan(PALIERS_DEFAUT[i - 1].seuil);
      expect(PALIERS_DEFAUT[i].taux).toBeLessThan(PALIERS_DEFAUT[i - 1].taux);
    }
  });

  it("part du taux de base", () => {
    expect(PALIERS_DEFAUT[0]).toEqual({ seuil: 0, taux: TAUX_BASE });
  });
});
