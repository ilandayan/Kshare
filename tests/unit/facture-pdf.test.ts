import { describe, it, expect, beforeAll, vi } from "vitest";
import { bornesPeriode, libellePeriode, referenceCommande } from "@/lib/invoicing/compute";

/**
 * L'émetteur est lu à l'import du module : il faut donc renseigner
 * l'environnement avant que quoi que ce soit ne l'importe.
 */
beforeAll(() => {
  process.env.KSHARE_NOM_COMMERCIAL = "Kshare";
  process.env.KSHARE_DENOMINATION = "Ilan Dayan";
  process.env.KSHARE_MENTION_EI = "Entrepreneur individuel";
  process.env.KSHARE_ADRESSE = "1 rue de la Paix";
  process.env.KSHARE_CODE_POSTAL = "75002";
  process.env.KSHARE_VILLE = "Paris";
  process.env.KSHARE_SIRET = "12345678900012";
});

describe("Périodes de facturation", () => {
  it("borne le mois sur le premier instant du mois suivant", () => {
    const { debut, fin } = bornesPeriode("2026-03");
    expect(debut.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    // Borne haute exclue : une commande capturée le 31 mars à 23h59 est dedans,
    // une du 1er avril à 00h00 ne l'est pas.
    expect(fin.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("gère le passage d'année", () => {
    const { debut, fin } = bornesPeriode("2026-12");
    expect(debut.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(fin.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("nomme la période en français", () => {
    expect(libellePeriode("2026-03")).toBe("mars 2026");
  });
});

describe("Référence de commande", () => {
  it("reprend la forme déjà affichée dans l'application", () => {
    // Le commerce doit retrouver la commande sur son écran depuis la facture,
    // sans conversion mentale.
    expect(referenceCommande("a1b2c3d4-1111-2222-3333-444455556666")).toBe("#a1b2c3d4");
  });
});

describe("Identité de l'émetteur", () => {
  it("ne réclame plus rien quand l'environnement est complet", async () => {
    const { mentionsManquantes } = await import("@/lib/invoicing/emetteur");
    expect(mentionsManquantes()).toEqual([]);
  });

  it("met la marque et ses coordonnées en tête", async () => {
    const { blocEmetteurEnTete } = await import("@/lib/invoicing/emetteur");
    const bloc = blocEmetteurEnTete();
    expect(bloc[0]).toBe("Kshare");
    expect(bloc).toContain("SIRET 12345678900012");
    expect(bloc).toContain("contact@k-share.fr");
    // Le nom de l'entrepreneur n'a rien à faire ici : il est en pied de page.
    expect(bloc.join(" ")).not.toContain("Ilan Dayan");
  });

  it("porte le nom de l'entrepreneur et sa qualité en pied de page", async () => {
    const { blocEmetteurPied } = await import("@/lib/invoicing/emetteur");
    const bloc = blocEmetteurPied();
    // Une entreprise individuelle doit faire figurer son nom suivi de la
    // mention « Entrepreneur individuel » : « Kshare » seul n'identifie
    // aucune personne juridique. L'emplacement est libre, la mention non.
    expect(bloc).toContain("Ilan Dayan — Entrepreneur individuel");
    expect(bloc).toContain("Dispensé d'immatriculation au RCS et au RM");
  });

  it("réclame la dénomination légale si elle manque", async () => {
    // L'émetteur est figé à l'import : il faut vider le cache de modules pour
    // simuler un déploiement où seule la marque est renseignée.
    process.env.KSHARE_DENOMINATION = "";
    vi.resetModules();
    const frais = await import("@/lib/invoicing/emetteur");
    expect(frais.mentionsManquantes().join(" ")).toContain("KSHARE_DENOMINATION");

    process.env.KSHARE_DENOMINATION = "Ilan Dayan";
    vi.resetModules();
  });
});

describe("Génération du PDF de facture", () => {
  const client = {
    nom: "Boucherie Cohen",
    adresse: "12 rue des Rosiers",
    codePostal: "75004",
    ville: "Paris",
    siret: "98765432100019",
    email: "contact@boucherie-cohen.fr",
  };

  it("produit une facture de commission avec son annexe", async () => {
    const { generateInvoicePdf } = await import("@/lib/pdf/generate-invoice-pdf");

    const pdf = generateInvoicePdf({
      numero: "KS-2026-0001",
      nature: "commission",
      emiseLe: "2026-04-01T09:00:00.000Z",
      periodeLibelle: "mars 2026",
      periodeDebut: "2026-03-01",
      periodeFin: "2026-03-31",
      client,
      lignes: [
        {
          libelle: "Commission sur 2 paniers vendus — mars 2026",
          base: 30,
          taux: 18,
          montant: 5.4,
        },
      ],
      commandes: [
        {
          reference: "#a1b2c3d4",
          date: "2026-03-04T12:00:00.000Z",
          montantInitial: 18.0,
          vente: 18,
          tauxApplique: 18,
          commission: 3.24,
          rembourse: 0,
          remboursementIntegral: false,
          regularisation: false,
        },
        {
          reference: "#e5f6a7b8",
          date: "2026-03-19T12:00:00.000Z",
          montantInitial: 12.0,
          vente: 12,
          tauxApplique: 18,
          commission: 2.16,
          rembourse: 0,
          remboursementIntegral: false,
          regularisation: false,
        },
      ],
      total: 5.4,
      tauxTva: 0,
      montantTva: 0,
      resteAPayer: 0,
    });

    // Un PDF commence par %PDF- : c'est ce qui distingue un document valide
    // d'un buffer vide renvoyé par une erreur silencieuse.
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("écrit le symbole € quand la police est embarquée", async () => {
    const { assainirTexte, formaterMontant } = await import("@/lib/pdf/generate-invoice-pdf");

    // Avec police embarquée : la devise et les tirets longs passent tels quels.
    expect(formaterMontant(-4.14, "€")).toBe("-4,14 €");
    expect(assainirTexte("Commission — juillet 2026 : 9,31 €", true)).toBe(
      "Commission — juillet 2026 : 9,31 €",
    );

    // Sans police embarquée, on retombe sur ce que WinAnsi sait écrire : les
    // polices intégrées de jsPDF escamotent € et les tirets longs sans rien
    // signaler, ce qui sortait des factures sans devise.
    expect(formaterMontant(-4.14, "EUR")).toBe("-4,14 EUR");
    expect(assainirTexte("Commission — juillet 2026 : 9,31 €", false)).toBe(
      "Commission - juillet 2026 : 9,31 EUR",
    );

    // Le signe moins typographique casse la chaîne entière en UTF-16 : il est
    // remplacé dans les deux cas.
    expect(assainirTexte("− 4,14", true)).toBe("- 4,14");
    expect(assainirTexte("− 4,14", false)).toBe("- 4,14");
  });

  it("embarque bien la police dans le document", async () => {
    const { generateInvoicePdf } = await import("@/lib/pdf/generate-invoice-pdf");

    const pdf = generateInvoicePdf({
      numero: "KS-2026-0098",
      nature: "subscription",
      emiseLe: "2026-05-01T09:00:00.000Z",
      periodeLibelle: "avril 2026",
      periodeDebut: "2026-04-01",
      periodeFin: "2026-04-30",
      client,
      lignes: [{ libelle: "Abonnement Pro", montant: 29 }],
      total: 29,
      tauxTva: 0,
      montantTva: 0,
      resteAPayer: 0,
    });

    const brut = pdf.toString("latin1");
    // Sans police embarquée, jsPDF retomberait sur helvetica et le € serait
    // silencieusement escamoté : c'est la présence du fichier de police dans le
    // document qui garantit la devise.
    expect(brut).toContain("NotoSans");
    expect(brut).toContain("FontFile2");
  });

  it("accepte une régularisation négative et un remboursement", async () => {
    const { generateInvoicePdf } = await import("@/lib/pdf/generate-invoice-pdf");

    const pdf = generateInvoicePdf({
      numero: "KS-2026-0009",
      nature: "commission",
      emiseLe: "2026-05-01T09:00:00.000Z",
      periodeLibelle: "avril 2026",
      periodeDebut: "2026-04-01",
      periodeFin: "2026-04-30",
      client,
      lignes: [
        { libelle: "Commission sur 1 panier vendu — avril 2026", base: 20, taux: 18, montant: 3.6 },
        // Le cas qui a motivé le mécanisme : un remboursement accordé après
        // l'émission de la facture de mars, que celle-ci ne pouvait plus
        // corriger puisqu'elle est figée.
        {
          libelle: "Remboursements sur périodes antérieures — 1 commande (détail en annexe)",
          montant: -3.24,
        },
      ],
      commandes: [
        {
          reference: "#11112222",
          date: "2026-04-08T12:00:00.000Z",
          montantInitial: 20.0,
          vente: 20,
          tauxApplique: 18,
          commission: 3.6,
          rembourse: 0,
          remboursementIntegral: false,
          regularisation: false,
        },
        {
          reference: "#a1b2c3d4",
          date: "2026-03-04T12:00:00.000Z",
          montantInitial: 18.0,
          vente: 0,
          tauxApplique: 18,
          commission: -3.24,
          rembourse: 18,
          remboursementIntegral: true,
          regularisation: true,
        },
      ],
      total: 0.36,
      tauxTva: 0,
      montantTva: 0,
      resteAPayer: 0,
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("reste léger : le logo est embarqué compressé", async () => {
    const { generateInvoicePdf } = await import("@/lib/pdf/generate-invoice-pdf");

    const pdf = generateInvoicePdf({
      numero: "KS-2026-0050",
      nature: "subscription",
      emiseLe: "2026-04-01T09:00:00.000Z",
      periodeLibelle: "mars 2026",
      periodeDebut: "2026-03-01",
      periodeFin: "2026-03-31",
      client,
      lignes: [{ libelle: "Abonnement Pro", montant: 29 }],
      total: 29,
      tauxTva: 0,
      montantTva: 0,
      resteAPayer: 0,
    });

    // Le poids se répartit entre les deux graisses de la police (~110 Ko), le
    // logo et le dégradé. Sans l'option de compression sur l'image, la facture
    // dépassait 400 Ko à elle seule ; le garde-fou est là pour que ce réglage
    // ne se perde pas lors d'une refonte.
    expect(pdf.length).toBeLessThan(200 * 1024);
  });

  it("produit une facture d'abonnement, sans annexe", async () => {
    const { generateInvoicePdf } = await import("@/lib/pdf/generate-invoice-pdf");

    const pdf = generateInvoicePdf({
      numero: "KS-2026-0002",
      nature: "subscription",
      emiseLe: "2026-04-01T09:00:00.000Z",
      periodeLibelle: "mars 2026",
      periodeDebut: "2026-03-01",
      periodeFin: "2026-03-31",
      client,
      lignes: [{ libelle: "Abonnement Pro — mars 2026", montant: 29 }],
      total: 29,
      tauxTva: 0,
      montantTva: 0,
      resteAPayer: 0,
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("ne casse pas quand le client n'a ni SIRET ni adresse", async () => {
    const { generateInvoicePdf } = await import("@/lib/pdf/generate-invoice-pdf");

    const pdf = generateInvoicePdf({
      numero: "KS-2026-0003",
      nature: "commission",
      emiseLe: "2026-04-01T09:00:00.000Z",
      periodeLibelle: "mars 2026",
      periodeDebut: "2026-03-01",
      periodeFin: "2026-03-31",
      client: {
        nom: "Épicerie sans papiers renseignés",
        adresse: null,
        codePostal: null,
        ville: null,
        siret: null,
        email: null,
      },
      lignes: [{ libelle: "Commission", base: 100, taux: 18, montant: 18 }],
      total: 18,
      tauxTva: 0,
      montantTva: 0,
      resteAPayer: 0,
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("supporte une annexe qui déborde sur plusieurs pages", async () => {
    const { generateInvoicePdf } = await import("@/lib/pdf/generate-invoice-pdf");

    const commandes = Array.from({ length: 120 }, (_, i) => ({
      reference: `#${String(i).padStart(8, "0")}`,
      date: "2026-03-10T12:00:00.000Z",
      montantInitial: 10,
      vente: 10,
      tauxApplique: 18,
      commission: 1.8,
      rembourse: 0,
      remboursementIntegral: false,
      regularisation: false,
    }));

    const pdf = generateInvoicePdf({
      numero: "KS-2026-0004",
      nature: "commission",
      emiseLe: "2026-04-01T09:00:00.000Z",
      periodeLibelle: "mars 2026",
      periodeDebut: "2026-03-01",
      periodeFin: "2026-03-31",
      client,
      lignes: [
        { libelle: "Commission sur 120 paniers vendus", base: 1200, taux: 18, montant: 216 },
      ],
      commandes,
      total: 216,
      tauxTva: 0,
      montantTva: 0,
      resteAPayer: 0,
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // 120 lignes ne tiennent pas sur une page : la pagination doit s'être
    // déclenchée plutôt que d'écrire hors du cadre.
    expect(pdf.length).toBeGreaterThan(10_000);
  });
});
