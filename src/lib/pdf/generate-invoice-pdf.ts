/**
 * Génération d'une facture Kshare au format PDF.
 *
 * Charte du produit : bandeau au dégradé de la marque, mot-symbole Kshare en
 * blanc, typographie sobre.
 *
 * Partis pris qui ne se voient pas au premier regard :
 *
 * — **La police est embarquée.** Les polices intégrées de jsPDF escamotent le
 *   symbole € sans rien signaler : toutes les factures sortaient sans devise.
 *   Embarquer Noto Sans règle le fond du problème, et le document ne dépend
 *   plus de ce qui est installé chez le lecteur.
 * — **Aucune ligne de TVA tant que l'émetteur est en franchise en base.** Un
 *   taux de 0 % est un taux d'imposition, réservé aux opérations exonérées d'un
 *   assujetti qui collecte ; la franchise de l'article 293 B est autre chose :
 *   il n'y a pas de base taxable du tout. On écrit donc un total unique,
 *   immédiatement suivi de la mention d'exonération.
 * — **Le détail des commandes est en annexe.** « Commission sur 42 paniers »
 *   n'est vérifiable par personne ; un remboursement non explicité se lit comme
 *   une erreur de calcul.
 * — **L'émetteur est scindé en deux.** Le cadre en tête porte la marque et ses
 *   coordonnées, celles auxquelles le commerce écrit ; le nom de l'entrepreneur
 *   et sa qualité vivent en pied de page, sur chaque page. Toutes les mentions
 *   obligatoires sont là, la loi n'en fixant pas l'emplacement.
 *
 * Les mentions portées ici sont celles de l'article 242 nonies A de l'annexe II
 * au CGI et de l'article L441-9 du code de commerce.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import {
  EMETTEUR,
  blocEmetteurEnTete,
  blocEmetteurPied,
  TAUX_PENALITES_RETARD,
  INDEMNITE_RECOUVREMENT,
  ESCOMPTE,
} from "@/lib/invoicing/emetteur";
import {
  mentionRemboursement,
  type LigneFacture,
  type LigneCommande,
  type NatureFacture,
} from "@/lib/invoicing/compute";

export interface InvoicePdfParams {
  numero: string;
  nature: NatureFacture;
  emiseLe: string; // ISO
  periodeLibelle: string; // « mars 2026 »
  periodeDebut: string; // YYYY-MM-DD
  periodeFin: string; // YYYY-MM-DD
  client: {
    nom: string;
    adresse: string | null;
    codePostal: string | null;
    ville: string | null;
    siret: string | null;
    email: string | null;
  };
  lignes: LigneFacture[];
  /** Détail des commandes, en annexe. Vide pour une facture d'abonnement. */
  commandes?: LigneCommande[];
  total: number;
  tauxTva: number;
  montantTva: number;
  /** Reste à payer. Zéro quand tout a été prélevé à la source. */
  resteAPayer: number;
}

const BLEU: [number, number, number] = [55, 68, 200];
/** Dégradé de la marque, repris tel quel de l'en-tête de l'espace de gestion. */
const DEGRADE: [number, number, number][] = [
  [30, 42, 120], // #1e2a78
  [55, 68, 200], // #3744C8
  [91, 110, 245], // #5B6EF5
];
const GRIS_TEXTE: [number, number, number] = [51, 51, 51];
const GRIS_CLAIR: [number, number, number] = [130, 130, 130];
const ROUGE: [number, number, number] = [185, 28, 28];
const BLANC_BLEUTE: [number, number, number] = [215, 220, 250];

const TITRES: Record<NatureFacture, string> = {
  commission: "Facture de commission",
  subscription: "Facture d'abonnement",
};

/**
 * Police du document, embarquée. Noto Sans, licence SIL Open Font — voir
 * `public/fonts/OFL.txt`.
 *
 * Les fichiers vivent dans `public/` et non dans `src/` : Next ne déploie que
 * ce qu'il a tracé depuis les imports, et un `readFileSync` sur une source non
 * importée ne trouverait rien une fois en production. C'est le chemin qu'emprunte
 * déjà le logo du contrat.
 */
const POLICE = "NotoSans";

