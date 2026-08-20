/**
 * Récapitulatif mensuel d'une enseigne, au format PDF.
 *
 * Ce document ne réclame rien et n'atteste rien : chaque magasin reçoit déjà
 * son relevé et sa facture, seuls opposables, adressés à la société qui doit
 * l'argent. Le récapitulatif ne fait que consolider, à l'usage de la centrale.
 *
 * Il porte donc l'explication que les documents par magasin ne peuvent pas
 * donner : d'où vient le taux, et quand il change. Le chiffre d'affaires du
 * mois écoulé détermine le taux du mois suivant — la commission étant figée
 * sur le paiement Stripe, elle ne peut pas dépendre de ventes postérieures.
 * C'est la question que la centrale posera en premier.
 */

import { jsPDF } from "jspdf";
import {
  BLEU, GRIS_TEXTE, GRIS_CLAIR, BLANC_BLEUTE, HAUT_PIED, POLICE,
  assainirTexte, formaterMontant, formatDate, formatDateCourte,
  chargerPolices, degradeHorizontal, poserLogo,
} from "@/lib/pdf/charte";
import { EMETTEUR, blocEmetteurEnTete, blocEmetteurPied } from "@/lib/invoicing/emetteur";

export interface GroupRecapPdfParams {
  reference: string;
  emisLe: string;
  periodeLibelle: string;
  /** Mois d'application du nouveau taux, en toutes lettres. */
  periodeSuivanteLibelle: string;
  debut: string;
  fin: string;
  groupe: {
    nom: string;
    siren: string | null;
    contactNom: string | null;
    contactEmail: string | null;
  };
  caTotal: number;
  commissionTotal: number;
  /** Taux qui a servi à facturer le mois écoulé ; null au premier mois. */
  tauxApplique: number | null;
  tauxSuivant: number;
  magasins: Array<{
    nom: string;
    ventes: number;
    commission: number;
    paniers: number;
  }>;
}

