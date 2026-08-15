/**
 * Calcul de ce qu'il y a à facturer sur un mois donné.
 *
 * Deux natures de document, volontairement séparées :
 *
 * — la **commission**, récapitulatif de transactions déjà prélevées à la
 *   source, dont le montant ne se connaît qu'après coup ;
 * — l'**abonnement Pro**, prix fixe réglé par prélèvement SEPA à date.
 *
 * Les mélanger empêchait le rapprochement bancaire : le commerce voyait un
 * total qui ne correspondait à aucun mouvement de son compte.
 *
 * L'agrégation elle-même vit en base (`facturation_recap`, `facturation_detail`)
 * plutôt qu'ici : comparer la commission due à celle déjà facturée porte sur
 * deux colonnes, ce que l'API REST ne sait pas exprimer, et une somme calculée
 * en SQL ne bute pas sur la limite de mille lignes.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

/** Une ligne de facture, telle qu'elle sera figée dans `invoices.lines`. */
export interface LigneFacture {
  libelle: string;
  /** Assiette de la commission. Absent pour l'abonnement. */
  base?: number;
  /** Taux de commission en pourcentage. Absent pour l'abonnement. */
  taux?: number;
  montant: number;
}

/** Une commande, telle qu'elle figure au détail de la facture. */
export interface LigneCommande {
  reference: string;
  date: string;
  /** Prix de vente d'origine, avant tout remboursement. */
  montantInitial: number;
  /** Ce qui reste acquis après remboursement. */
  vente: number;
  /**
   * Taux de commission appliqué à la commande.
   *
   * Calculé sur le montant initial, et non sur ce qui reste : une commande
   * intégralement remboursée n'a plus de vente, mais elle a bien été conclue à
   * un taux, et c'est ce taux qui explique la ligne.
   */
  tauxApplique: number | null;
  /** Commission due au titre de cette ligne. Négative pour une correction. */
  commission: number;
  rembourse: number;
  remboursementIntegral: boolean;
  regularisation: boolean;
}

export type NatureFacture = "commission" | "subscription";

export interface FactureExistante {
  id: string;
  kind: string;
  number: string | null;
  status: string;
  amount_ttc: number;
  issued_at: string | null;
  pdf_url: string | null;
  sent_at: string | null;
}

interface IdentiteCommerce {
  commerceId: string;
  nom: string;
  email: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  siret: string | null;
  plan: string;
}

export interface RecapCommission extends IdentiteCommerce {
  tauxCommission: number;
  /** Prix de vente encaissé sur la période, avant remboursements. */
  ventes: number;
  /** Commission due au titre des commandes du mois, avant remboursements. */
  commission: number;
  /** Remboursements accordés pendant la période : assiette. */
  rembPeriodeBase: number;
  /** Commission non appliquée à ce titre. Négative. */
  rembPeriode: number;
  rembPeriodeCommandes: number;
  /** Remboursements sur des périodes déjà facturées : assiette. */
  remiseBase: number;
  /** Commission non appliquée à ce titre. Négative. */
  remise: number;
  remiseCommandes: number;
  /** Ventes de périodes antérieures jamais facturées : assiette de la reprise. */
  repriseBase: number;
  /** Commission rattrapée à ce titre. Positive. */
  reprise: number;
  repriseCommandes: number;
  /** Somme des corrections portant sur des périodes antérieures. */
  regularisation: number;
  paniers: number;
  paniersRegularises: number;
  paniersRembourses: number;
  total: number;
  lignes: LigneFacture[];
  commandes: LigneCommande[];
  orderIds: string[];
  facture: FactureExistante | null;
}

export interface RecapAbonnement extends IdentiteCommerce {
  montant: number;
  lignes: LigneFacture[];
  facture: FactureExistante | null;
}

/** Bornes d'un mois au format `YYYY-MM`. */
export function bornesPeriode(periode: string): { debut: Date; fin: Date } {
  const [annee, mois] = periode.split("-").map((n) => parseInt(n, 10));
  return {
    debut: new Date(Date.UTC(annee, mois - 1, 1)),
    // Premier instant du mois suivant : borne haute exclue.
    fin: new Date(Date.UTC(annee, mois, 1)),
  };
}

