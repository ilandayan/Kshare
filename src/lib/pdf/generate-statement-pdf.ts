/**
 * Relevé de ventes mensuel d'un commerce, au format PDF.
 *
 * Même charte que la facture, mais l'objet est inverse : la facture réclame ce
 * que Kshare a perçu, le relevé atteste ce que le commerce a vendu. Le
 * document insiste donc sur un point que son comptable vérifiera :
 *
 * **le chiffre d'affaires à déclarer est le prix de vente, pas le net versé.**
 * La commission est une charge, non une réduction de recette. Un commerçant
 * qui déclarerait ses seuls virements sous-déclarerait de douze à dix-huit
 * pour cent, et ne s'en apercevrait qu'au contrôle.
 */

import { jsPDF } from "jspdf";
import {
  BLEU, GRIS_TEXTE, GRIS_CLAIR, ROUGE, BLANC_BLEUTE, HAUT_PIED, POLICE,
  assainirTexte, formaterMontant, formatDate, formatDateCourte,
  chargerPolices, degradeHorizontal, poserLogo,
} from "@/lib/pdf/charte";
import { EMETTEUR, blocEmetteurEnTete, blocEmetteurPied } from "@/lib/invoicing/emetteur";
import type { LigneVente } from "@/lib/invoicing/releve";

export interface StatementPdfParams {
  reference: string;
  emisLe: string;
  periodeLibelle: string;
  debut: string;
  fin: string;
  commerce: {
    nom: string;
    adresse: string | null;
    codePostal: string | null;
    ville: string | null;
    siret: string | null;
    email: string | null;
  };
  ventes: number;
  commission: number;
  remboursements: number;
  net: number;
  paniers: number;
  dons: number;
  lignes: LigneVente[];
  /** Référence du relevé que celui-ci annule et remplace, le cas échéant. */
  remplace?: { reference: string; emisLe: string } | null;
}