export function generateGroupRecapPdf(params: GroupRecapPdfParams): Buffer {
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
  const titre = assainirTexte("RÉCAPITULATIF ENSEIGNE", polices !== null);
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

  // ── Émetteur et enseigne ──
  y = 48;
  doc.setTextColor(...BLEU);
  doc.setFontSize(9);
  police("bold");
  ecrire("ÉTABLI PAR", margin, y);
  ecrire("ENSEIGNE", pageWidth / 2 + 5, y);

  y += 6;
  doc.setTextColor(...GRIS_TEXTE);

  const emetteur = blocEmetteurEnTete();
  const enseigne = [
    params.groupe.nom,
    params.groupe.siren ? `SIREN ${params.groupe.siren}` : "",
    params.groupe.contactNom ?? "",
    params.groupe.contactEmail ?? "",
  ].filter((l) => l && l.trim());

  const hauteurBloc = Math.max(emetteur.length, enseigne.length) * 5 + 4;
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(margin, y - 4, contentWidth / 2 - 5, hauteurBloc, 2, 2, "F");
  doc.roundedRect(pageWidth / 2 + 5, y - 4, contentWidth / 2 - 5, hauteurBloc, 2, 2, "F");

  doc.setFontSize(9.5);
  police("bold");
  ecrire(emetteur[0] ?? "", margin + 4, y + 1);
  ecrire(enseigne[0] ?? "", pageWidth / 2 + 9, y + 1);
  police("normal");
  doc.setFontSize(8.5);
  for (let i = 1; i < emetteur.length; i++) ecrire(emetteur[i], margin + 4, y + 1 + i * 5);
  for (let i = 1; i < enseigne.length; i++) ecrire(enseigne[i], pageWidth / 2 + 9, y + 1 + i * 5);

  y += hauteurBloc + 8;

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
  doc.setFillColor(...BLEU);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  police("normal");
  doc.setFontSize(8.5);
  ecrire("CHIFFRE D'AFFAIRES CONSOLIDÉ TTC", margin + 6, y + 8);
  police("bold");
  doc.setFontSize(16);
  ecrire(euros(params.caTotal), margin + 6, y + 17);

  police("normal");
  doc.setFontSize(8);
  doc.setTextColor(...BLANC_BLEUTE);
  const nb = params.magasins.length;
  const paniers = params.magasins.reduce((s, m) => s + m.paniers, 0);
  ecrire(
    `${nb} magasin${nb > 1 ? "s" : ""} · ${paniers} panier${paniers > 1 ? "s" : ""} vendu${paniers > 1 ? "s" : ""}`,
    pageWidth - margin - 6,
    y + 17,
    { align: "right" },
  );
  y += 30;

  // ── Le taux, et son calendrier ──
  //
  // Encadré à part : c'est le seul endroit où l'enseigne apprend le taux qui
  // s'appliquera, et pourquoi il ne s'applique pas au mois qu'elle vient de
  // régler.
  saut(34);
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(margin, y, contentWidth, 30, 3, 3, "F");

  doc.setTextColor(...GRIS_CLAIR);
  doc.setFontSize(8);
  police("normal");
  ecrire("TAUX APPLIQUÉ CE MOIS-CI", margin + 6, y + 8);
  ecrire("TAUX À COMPTER DE " + params.periodeSuivanteLibelle.toUpperCase(), pageWidth / 2 + 6, y + 8);

  doc.setTextColor(...GRIS_TEXTE);
  police("bold");
  doc.setFontSize(15);
  ecrire(params.tauxApplique === null ? "18 %" : `${params.tauxApplique} %`, margin + 6, y + 16);
  doc.setTextColor(...BLEU);
  ecrire(`${params.tauxSuivant} %`, pageWidth / 2 + 6, y + 16);

  doc.setTextColor(...GRIS_CLAIR);
  police("normal");
  doc.setFontSize(7.5);
  const explication = doc.splitTextToSize(
    assainirTexte(
      "Le chiffre d'affaires consolidé de l'ensemble des magasins détermine le taux du mois suivant, " +
        "identique pour tous les points de vente du réseau. Le taux est arrêté à la clôture du mois et " +
        "ne varie pas en cours de période.",
      polices !== null,
    ),
    contentWidth - 12,
  ) as string[];
  explication.slice(0, 2).forEach((ligne, i) => doc.text(ligne, margin + 6, y + 22.5 + i * 3.6));
  y += 38;

  // ── Détail par magasin ──
  saut(20);
  doc.setTextColor(...BLEU);
  doc.setFontSize(9);
  police("bold");
  ecrire("DÉTAIL PAR MAGASIN", margin, y);
  y += 7;

  const colonnes = {
    magasin: margin + 3,
    paniers: margin + contentWidth * 0.55,
    ventes: margin + contentWidth * 0.75,
    commission: margin + contentWidth - 3,
  };

  function enTeteTableau() {
    doc.setFillColor(240, 242, 250);
    doc.rect(margin, y - 5, contentWidth, 8, "F");
    doc.setTextColor(...GRIS_CLAIR);
    doc.setFontSize(7.5);
    police("bold");
    ecrire("MAGASIN", colonnes.magasin, y);
    ecrire("PANIERS", colonnes.paniers, y, { align: "center" });
    ecrire("VENTES TTC", colonnes.ventes, y, { align: "center" });
    ecrire("COMMISSION", colonnes.commission, y, { align: "right" });
    y += 8;
  }

  enTeteTableau();
  doc.setFontSize(8.5);

  for (const magasin of params.magasins) {
    if (y + 7 > HAUT_PIED - 4) {
      nouvellePage();
      enTeteTableau();
      doc.setFontSize(8.5);
    }
    doc.setTextColor(...GRIS_TEXTE);
    police("normal");
    const nom = doc.splitTextToSize(
      assainirTexte(magasin.nom, polices !== null),
      contentWidth * 0.5,
    )[0] as string;
    doc.text(nom, colonnes.magasin, y);
    ecrire(String(magasin.paniers), colonnes.paniers, y, { align: "center" });
    ecrire(euros(magasin.ventes), colonnes.ventes, y, { align: "center" });
    ecrire(euros(magasin.commission), colonnes.commission, y, { align: "right" });

    y += 6;
    doc.setDrawColor(238, 240, 248);
    doc.line(margin, y - 2, margin + contentWidth, y - 2);
  }

  // ── Total ──
  saut(14);
  y += 2;
  doc.setDrawColor(...BLEU);
  doc.setLineWidth(0.5);
  doc.line(margin, y - 3, margin + contentWidth, y - 3);
  doc.setLineWidth(0.2);

  doc.setTextColor(...GRIS_TEXTE);
  police("bold");
  doc.setFontSize(9.5);
  ecrire("Total réseau", colonnes.magasin, y + 3);
  ecrire(String(paniers), colonnes.paniers, y + 3, { align: "center" });
  ecrire(euros(params.caTotal), colonnes.ventes, y + 3, { align: "center" });
  ecrire(euros(params.commissionTotal), colonnes.commission, y + 3, { align: "right" });
  y += 14;

  // ── Rappel ──
  saut(14);
  doc.setTextColor(...GRIS_CLAIR);
  doc.setFontSize(7.5);
  police("normal");
  const rappel = doc.splitTextToSize(
    assainirTexte(
      "Document de synthèse, remis à titre d'information. Chaque magasin reçoit par ailleurs son relevé " +
        "de ventes et sa facture de commission, seuls documents opposables, établis au nom de la société " +
        "qui l'exploite.",
      polices !== null,
    ),
    contentWidth,
  ) as string[];
  rappel.forEach((ligne, i) => doc.text(ligne, margin, y + i * 3.6));

  // ── Pied de page ──
  //
  // Même facture que les autres documents : identité de l'émetteur centrée,
  // puis la nature du document. « Document non comptable » est ici essentiel —
  // la centrale ne doit pas le passer en comptabilité à la place des factures.
  const identite = blocEmetteurPied();
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(225, 227, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, HAUT_PIED + 6, pageWidth - margin, HAUT_PIED + 6);

    doc.setTextColor(...GRIS_CLAIR);
    doc.setFontSize(7.5);
    police("normal");
    ecrire(identite.join("  ·  "), pageWidth / 2, HAUT_PIED + 11, { align: "center" });
    ecrire(
      `${params.reference} — Récapitulatif enseigne, document non comptable — Page ${p}/${pages}`,
      pageWidth / 2,
      HAUT_PIED + 15,
      { align: "center" },
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}
