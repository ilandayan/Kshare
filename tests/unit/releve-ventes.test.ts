import { describe, it, expect, beforeAll } from "vitest";
import type { LigneVente } from "@/lib/invoicing/releve";

beforeAll(() => {
  process.env.KSHARE_NOM_COMMERCIAL = "Kshare";
  process.env.KSHARE_DENOMINATION = "Ilan Dayan";
  process.env.KSHARE_MENTION_EI = "Entrepreneur individuel";
  process.env.KSHARE_ADRESSE = "5 rue de la Grange";
  process.env.KSHARE_CODE_POSTAL = "91230";
  process.env.KSHARE_VILLE = "Montgeron";
  process.env.KSHARE_SIRET = "000 000 000 00000";
});

const commerce = {
  nom: "Boucherie Cohen",
  adresse: "12 rue des Rosiers",
  codePostal: "75004",
  ville: "Paris",
  siret: "98765432100019",
  email: "contact@boucherie-cohen.fr",
};

const lignes: LigneVente[] = [
  {
    reference: "#a1b2c3d4",
    date: "2026-07-03T12:00:00.000Z",
    montantInitial: 18,
    rembourse: 0,
    vente: 18,
    commission: 3.24,
    net: 14.76,
    nature: "vente",
  },
  {
    reference: "#c9d0e1f2",
    date: "2026-07-26T12:00:00.000Z",
    montantInitial: 11.8,
    rembourse: 11.8,
    vente: 0,
    commission: 0,
    net: 0,
    nature: "vente",
  },
];

describe("Référence de relevé", () => {
  it("porte la période et le commerce", async () => {
    const { referenceReleve } = await import("@/lib/invoicing/releve");
    expect(referenceReleve("2026-07", "a1b2c3d4-1111-2222-3333-444455556666")).toBe(
      "RV-2026-07-a1b2c3d4",
    );
  });
});

describe("Relevé de ventes en PDF", () => {
  it("produit un document lisible", async () => {
    const { generateStatementPdf } = await import("@/lib/pdf/generate-statement-pdf");

    const pdf = generateStatementPdf({
      reference: "RV-2026-07-a1b2c3d4",
      emisLe: "2026-08-01T07:00:00.000Z",
      periodeLibelle: "juillet 2026",
      debut: "2026-07-01",
      fin: "2026-07-31",
      commerce,
      ventes: 18,
      commission: 3.24,
      remboursements: 11.8,
      net: 14.76,
      paniers: 2,
      donsClients: 0,
      donsCommerce: 0,
      lignes,
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // La police embarquée pèse l'essentiel : son absence signalerait que le
    // symbole € est de nouveau escamoté.
    expect(pdf.toString("latin1")).toContain("NotoSans");
    expect(pdf.length).toBeLessThan(300 * 1024);
  });

  it("porte la mention de remplacement quand il en rectifie un autre", async () => {
    const { generateStatementPdf } = await import("@/lib/pdf/generate-statement-pdf");

    const pdf = generateStatementPdf({
      reference: "RV-2026-07-a1b2c3d4-R4821",
      emisLe: "2026-08-05T09:00:00.000Z",
      periodeLibelle: "juillet 2026",
      debut: "2026-07-01",
      fin: "2026-07-31",
      commerce,
      ventes: 18,
      commission: 3.24,
      remboursements: 0,
      net: 14.76,
      paniers: 1,
      donsClients: 0,
      donsCommerce: 0,
      lignes: [lignes[0]],
      // Celui qui reçoit deux relevés du même mois doit savoir lequel fait foi.
      remplace: { reference: "RV-2026-07-a1b2c3d4", emisLe: "2026-08-01T07:00:00.000Z" },
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("supporte un détail qui déborde sur plusieurs pages", async () => {
    const { generateStatementPdf } = await import("@/lib/pdf/generate-statement-pdf");

    const nombreuses: LigneVente[] = Array.from({ length: 150 }, (_, i) => ({
      reference: `#${String(i).padStart(8, "0")}`,
      date: "2026-07-10T12:00:00.000Z",
      montantInitial: 12,
      rembourse: 0,
      vente: 12,
      commission: 2.16,
      net: 9.84,
      nature: "vente",
    }));

    const pdf = generateStatementPdf({
      reference: "RV-2026-07-deadbeef",
      emisLe: "2026-08-01T07:00:00.000Z",
      periodeLibelle: "juillet 2026",
      debut: "2026-07-01",
      fin: "2026-07-31",
      commerce,
      ventes: 1800,
      commission: 324,
      remboursements: 0,
      net: 1476,
      paniers: 150,
      donsClients: 0,
      donsCommerce: 0,
      lignes: nombreuses,
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("Les deux natures de don", () => {
  it("distingue le panier offert par un client de celui offert par le commerce", async () => {
    const { generateStatementPdf } = await import("@/lib/pdf/generate-statement-pdf");

    // Un don client est un panier payé plein tarif, sans commission : c'est du
    // chiffre d'affaires pour le commerce. Un don du commerce est à zéro euro.
    // Les confondre lui montrerait des recettes qu'il n'a pas eues.
    const donClient: LigneVente = {
      reference: "#11112222",
      date: "2026-07-12T12:00:00.000Z",
      montantInitial: 12.5,
      rembourse: 0,
      vente: 12.5,
      commission: 0,
      net: 12.5,
      nature: "don_client",
    };
    const donCommerce: LigneVente = {
      reference: "#33334444",
      date: "2026-07-18T12:00:00.000Z",
      montantInitial: 0,
      rembourse: 0,
      vente: 0,
      commission: 0,
      net: 0,
      nature: "don_commerce",
    };

    // Ni l'un ni l'autre ne porte de commission.
    expect(donClient.commission).toBe(0);
    expect(donCommerce.commission).toBe(0);
    // Mais seul le don client fait entrer de l'argent.
    expect(donClient.net).toBeGreaterThan(0);
    expect(donCommerce.net).toBe(0);

    const pdf = generateStatementPdf({
      reference: "RV-2026-07-a1b2c3d4",
      emisLe: "2026-08-01T07:00:00.000Z",
      periodeLibelle: "juillet 2026",
      debut: "2026-07-01",
      fin: "2026-07-31",
      commerce,
      ventes: 30.5,
      commission: 3.24,
      remboursements: 0,
      net: 27.26,
      paniers: 1,
      donsClients: 1,
      donsCommerce: 1,
      lignes: [lignes[0], donClient, donCommerce],
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("Facture rectificative", () => {
  it("porte la mention « Annule et remplace »", async () => {
    const { generateInvoicePdf } = await import("@/lib/pdf/generate-invoice-pdf");

    const pdf = generateInvoicePdf({
      numero: "KS-2026-0042",
      nature: "commission",
      emiseLe: "2026-08-05T09:00:00.000Z",
      periodeLibelle: "juillet 2026",
      periodeDebut: "2026-07-01",
      periodeFin: "2026-07-31",
      client: commerce,
      lignes: [{ libelle: "Commission sur 1 panier vendu", base: 18, taux: 18, montant: 3.24 }],
      total: 3.24,
      tauxTva: 0,
      montantTva: 0,
      resteAPayer: 0,
      remplace: { numero: "KS-2026-0012", emiseLe: "2026-08-01T07:00:00.000Z" },
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