export function generateStatementPdf(params: StatementPdfParams): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const polices = chargerPolices();
  if (polices) {
    doc.addFileToVFS("NotoSans-Regular.ttf", polices.normal);
    doc.addFont("NotoSans-Regular.ttf", POLICE, "normal");
    doc.addFileToVFS("NotoSans-Bold.ttf", polices.bold);
    doc.addFont("NotoSans-Bold.ttf", POLICE, "bold");
  }
  const famille = polices ? POLICE : "helvetica";
  const devise = polices ? "€" : "EUR";
  const euros = (v: number) => formaterMontant(v, devise);

  const police = (graisse: "normal" | "bold") => doc.setFont(famille, graisse);
  const ecrire = (
    texte: string,
    x: number,
    y: number,
    options?: Parameters<typeof doc.text>[3],
  ) => doc.text(assainirTexte(texte, polices !== null), x, y, options);

  let y = 0;

  function nouvellePage() {
    doc.addPage();
    degradeHorizontal(doc, 0, 0, pageWidth, 3);
    y = 22;
  }

  function saut(hauteur: number) {
    if (y + hauteur > HAUT_PIED - 4) nouvellePage();
  }

  // ── Bandeau ──
  degradeHorizontal(doc, 0, 0, pageWidth, 34);

  if (!poserLogo(doc, margin, 11)) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    police("bold");
    ecrire(EMETTEUR.nomCommercial, margin, 21);
  }

  doc.setTextColor(...BLANC_BLEUTE);
  doc.setFontSize(8);
  police("normal");
  doc.setCharSpace(1.2);
  const titre = assainirTexte("RELEVÉ DE VENTES", polices !== null);
  doc.text(titre, pageWidth - margin - doc.getTextWidth(titre), 14.5);
  doc.setCharSpace(0);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  police("bold");
  ecrire(params.reference, pageWidth - margin, 23, { align: "right" });

  doc.setTextColor(...BLANC_BLEUTE);
  doc.setFontSize(8.5);
  police("normal");
  ecrire(`Établi le ${formatDate(params.emisLe)}`, pageWidth - margin, 28.5, { align: "right" });

  // ── Émetteur et commerce ──
  y = 48;
  doc.setTextColor(...BLEU);
  doc.setFontSize(9);
  police("bold");
  ecrire("ÉTABLI PAR", margin, y);
  ecrire("COMMERCE", pageWidth / 2 + 5, y);

  y += 6;
  doc.setTextColor(...GRIS_TEXTE);

  const emetteur = blocEmetteurEnTete();
  const commerce = [
    params.commerce.nom,
    params.commerce.adresse ?? "",
    `${params.commerce.codePostal ?? ""} ${params.commerce.ville ?? ""}`.trim(),
    params.commerce.siret ? `SIRET ${params.commerce.siret}` : "",
    params.commerce.email ?? "",
  ].filter((l) => l && l.trim());

  const hauteurBloc = Math.max(emetteur.length, commerce.length) * 5 + 4;
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(margin, y - 4, contentWidth / 2 - 5, hauteurBloc, 2, 2, "F");
  doc.roundedRect(pageWidth / 2 + 5, y - 4, contentWidth / 2 - 5, hauteurBloc, 2, 2, "F");

  doc.setFontSize(9.5);
  police("bold");
  ecrire(emetteur[0] ?? "", margin + 4, y + 1);
  ecrire(commerce[0] ?? "", pageWidth / 2 + 9, y + 1);
  police("normal");
  doc.setFontSize(8.5);
  for (let i = 1; i < emetteur.length; i++) ecrire(emetteur[i], margin + 4, y + 1 + i * 5);
  for (let i = 1; i < commerce.length; i++) ecrire(commerce[i], pageWidth / 2 + 9, y + 1 + i * 5);

  y += hauteurBloc + 8;

  // ── Mention de remplacement ──
  //
  // En tête du document et non en pied : celui qui reçoit un second relevé du
  // même mois doit comprendre en une seconde lequel fait foi.
  if (params.remplace) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y - 4, contentWidth, 12, 2, 2, "F");
    doc.setTextColor(...ROUGE);
    police("bold");
    doc.setFontSize(9);
    ecrire(
      `Annule et remplace le relevé ${params.remplace.reference} du ${formatDateCourte(params.remplace.emisLe)}.`,
      margin + 4,
      y + 3,
    );
    doc.setTextColor(...GRIS_TEXTE);
    police("normal");
    y += 14;
  }

  // ── Période ──
  doc.setFontSize(9.5);
  doc.setTextColor(...GRIS_TEXTE);
  ecrire(
    `Période : ${params.periodeLibelle} (du ${formatDateCourte(params.debut)} au ${formatDateCourte(params.fin)})`,
    margin,
    y,
  );
  y += 10;

  // ── Synthèse ──
  //
  // Le chiffre d'affaires en premier, en gros : c'est le seul montant que le
  // commerce doit reporter dans sa comptabilité.
  doc.setFillColor(...BLEU);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  police("normal");
  doc.setFontSize(8.5);
  ecrire("CHIFFRE D'AFFAIRES À DÉCLARER", margin + 6, y + 8);
  police("bold");
  doc.setFontSize(16);
  ecrire(euros(params.ventes), margin + 6, y + 17);

  police("normal");
  doc.setFontSize(8);
  doc.setTextColor(...BLANC_BLEUTE);
  ecrire(
    `${params.paniers} panier${params.paniers > 1 ? "s" : ""} vendu${params.paniers > 1 ? "s" : ""}` +
      (params.dons > 0 ? ` · ${params.dons} don${params.dons > 1 ? "s" : ""}` : ""),
    pageWidth - margin - 6,
    y + 8,
    { align: "right" },
  );
  ecrire("commission déduite ci-dessous", pageWidth - margin - 6, y + 17, { align: "right" });
  y += 30;

  // ── Décomposition ──
  doc.setTextColor(...GRIS_TEXTE);
  doc.setFontSize(9.5);
  const gauche = margin + 4;
  const droite = pageWidth - margin - 4;

  const rangee = (libelle: string, montant: number, options?: { rouge?: boolean; gras?: boolean }) => {
    saut(8);
    if (options?.gras) police("bold");
    if (options?.rouge) doc.setTextColor(...ROUGE);
    ecrire(libelle, gauche, y);
    ecrire(euros(montant), droite, y, { align: "right" });
    doc.setTextColor(...GRIS_TEXTE);
    police("normal");
    y += 6.5;
  };

  rangee("Ventes encaissées", params.ventes);
  if (params.remboursements > 0) {
    rangee("dont remboursements déduits", -params.remboursements, { rouge: true });
  }
  rangee("Commission Kshare", -params.commission, { rouge: true });

  doc.setDrawColor(220, 222, 235);
  doc.setLineWidth(0.3);
  doc.line(margin + 4, y - 2, pageWidth - margin - 4, y - 2);
  y += 3;
  rangee("Net versé par Kshare", params.net, { gras: true });
  y += 4;

  // ── L'avertissement qui justifie le document ──
  saut(24);
  doc.setFillColor(255, 251, 235);
  doc.roundedRect(margin, y - 4, contentWidth, 20, 2, 2, "F");
  police("bold");
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  ecrire("Votre chiffre d'affaires est le prix de vente, pas le net versé.", margin + 4, y + 2);
  police("normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS_TEXTE);
  ecrire(
    `Déclarez ${euros(params.ventes)}. La commission de ${euros(params.commission)} est une charge de votre`,
    margin + 4,
    y + 8,
  );
  ecrire(
    "exploitation, justifiée par la facture Kshare du même mois — elle ne réduit pas votre recette.",
    margin + 4,
    y + 12.5,
  );
  y += 26;

  // ── Détail des ventes ──
  if (params.lignes.length > 0) {
    nouvellePage();
    doc.setTextColor(...BLEU);
    doc.setFontSize(12);
    police("bold");
    ecrire("Détail des ventes", margin, y);
    y += 6;
    doc.setTextColor(...GRIS_CLAIR);
    doc.setFontSize(8);
    police("normal");
    ecrire("Les références correspondent à celles de votre espace commerçant.", margin, y);
    y += 8;

    const xRef = margin + 3;
    const centreDate = margin + 42;
    const centreInitial = margin + 74;
    const centreCommission = margin + 108;
    const droiteNet = pageWidth - margin - 3;

    const enTete = () => {
      doc.setFillColor(...BLEU);
      doc.rect(margin, y, contentWidth, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      police("bold");
      ecrire("COMMANDE", xRef, y + 5);
      ecrire("DATE", centreDate, y + 5, { align: "center" });
      ecrire("VENTE", centreInitial, y + 5, { align: "center" });
      ecrire("COMMISSION", centreCommission, y + 5, { align: "center" });
      ecrire("NET", droiteNet, y + 5, { align: "right" });
      y += 7;
      police("normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRIS_TEXTE);
    };

    enTete();
    let alt = false;

    for (const l of params.lignes) {
      const hauteur = l.rembourse > 0 ? 9 : 6;
      if (y + hauteur + 2 > HAUT_PIED - 4) {
        nouvellePage();
        enTete();
        alt = false;
      }

      if (alt) {
        doc.setFillColor(250, 251, 255);
        doc.rect(margin, y, contentWidth, hauteur, "F");
      }
      alt = !alt;

      const touchee = l.rembourse > 0;
      doc.setFontSize(8);
      doc.setTextColor(...(touchee ? ROUGE : GRIS_TEXTE));
      ecrire(l.reference + (l.don ? "  (don)" : ""), xRef, y + 4.2);
      ecrire(formatDateCourte(l.date), centreDate, y + 4.2, { align: "center" });
      ecrire(euros(l.vente), centreInitial, y + 4.2, { align: "center" });
      ecrire(euros(l.commission), centreCommission, y + 4.2, { align: "center" });
      ecrire(euros(l.net), droiteNet, y + 4.2, { align: "right" });

      if (touchee) {
        doc.setFontSize(7);
        ecrire(
          `remboursée ${euros(l.rembourse)} sur ${euros(l.montantInitial)}`,
          xRef,
          y + 8,
        );
      }
      doc.setTextColor(...GRIS_TEXTE);
      y += hauteur;
    }
  }

  // ── Pied de page ──
  const total = doc.getNumberOfPages();
  const identite = blocEmetteurPied();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(225, 227, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, HAUT_PIED + 6, pageWidth - margin, HAUT_PIED + 6);

    doc.setTextColor(...GRIS_CLAIR);
    doc.setFontSize(7.5);
    police("normal");
    ecrire(identite.join("  ·  "), pageWidth / 2, HAUT_PIED + 11, { align: "center" });
    ecrire(
      `${params.reference} — Relevé de ventes, document non comptable — Page ${i}/${total}`,
      pageWidth / 2,
      HAUT_PIED + 15,
      { align: "center" },
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}
