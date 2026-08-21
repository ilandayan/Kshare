import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.KSHARE_NOM_COMMERCIAL = "Kshare";
  process.env.KSHARE_DENOMINATION = "Ilan Dayan";
  process.env.KSHARE_MENTION_EI = "Entrepreneur individuel";
  process.env.KSHARE_ADRESSE = "5 rue de la Grange";
  process.env.KSHARE_CODE_POSTAL = "91230";
  process.env.KSHARE_VILLE = "Montgeron";
  process.env.KSHARE_SIRET = "000 000 000 00000";
});

const groupe = {
  nom: "Hypercacher",
  siren: "384897419",
  contactNom: "Direction réseau",
  contactEmail: "centrale@example.test",
};

const magasins = [
  { nom: "Hypercacher Vincennes", ventes: 4210.5, commission: 589.47, paniers: 526 },
  { nom: "Hypercacher Villette", ventes: 3980.0, commission: 557.2, paniers: 497 },
  { nom: "Hypercacher Ourcq", ventes: 0, commission: 0, paniers: 0 },
];

const base = {
  reference: "RCP-2026-07-3F2A1B4C",
  emisLe: "2026-08-01T07:00:00.000Z",
  periodeLibelle: "juillet 2026",
  periodeSuivanteLibelle: "août 2026",
  debut: "2026-07-01",
  fin: "2026-07-31",
  groupe,
  caTotal: 8190.5,
  commissionTotal: 1146.67,
  tauxApplique: 16,
  tauxSuivant: 14,
  magasins,
};

describe("Récapitulatif d'enseigne en PDF", () => {
  it("produit un document lisible", async () => {
    const { generateGroupRecapPdf } = await import("@/lib/pdf/generate-group-recap-pdf");
    const pdf = generateGroupRecapPdf(base);

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // La police embarquée pèse l'essentiel : son absence signalerait que le
    // symbole € est de nouveau escamoté par l'encodage WinAnsi.
    expect(pdf.toString("latin1")).toContain("NotoSans");
    expect(pdf.length).toBeLessThan(300 * 1024);
  });

  it("accepte un premier mois sans taux antérieur", async () => {
    const { generateGroupRecapPdf } = await import("@/lib/pdf/generate-group-recap-pdf");
    const pdf = generateGroupRecapPdf({ ...base, tauxApplique: null });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("supporte une enseigne sans aucune vente", async () => {
    const { generateGroupRecapPdf } = await import("@/lib/pdf/generate-group-recap-pdf");
    const pdf = generateGroupRecapPdf({
      ...base,
      caTotal: 0,
      commissionTotal: 0,
      tauxApplique: null,
      tauxSuivant: 18,
      magasins: [{ nom: "Hypercacher Ourcq", ventes: 0, commission: 0, paniers: 0 }],
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("supporte un réseau qui déborde sur plusieurs pages", async () => {
    const { generateGroupRecapPdf } = await import("@/lib/pdf/generate-group-recap-pdf");
    const nombreux = Array.from({ length: 80 }, (_, i) => ({
      nom: `Hypercacher établissement numéro ${i + 1} — enseigne de quartier`,
      ventes: 1200 + i,
      commission: 168 + i,
      paniers: 150,
    }));
    const pdf = generateGroupRecapPdf({ ...base, magasins: nombreux });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(20 * 1024);
  });

  it("ne tombe pas sur une enseigne sans SIREN ni contact", async () => {
    const { generateGroupRecapPdf } = await import("@/lib/pdf/generate-group-recap-pdf");
    const pdf = generateGroupRecapPdf({
      ...base,
      groupe: { nom: "Enseigne sans état civil", siren: null, contactNom: null, contactEmail: null },
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