let policesCache: { normal: string; bold: string } | null | undefined;
function chargerPolices(): { normal: string; bold: string } | null {
  if (policesCache !== undefined) return policesCache;
  try {
    const dossier = path.join(process.cwd(), "public", "fonts");
    policesCache = {
      normal: readFileSync(path.join(dossier, "NotoSans-Regular.ttf")).toString("base64"),
      bold: readFileSync(path.join(dossier, "NotoSans-Bold.ttf")).toString("base64"),
    };
  } catch {
    // Sans police embarquée on retombe sur helvetica : la facture reste
    // lisible, seule la devise redevient un code ISO.
    policesCache = null;
  }
  return policesCache;
}

/** Le signe moins typographique casse les polices intégrées, et se lit mal en colonne. */
const REMPLACEMENTS: Record<string, string> = {
  "−": "-",
  " ": " ",
  " ": " ",
};

/** Ce qui doit disparaître faute de police embarquée : € et tirets longs. */
const REPLIS_SANS_POLICE: Record<string, string> = {
  "€": "EUR",
  "–": "-",
  "—": "-",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "…": "...",
};

/**
 * Exporté pour être éprouvé directement : une fois la police embarquée, le
 * texte du PDF est écrit en identifiants de glyphes, illisible depuis le
 * fichier. Vérifier la règle ici vaut mieux que de la deviner à la sortie.
 */
export function assainirTexte(texte: string, policeEmbarquee: boolean): string {
  let sortie = "";
  for (const c of texte) {
    const remplacement = REMPLACEMENTS[c] ?? (policeEmbarquee ? undefined : REPLIS_SANS_POLICE[c]);
    if (remplacement !== undefined) sortie += remplacement;
    else if (policeEmbarquee || (c.codePointAt(0) ?? 0) <= 0xff) sortie += c;
  }
  return sortie;
}

/** Montant formaté. La devise dépend de la présence d'une police embarquée. */
export function formaterMontant(v: number, devise: string): string {
  return `${v < 0 ? "-" : ""}${Math.abs(v).toFixed(2).replace(".", ",")} ${devise}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

function pourcent(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} %`;
}

/**
 * Trace un dégradé horizontal à trois bornes.
 *
 * jsPDF n'expose pas les motifs de dégradé du format PDF : on peint des bandes
 * verticales dont la couleur progresse. Elles se chevauchent d'un dixième de
 * millimètre, faute de quoi certains lecteurs laissent voir un filet blanc
 * entre deux bandes contiguës.
 */
function degradeHorizontal(
  doc: jsPDF,
  x: number,
  y: number,
  largeur: number,
  hauteur: number,
  bornes: [number, number, number][],
) {
  // 90 bandes : 2,3 mm de large, et deux niveaux d'écart au plus entre deux
  // bandes voisines — invisible. Doubler leur nombre doublait le poids du
  // fichier pour un gain que l'œil ne perçoit pas.
  const BANDES = 90;
  const pas = largeur / BANDES;

  for (let i = 0; i < BANDES; i++) {
    const t = i / (BANDES - 1);
    // Deux segments : première borne → deuxième, puis deuxième → troisième.
    const segment = t < 0.5 ? 0 : 1;
    const local = segment === 0 ? t * 2 : (t - 0.5) * 2;
    const a = bornes[segment];
    const b = bornes[segment + 1];

    doc.setFillColor(
      Math.round(a[0] + (b[0] - a[0]) * local),
      Math.round(a[1] + (b[1] - a[1]) * local),
      Math.round(a[2] + (b[2] - a[2]) * local),
    );
    doc.rect(x + i * pas, y, pas + 0.1, hauteur, "F");
  }
}

/**
 * Logo complet « Kshare », en blanc : il se détache sur le bandeau dégradé.
 * Chargé une fois pour toutes — une facture par commerce et par mois, c'est
 * autant de lectures disque inutiles sans cache.
 */
const LOGO_LARGEUR = 34; // mm
const LOGO_RATIO = 541 / 192;

let logoCache: string | null | undefined;
function logoDataUrl(): string | null {
  if (logoCache !== undefined) return logoCache;
  try {
    const fichier = path.join(process.cwd(), "public", "logo-kshare-blanc.png");
    logoCache = `data:image/png;base64,${readFileSync(fichier).toString("base64")}`;
  } catch {
    // Sans logo la facture reste valide : on ne fait pas échouer une émission
    // pour un élément décoratif.
    logoCache = null;
  }
  return logoCache;
}

