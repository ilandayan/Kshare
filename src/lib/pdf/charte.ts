/**
 * Socle graphique commun aux documents Kshare.
 *
 * Extrait de la génération de factures quand le relevé de ventes est arrivé :
 * bandeau, police embarquée, assainissement du texte et pied de page sont les
 * mêmes des deux côtés, et les dupliquer aurait garanti qu'ils divergent au
 * premier ajustement.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { jsPDF } from "jspdf";

export const BLEU: [number, number, number] = [55, 68, 200];
/** Dégradé de la marque, repris de l'en-tête de l'espace de gestion. */
export const DEGRADE: [number, number, number][] = [
  [30, 42, 120], // #1e2a78
  [55, 68, 200], // #3744C8
  [91, 110, 245], // #5B6EF5
];
export const GRIS_TEXTE: [number, number, number] = [51, 51, 51];
export const GRIS_CLAIR: [number, number, number] = [130, 130, 130];
export const ROUGE: [number, number, number] = [185, 28, 28];
export const VERT: [number, number, number] = [21, 128, 61];
export const BLANC_BLEUTE: [number, number, number] = [215, 220, 250];

/** Hauteur à partir de laquelle le pied de page commence. */
export const HAUT_PIED = 262;

export const POLICE = "NotoSans";
export const LOGO_LARGEUR = 34; // mm
export const LOGO_RATIO = 541 / 192;

/**
 * Polices embarquées. Noto Sans, licence SIL Open Font — `public/fonts/OFL.txt`.
 *
 * Les fichiers vivent dans `public/` et non dans `src/` : Next ne déploie que
 * ce qu'il a tracé depuis les imports, et un `readFileSync` sur une source non
 * importée ne trouverait rien une fois en production.
 */
let policesCache: { normal: string; bold: string } | null | undefined;
export function chargerPolices(): { normal: string; bold: string } | null {
  if (policesCache !== undefined) return policesCache;
  try {
    const dossier = path.join(process.cwd(), "public", "fonts");
    policesCache = {
      normal: readFileSync(path.join(dossier, "NotoSans-Regular.ttf")).toString("base64"),
      bold: readFileSync(path.join(dossier, "NotoSans-Bold.ttf")).toString("base64"),
    };
  } catch {
    // Sans police embarquée on retombe sur helvetica : le document reste
    // lisible, seule la devise redevient un code ISO.
    policesCache = null;
  }
  return policesCache;
}

let logoCache: string | null | undefined;
export function logoDataUrl(): string | null {
  if (logoCache !== undefined) return logoCache;
  try {
    const fichier = path.join(process.cwd(), "public", "logo-kshare-blanc.png");
    logoCache = `data:image/png;base64,${readFileSync(fichier).toString("base64")}`;
  } catch {
    logoCache = null;
  }
  return logoCache;
}

/** Le signe moins typographique casse les polices intégrées, et se lit mal en colonne. */
const REMPLACEMENTS: Record<string, string> = {
  "\u2212": "-", // signe moins typographique
  "\u00A0": " ", // espace insécable
  "\u202F": " ", // espace fine insécable
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
 * Ramène un texte à ce que la police sait écrire.
 *
 * Les polices intégrées de jsPDF sont encodées WinAnsi : un caractère hors
 * table est au mieux escamoté — l'euro disparaissait de toutes les factures —
 * au pire fatal, le signe moins U+2212 faisant basculer la chaîne entière en
 * UTF-16. Exporté pour être éprouvé directement : une fois la police
 * embarquée, le texte du PDF est écrit en identifiants de glyphes, illisible
 * depuis le fichier.
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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function pourcent(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} %`;
}

/**
 * Trace un dégradé horizontal à trois bornes.
 *
 * jsPDF n'expose pas les motifs de dégradé du format PDF : on peint des bandes
 * verticales dont la couleur progresse. Elles se chevauchent d'un dixième de
 * millimètre, faute de quoi certains lecteurs laissent voir un filet blanc
 * entre deux bandes contiguës. Quatre-vingt-dix bandes suffisent : deux
 * niveaux d'écart au plus entre voisines, et doubler leur nombre doublait le
 * poids du fichier pour un gain invisible.
 */
export function degradeHorizontal(
  doc: jsPDF,
  x: number,
  y: number,
  largeur: number,
  hauteur: number,
  bornes: [number, number, number][] = DEGRADE,
) {
  const BANDES = 90;
  const pas = largeur / BANDES;

  for (let i = 0; i < BANDES; i++) {
    const t = i / (BANDES - 1);
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
 * Pose le logo dans le bandeau.
 *
 * Sans l'option de compression, jsPDF embarque l'image brute : 409 Ko par
 * document contre 15 Ko ici. À raison d'un document par commerce et par mois,
 * la différence se compte en centaines de mégaoctets de stockage.
 */
export function poserLogo(doc: jsPDF, x: number, y: number): boolean {
  const logo = logoDataUrl();
  if (!logo) return false;
  try {
    doc.addImage(logo, "PNG", x, y, LOGO_LARGEUR, LOGO_LARGEUR / LOGO_RATIO, undefined, "SLOW");
    return true;
  } catch {
    return false;
  }
}