export function libellePeriode(periode: string): string {
  const { debut } = bornesPeriode(periode);
  return debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Référence courte d'une commande, telle qu'elle apparaît déjà dans
 * l'application. Le commerce doit retrouver la commande sur son écran à partir
 * de la facture, sans conversion mentale.
 */
export function referenceCommande(id: string): string {
  return `#${id.slice(0, 8)}`;
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}

function euros(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} €`;
}

type IdentitesParId = Map<string, IdentiteCommerce>;

async function identitesCommerces(): Promise<IdentitesParId> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("commerces")
    .select("id, name, email, address, postal_code, city, siret, subscription_plan")
    .eq("is_demo", false);

  const map: IdentitesParId = new Map();
  for (const c of data ?? []) {
    map.set(c.id, {
      commerceId: c.id,
      nom: c.name,
      email: c.email,
      adresse: c.address,
      codePostal: c.postal_code,
      ville: c.city,
      siret: c.siret,
      plan: (c.subscription_plan as string | null) ?? "starter",
    });
  }
  return map;
}

async function facturesDeLaPeriode(debut: Date): Promise<Map<string, FactureExistante>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, kind, number, status, amount_ttc, issued_at, pdf_url, sent_at, commerce_id")
    .eq("period_start", debut.toISOString().slice(0, 10));

  // Clé composite : un commerce peut avoir une facture de commission et une
  // facture d'abonnement sur le même mois.
  const map = new Map<string, FactureExistante>();
  for (const f of data ?? []) {
    if (f.commerce_id) map.set(`${f.commerce_id}:${f.kind}`, f as FactureExistante);
  }
  return map;
}

/**
 * Détail des commandes couvertes par la facture d'un commerce.
 *
 * Sert à l'annexe du PDF : sans elle, « commission sur 42 paniers » n'est
 * vérifiable par personne, et un remboursement se lit comme une erreur de
 * calcul.
 */
export async function detailCommandes(
  periode: string,
  commerceId: string,
): Promise<LigneCommande[]> {
  const supabase = createAdminClient();
  const { debut, fin } = bornesPeriode(periode);

  const { data, error } = await supabase.rpc("facturation_detail", {
    p_debut: debut.toISOString(),
    p_fin: fin.toISOString(),
    p_commerce: commerceId,
  });

  if (error) throw new Error(`Détail des commandes : ${error.message}`);

  return (data ?? []).map((d) => {
    const brute = Number(d.vente_brute);
    return {
      reference: referenceCommande(d.order_id),
      date: d.captured_at,
      montantInitial: brute,
      vente: Number(d.vente),
      tauxApplique: brute > 0 ? arrondi((Number(d.commission_brute) / brute) * 100) : null,
      commission: Number(d.delta),
      rembourse: Number(d.rembourse),
      remboursementIntegral: d.remboursement_integral,
      regularisation: d.est_regularisation,
    };
  });
}

/**
 * Ce qu'il y a à facturer en commission sur la période, commerce par commerce.
 */
export async function recapitulatifCommissions(periode: string): Promise<RecapCommission[]> {
  const supabase = createAdminClient();
  const { debut, fin } = bornesPeriode(periode);

  const [{ data: recap, error }, identites, factures] = await Promise.all([
    supabase.rpc("facturation_recap", {
      p_debut: debut.toISOString(),
      p_fin: fin.toISOString(),
    }),
    identitesCommerces(),
    facturesDeLaPeriode(debut),
  ]);

  if (error) throw new Error(`Récapitulatif de facturation : ${error.message}`);

  const resultats: RecapCommission[] = [];

  for (const r of recap ?? []) {
    const identite = identites.get(r.commerce_id);
    if (!identite) continue;

    const ventes = arrondi(Number(r.ventes_brutes));
    const commission = arrondi(Number(r.commission_brute));
    const rembPeriodeBase = arrondi(Number(r.remb_periode_base));
    const rembPeriode = arrondi(Number(r.remb_periode_montant));
    const remiseBase = arrondi(Number(r.remise_base));
    const remise = arrondi(Number(r.remise_montant));
    const repriseBase = arrondi(Number(r.reprise_base));
    const reprise = arrondi(Number(r.reprise_montant));
    const regularisation = arrondi(remise + reprise);
    const total = arrondi(commission + rembPeriode + regularisation);

    // Un total nul ne justifie pas un document : ni recette, ni correction.
    if (Math.abs(total) < 0.01) continue;

    const tauxNominal =
      identite.plan === "pro"
        ? SUBSCRIPTION_PLANS.pro.commissionRate
        : SUBSCRIPTION_PLANS.starter.commissionRate;
    // Taux effectivement constaté : un geste commercial sur une capture
    // partielle l'écarte du nominal, et c'est le constaté qui doit figurer.
    const taux = ventes > 0 ? arrondi((commission / ventes) * 100) : tauxNominal;

    const commandes = await detailCommandes(periode, r.commerce_id);
    const mois = libellePeriode(periode);

    /** Une ligne ne porte un taux que si son assiette en autorise le calcul. */
    const tauxDe = (montant: number, base: number) =>
      base > 0 ? arrondi((Math.abs(montant) / base) * 100) : undefined;

    const lignes: LigneFacture[] = [];
    if (commission !== 0) {
      lignes.push({
        libelle: `Commission sur ${r.paniers} panier${r.paniers > 1 ? "s" : ""} vendu${r.paniers > 1 ? "s" : ""} — ${mois}`,
        base: ventes,
        taux,
        montant: commission,
      });
    }

    // Remboursement accordé avant l'émission : la commission de la commande
    // arrive déjà nette, mais la taire donnerait une commission amputée sans
    // raison visible.
    if (rembPeriode !== 0) {
      lignes.push({
        libelle: `Commission non appliquée sur ${r.remb_periode_commandes} commande${r.remb_periode_commandes > 1 ? "s" : ""} remboursée${r.remb_periode_commandes > 1 ? "s" : ""} — ${mois} (détail en annexe)`,
        base: rembPeriodeBase,
        taux: tauxDe(rembPeriode, rembPeriodeBase),
        montant: rembPeriode,
      });
    }

    // Remboursement accordé après l'émission de la facture concernée, que
    // celle-ci ne pouvait plus corriger puisqu'elle est figée.
    if (remise !== 0) {
      lignes.push({
        libelle: `Commission non appliquée sur ${r.remise_commandes} commande${r.remise_commandes > 1 ? "s" : ""} remboursée${r.remise_commandes > 1 ? "s" : ""} — périodes antérieures (détail en annexe)`,
        base: remiseBase,
        taux: tauxDe(remise, remiseBase),
        montant: remise,
      });
    }

    // Rare, mais séparé des remises : l'assiette est une vente et non un
    // remboursement, les mêler donnerait un taux dénué de sens.
    if (reprise !== 0) {
      lignes.push({
        libelle: `Commission sur ${r.reprise_commandes} commande${r.reprise_commandes > 1 ? "s" : ""} de périodes antérieures non facturée${r.reprise_commandes > 1 ? "s" : ""} (détail en annexe)`,
        base: repriseBase,
        taux: tauxDe(reprise, repriseBase),
        montant: reprise,
      });
    }

    resultats.push({
      ...identite,
      tauxCommission: taux,
      ventes,
      commission,
      rembPeriodeBase,
      rembPeriode,
      rembPeriodeCommandes: r.remb_periode_commandes,
      remiseBase,
      remise,
      remiseCommandes: r.remise_commandes,
      repriseBase,
      reprise,
      repriseCommandes: r.reprise_commandes,
      regularisation,
      paniers: r.paniers,
      paniersRegularises: r.remise_commandes + r.reprise_commandes,
      paniersRembourses: r.remb_periode_commandes + r.remise_commandes,
      total,
      lignes,
      commandes,
      orderIds: [],
      facture: factures.get(`${r.commerce_id}:commission`) ?? null,
    });
  }

  return resultats.sort((a, b) => b.total - a.total);
}

/**
 * Ce qu'il y a à facturer en abonnement sur la période.
 *
 * Un abonnement offert n'y figure pas : il ne donne lieu à aucun encaissement,
 * et une facture sans mouvement bancaire en face n'aide personne.
 */
export async function recapitulatifAbonnements(periode: string): Promise<RecapAbonnement[]> {
  const supabase = createAdminClient();
  const { debut, fin } = bornesPeriode(periode);

  const [{ data: abonnements }, identites, factures] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("commerce_id, plan, monthly_price, status, created_at, canceled_at")
      .eq("plan", "pro"),
    identitesCommerces(),
    facturesDeLaPeriode(debut),
  ]);

  const resultats: RecapAbonnement[] = [];

  for (const a of abonnements ?? []) {
    const identite = identites.get(a.commerce_id);
    if (!identite) continue;
    if (a.status === "offered") continue;
    // L'abonnement se facture s'il courait pendant la période.
    if (new Date(a.created_at) >= fin) continue;
    if (a.canceled_at && new Date(a.canceled_at) < debut) continue;

    const montant = arrondi(Number(a.monthly_price ?? SUBSCRIPTION_PLANS.pro.monthlyPrice));
    if (montant <= 0) continue;

    resultats.push({
      ...identite,
      montant,
      lignes: [
        {
          libelle: `Abonnement Pro — ${libellePeriode(periode)}`,
          montant,
        },
      ],
      facture: factures.get(`${a.commerce_id}:subscription`) ?? null,
    });
  }

  return resultats.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/**
 * Commandes dont la capture est suspendue, en attente d'une décision.
 *
 * Un signalement client suspend la capture : tant que l'admin n'a pas tranché,
 * aucune commission n'a été prélevée, et il n'y a donc rien à facturer. Ces
 * commandes seront facturées le mois où la décision tombe, pas le mois de la
 * vente. Le montant en jeu se voit à l'écran, faute de quoi un écart entre le
 * chiffre d'affaires et la facturation resterait inexpliqué.
 */
export async function commissionEnAttenteDeDecision(): Promise<{
  commandes: number;
  commission: number;
}> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("commission_amount, commerces!inner(is_demo)")
    .eq("commerces.is_demo", false)
    .eq("capture_status", "pending")
    .eq("is_donation", false);

  const lignes = (data ?? []) as unknown as { commission_amount: number }[];
  return {
    commandes: lignes.length,
    commission: arrondi(lignes.reduce((s, o) => s + Number(o.commission_amount), 0)),
  };
}

/**
 * Compte les commandes encaissées qu'aucune période ne réclamera jamais.
 *
 * La facturation range les commandes par date de capture. Une commande
 * capturée sans cette date n'appartient à aucun mois : elle ne serait pas
 * facturée en retard, elle ne le serait jamais. Le cas ne devrait pas se
 * produire — la capture pose toujours les deux champs ensemble — mais un trou
 * de recette qui ne se voit pas est un trou qu'on ne comble pas.
 */
export async function commandesSansDateDeCapture(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("orders")
    // Jointure interne pour écarter les commerces de démonstration : leurs
    // commandes de jeu sont antérieures à la capture différée et n'ont jamais
    // porté de date, elles ne sont pas une anomalie.
    .select("id, commerces!inner(is_demo)", { count: "exact", head: true })
    .eq("commerces.is_demo", false)
    .in("capture_status", ["captured", "partially_captured"])
    .eq("is_donation", false)
    .is("captured_at", null)
    .gt("commission_amount", 0);

  return count ?? 0;
}

/** Mention de remboursement d'une ligne de détail, vide s'il n'y en a pas. */
export function mentionRemboursement(c: LigneCommande): string {
  if (c.remboursementIntegral) return "remboursée intégralement";
  if (c.rembourse > 0) return `remboursée partiellement (${euros(c.rembourse)})`;
  return "";
}