export function generateInvoicePdf(params: InvoicePdfParams): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // ── Police ──
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

  function police(graisse: "normal" | "bold") {
    doc.setFont(famille, graisse);
  }

  // Une facture avec TVA n'existera qu'au jour de l'assujettissement ; d'ici là
  // le bloc de taxe reste absent plutôt que rempli de zéros.
  const avecTva = params.tauxTva > 0;
  // Le pied de page porte les mentions obligatoires de l'émetteur : le corps du
  // document ne doit jamais descendre dessous.
  const HAUT_PIED = 262;

  let y = 0;

  /** Seul point d'écriture : rien ne doit atteindre la page sans assainissement. */
  function ecrire(
    texte: string,
    x: number,
    yy: number,
    options?: Parameters<typeof doc.text>[3],
  ) {
    doc.text(assainirTexte(texte, polices !== null), x, yy, options);
  }

  /**
   * Écrit un texte en capitales espacées, calé à droite.
   *
   * L'alignement natif de jsPDF ignore l'espacement des caractères : le titre
   * du document débordait de la feuille. On mesure donc la largeur réelle,
   * espacement compris, et on pose le texte à gauche de la borne voulue.
   */
  function ecrireEspaceADroite(texte: string, xDroite: number, yy: number, espacement: number) {
    const propre = assainirTexte(texte, polices !== null);
    doc.setCharSpace(espacement);
    // `getTextWidth` tient déjà compte de l'espacement en vigueur : le lui
    // rajouter décalait le titre de quinze millimètres vers la gauche, et il
    // ne tombait plus sous le numéro.
    doc.text(propre, xDroite - doc.getTextWidth(propre), yy);
    doc.setCharSpace(0);
  }

  /**
   * Découpe un libellé pour qu'il tienne dans sa colonne.
   *
   * `splitTextToSize` coupe aux espaces ; un mot plus long que la colonne la
   * traverserait quand même et viendrait chevaucher la colonne voisine. On
   * tronque donc ce qui dépasse encore.
   */
  function couper(texte: string, largeur: number): string[] {
    const propre = assainirTexte(texte, polices !== null);
    const lignes = doc.splitTextToSize(propre, largeur) as string[];
    return lignes.map((l) => {
      if (doc.getTextWidth(l) <= largeur) return l;
      let court = l;
      while (court.length > 1 && doc.getTextWidth(`${court}...`) > largeur) {
        court = court.slice(0, -1);
      }
      return `${court}...`;
    });
  }

  function nouvellePage() {
    doc.addPage();
    // Un simple liseré : le bandeau complet n'a de sens que sur la première
    // page, l'annexe n'a pas à se présenter deux fois.
    degradeHorizontal(doc, 0, 0, pageWidth, 3, DEGRADE);
    y = 22;
  }

  function saut(hauteur: number) {
    if (y + hauteur > HAUT_PIED - 4) nouvellePage();
  }

  // ── Bandeau ──
  //
  // Le logo portant le nom, il n'est pas redoublé en texte : à droite, seuls la
  // nature du document et son numéro, qui est ce qu'on cherche quand on classe
  // une facture.
  degradeHorizontal(doc, 0, 0, pageWidth, 34, DEGRADE);

  const logo = logoDataUrl();
  if (logo) {
    try {
      // Sans compression, jsPDF embarque l'image brute : 409 Ko par facture,
      // contre 15 Ko ici. À raison d'une facture par commerce et par mois, la
      // différence se compte en centaines de mégaoctets de stockage.
      doc.addImage(
        logo,
        "PNG",
        margin,
        11,
        LOGO_LARGEUR,
        LOGO_LARGEUR / LOGO_RATIO,
        undefined,
        "SLOW",
      );
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      police("bold");
      ecrire(EMETTEUR.nomCommercial, margin, 21);
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    police("bold");
    ecrire(EMETTEUR.nomCommercial, margin, 21);
  }

  doc.setTextColor(...BLANC_BLEUTE);
  doc.setFontSize(8);
  police("normal");
  ecrireEspaceADroite(TITRES[params.nature].toUpperCase(), pageWidth - margin, 14.5, 1.2);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  police("bold");
  ecrire(params.numero, pageWidth - margin, 23, { align: "right" });

  doc.setTextColor(...BLANC_BLEUTE);
  doc.setFontSize(8.5);
  police("normal");
  ecrire(`Émise le ${formatDate(params.emiseLe)}`, pageWidth - margin, 28.5, { align: "right" });

  // ── Émetteur et client, côte à côte ──
  y = 48;
  doc.setTextColor(...BLEU);
  doc.setFontSize(9);
  police("bold");
  ecrire("ÉMETTEUR", margin, y);
  ecrire("FACTURÉ À", pageWidth / 2 + 5, y);

  y += 6;
  doc.setTextColor(...GRIS_TEXTE);

  const emetteur = blocEmetteurEnTete();
  const client = [
    params.client.nom,
    params.client.adresse ?? "",
    `${params.client.codePostal ?? ""} ${params.client.ville ?? ""}`.trim(),
    params.client.siret ? `SIRET ${params.client.siret}` : "",
    params.client.email ?? "",
  ].filter((l) => l && l.trim());

  const hauteurBloc = Math.max(emetteur.length, client.length) * 5 + 4;
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(margin, y - 4, contentWidth / 2 - 5, hauteurBloc, 2, 2, "F");
  doc.roundedRect(pageWidth / 2 + 5, y - 4, contentWidth / 2 - 5, hauteurBloc, 2, 2, "F");

  doc.setFontSize(9.5);
  police("bold");
  ecrire(emetteur[0] ?? "", margin + 4, y + 1);
  ecrire(client[0] ?? "", pageWidth / 2 + 9, y + 1);
  police("normal");
  doc.setFontSize(8.5);
  for (let i = 1; i < emetteur.length; i++) ecrire(emetteur[i], margin + 4, y + 1 + i * 5);
  for (let i = 1; i < client.length; i++) ecrire(client[i], pageWidth / 2 + 9, y + 1 + i * 5);

  y += hauteurBloc + 8;

  // ── Période ──
  doc.setFontSize(9.5);
  doc.setTextColor(...GRIS_TEXTE);
  ecrire(
    `Période facturée : ${params.periodeLibelle} (du ${formatDateCourte(params.periodeDebut)} au ${formatDateCourte(params.periodeFin)})`,
    margin,
    y,
  );
  y += 10;

  // ── Tableau des lignes ──
  //
  // Désignation à gauche, base et taux centrés, montant à droite. La zone de
  // désignation s'arrête avant la colonne « base » et le libellé y est
  // découpé : il ne peut donc pas venir chevaucher les chiffres.
  const xDesignation = margin + 3;
  const largeurDesignation = 83;
  const centreBase = margin + 104;
  const centreTaux = margin + 132;
  const droiteMontant = pageWidth - margin - 3;

  doc.setFillColor(...BLEU);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  police("bold");
  ecrire("DÉSIGNATION", xDesignation, y + 5.5);
  ecrire("BASE", centreBase, y + 5.5, { align: "center" });
  ecrire("TAUX", centreTaux, y + 5.5, { align: "center" });
  ecrire("MONTANT", droiteMontant, y + 5.5, { align: "right" });
  y += 8;

  doc.setTextColor(...GRIS_TEXTE);
  police("normal");
  doc.setFontSize(9);

  let pair = false;
  for (const ligne of params.lignes) {
    const lignesTexte = couper(ligne.libelle, largeurDesignation);
    const hauteur = Math.max(9, lignesTexte.length * 4.5 + 4);
    saut(hauteur);

    if (pair) {
      doc.setFillColor(250, 251, 255);
      doc.rect(margin, y, contentWidth, hauteur, "F");
    }
    pair = !pair;

    // Une ligne négative rend de la commission : toute la ligne se lit en
    // rouge — libellé, assiette et taux compris — sinon l'œil ne repère que le
    // montant et prend le reste pour une vente ordinaire.
    doc.setTextColor(...(ligne.montant < 0 ? ROUGE : GRIS_TEXTE));
    lignesTexte.forEach((t, i) => ecrire(t, xDesignation, y + 6 + i * 4.5));
    if (ligne.base !== undefined) ecrire(euros(ligne.base), centreBase, y + 6, { align: "center" });
    if (ligne.taux !== undefined) {
      ecrire(pourcent(ligne.taux), centreTaux, y + 6, { align: "center" });
    }
    ecrire(euros(ligne.montant), droiteMontant, y + 6, { align: "right" });
    doc.setTextColor(...GRIS_TEXTE);
    y += hauteur;
  }

  doc.setDrawColor(220, 222, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Totaux ──
  //
  // La commission non appliquée apparaît sur sa propre ligne, retranchée de la
  // commission de la période. Ne montrer que le net laisserait le commerçant
  // devant un montant plus faible que prévu sans lui en donner la raison ; le
  // détail du calcul, lui, est dans le tableau au-dessus, assiette et taux
  // compris.
  saut(45);
  const gaucheTotaux = pageWidth - margin - 70;
  doc.setFontSize(9.5);

  const brut = params.lignes.filter((l) => l.montant > 0).reduce((s, l) => s + l.montant, 0);
  const remise = params.lignes.filter((l) => l.montant < 0).reduce((s, l) => s + l.montant, 0);

  if (remise < 0) {
    ecrire(
      params.nature === "commission" ? "Commission de la période" : "Sous-total",
      gaucheTotaux,
      y,
    );
    ecrire(euros(brut), droiteMontant, y, { align: "right" });
    y += 6;
    doc.setTextColor(...ROUGE);
    ecrire("Commission non appliquée", gaucheTotaux, y);
    ecrire(euros(remise), droiteMontant, y, { align: "right" });
    doc.setTextColor(...GRIS_TEXTE);
    y += 6;
  }

  if (avecTva) {
    ecrire("Total HT", gaucheTotaux, y);
    ecrire(euros(params.total - params.montantTva), droiteMontant, y, { align: "right" });
    y += 6;
    ecrire(`TVA (${pourcent(params.tauxTva)})`, gaucheTotaux, y);
    ecrire(euros(params.montantTva), droiteMontant, y, { align: "right" });
  }
  y += 3;

  doc.setFillColor(...BLEU);
  doc.roundedRect(gaucheTotaux - 5, y, 75, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  police("bold");
  doc.setFontSize(10.5);
  ecrire(avecTva ? "Total TTC" : "Total HT", gaucheTotaux, y + 7.5);
  ecrire(euros(params.total), droiteMontant, y + 7.5, { align: "right" });
  y += 15;

  // Sans TVA, c'est cette mention — et non un « 0 % » trompeur — qui explique
  // l'absence de taxe. Elle se lit donc collée au total, pas noyée plus bas.
  if (!avecTva) {
    doc.setTextColor(...GRIS_TEXTE);
    police("normal");
    doc.setFontSize(8);
    ecrire(EMETTEUR.mentionTva, droiteMontant, y, { align: "right" });
    y += 8;
  } else {
    y += 5;
  }

  // ── Règlement ──
  doc.setTextColor(...GRIS_TEXTE);
  police("normal");
  doc.setFontSize(9);
  saut(24);

  if (params.resteAPayer <= 0) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y - 5, contentWidth, 16, 2, 2, "F");
    police("bold");
    doc.setTextColor(21, 128, 61);
    ecrire("Facture acquittée — aucun paiement à effectuer.", margin + 4, y + 1);
    police("normal");
    doc.setTextColor(...GRIS_TEXTE);
    doc.setFontSize(8.5);
    ecrire(
      params.nature === "commission"
        ? "La commission a été prélevée à la source sur chaque transaction."
        : "L'abonnement a été réglé par prélèvement SEPA.",
      margin + 4,
      y + 6.5,
    );
    y += 20;
  } else {
    police("bold");
    ecrire(`Reste à payer : ${euros(params.resteAPayer)}`, margin, y);
    police("normal");
    y += 8;
  }

  // ── Mentions légales ──
  doc.setFontSize(8);
  doc.setTextColor(...GRIS_CLAIR);
  for (const mention of [TAUX_PENALITES_RETARD, INDEMNITE_RECOUVREMENT, ESCOMPTE]) {
    for (const l of couper(mention, contentWidth)) {
      saut(6);
      ecrire(l, margin, y);
      y += 4;
    }
    y += 1;
  }

  // ── Annexe : le détail commande par commande ──
  const commandes = params.commandes ?? [];
  if (commandes.length > 0) {
    nouvellePage();
    doc.setTextColor(...BLEU);
    doc.setFontSize(12);
    police("bold");
    ecrire("Annexe — détail des commandes", margin, y);
    y += 6;
    doc.setTextColor(...GRIS_CLAIR);
    doc.setFontSize(8);
    police("normal");
    ecrire("Les références correspondent à celles de votre espace commerçant.", margin, y);
    y += 8;

    // Six colonnes. « Montant initial » et « vente » se lisent ensemble : leur
    // écart est le remboursement, et le taux reste affiché même quand il ne
    // reste plus rien à vendre — c'est lui qui explique la ligne.
    const largeurReference = 24;
    const centreDate = margin + 40;
    const centreInitial = margin + 68;
    const centreVente = margin + 96;
    const centreTauxAnnexe = margin + 122;

    doc.setFillColor(...BLEU);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    police("bold");
    ecrire("COMMANDE", xDesignation, y + 5);
    ecrire("DATE", centreDate, y + 5, { align: "center" });
    ecrire("MONTANT INITIAL", centreInitial, y + 5, { align: "center" });
    ecrire("VENTE", centreVente, y + 5, { align: "center" });
    ecrire("TAUX", centreTauxAnnexe, y + 5, { align: "center" });
    ecrire("COMMISSION", droiteMontant, y + 5, { align: "right" });
    y += 7;

    police("normal");
    let alt = false;

    // Les régularisations en second : elles concernent d'autres périodes, et
    // les mêler aux commandes du mois brouillerait le rapprochement.
    const ordonnees = [
      ...commandes.filter((c) => !c.regularisation),
      ...commandes.filter((c) => c.regularisation),
    ];
    let separateurPose = false;

    for (const c of ordonnees) {
      if (c.regularisation && !separateurPose) {
        separateurPose = true;
        saut(14);
        y += 3;
        doc.setTextColor(...BLEU);
        doc.setFontSize(8);
        police("bold");
        ecrire("Régularisations de périodes antérieures", xDesignation, y + 4);
        police("normal");
        y += 8;
      }

      const mention = mentionRemboursement(c);
      // Une ligne remboursée porte sa mention sous la référence : la glisser à
      // côté la ferait chevaucher la colonne des dates.
      const hauteur = mention ? 9 : 6;
      saut(hauteur + 2);

      if (alt) {
        doc.setFillColor(250, 251, 255);
        doc.rect(margin, y, contentWidth, hauteur, "F");
      }
      alt = !alt;

      // Dès qu'un remboursement est en jeu, toute la ligne passe au rouge : on
      // parcourt une annexe en diagonale, et une couleur sur le seul montant se
      // laisse manquer.
      const touchee = c.rembourse > 0 || c.commission < 0;

      doc.setFontSize(8);
      doc.setTextColor(...(touchee ? ROUGE : GRIS_TEXTE));
      ecrire(couper(c.reference, largeurReference)[0] ?? "", xDesignation, y + 4.2);
      ecrire(formatDateCourte(c.date), centreDate, y + 4.2, { align: "center" });
      ecrire(euros(c.montantInitial), centreInitial, y + 4.2, { align: "center" });
      ecrire(euros(c.vente), centreVente, y + 4.2, { align: "center" });
      // Le taux se calcule sur le montant initial : une commande intégralement
      // remboursée n'a plus de vente, mais elle a bien été conclue à un taux.
      if (c.tauxApplique !== null) {
        ecrire(pourcent(c.tauxApplique), centreTauxAnnexe, y + 4.2, { align: "center" });
      }
      ecrire(euros(c.commission), droiteMontant, y + 4.2, { align: "right" });

      if (mention) {
        doc.setFontSize(7);
        ecrire(mention, xDesignation, y + 8);
      }

      doc.setTextColor(...GRIS_TEXTE);
      y += hauteur;
    }
  }

  // ── Pied de page ──
  //
  // Porte l'identité complète de l'émetteur sur chaque page. La loi impose ces
  // mentions sur la facture, sans en fixer l'emplacement : les reléguer en pied
  // les rend présentes partout sans faire concurrence au nom du client.
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
    ecrire(`${params.numero} — Page ${i}/${total}`, pageWidth / 2, HAUT_PIED + 15, {
      align: "center",
    });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
