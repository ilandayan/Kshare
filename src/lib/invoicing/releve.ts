/**
 * Relevé de ventes mensuel d'un commerce.
 *
 * Ce n'est pas une facture, et la distinction est celle qui compte : le
 * commerce est le vendeur, Kshare ne fait que constater ce qui a transité par
 * son compte Stripe. Le document lui sert de justificatif de chiffre
 * d'affaires — sans lui, ses seules pièces sont un tableau de bord et des
 * virements bancaires, ce qui ne tient pas devant un contrôle.
 *
 * **Le chiffre d'affaires du commerce est le prix de vente, pas le net versé.**
 * La commission est pour lui une charge déductible, non une réduction de
 * recette. Un commerçant qui ne déclarerait que ses virements sous-déclarerait
 * de douze à dix-huit pour cent. Le relevé le dit en toutes lettres.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { bornesPeriode, libellePeriode, referenceCommande } from "@/lib/invoicing/compute";

/** Une commande, telle qu'elle figure au relevé. */
export interface LigneVente {
  reference: string;
  date: string;
  /** Prix de vente d'origine, avant remboursement. */
  montantInitial: number;
  rembourse: number;
  /** Ce qui reste acquis : le chiffre d'affaires de la ligne. */
  vente: number;
  commission: number;
  /** Ce que le commerce a effectivement perçu. */
  net: number;
  nature: NatureVente;
}

/**
 * Les trois façons dont un panier quitte le commerce.
 *
 * La distinction n'est pas cosmétique : un **don client** est un panier acheté
 * puis offert — le commerce est payé son prix entier, sans commission. Un **don
 * du commerce** est un panier qu'il offre lui-même, à zéro euro. Les confondre
 * reviendrait à lui montrer des recettes qu'il n'a pas eues, ou à masquer
 * celles qu'il a eues.
 */
export type NatureVente = "vente" | "don_client" | "don_commerce";

export interface Releve {
  commerceId: string;
  nom: string;
  email: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  siret: string | null;
  periode: string;
  periodeLibelle: string;
  debut: string;
  fin: string;
  ventes: number;
  commission: number;
  fraisService: number;
  remboursements: number;
  net: number;
  paniers: number;
  /** Paniers achetés par un client puis offerts : payés, sans commission. */
  donsClients: number;
  /** Paniers offerts par le commerce lui-même : aucun mouvement d'argent. */
  donsCommerce: number;
  lignes: LigneVente[];
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}

type CommandeReleve = {
  id: string;
  commerce_id: string;
  captured_at: string;
  total_amount: number;
  captured_amount: number | null;
  refunded_amount: number | null;
  commission_amount: number;
  commission_refunded: number | null;
  service_fee_amount: number | null;
  is_donation: boolean;
  baskets: { is_donation: boolean } | null;
};

/**
 * Ramène les commandes encaissées du mois, tous commerces confondus.
 *
 * Paginé : PostgREST plafonne à mille lignes, et un mois d'activité les
 * dépassera. Sans cela le relevé s'arrêterait en silence au millième panier —
 * et le commerce sous-déclarerait sans le savoir.
 */
async function commandesDuMois(debut: Date, fin: Date): Promise<CommandeReleve[]> {
  const supabase = createAdminClient();
  const TAILLE = 1000;
  const toutes: CommandeReleve[] = [];

  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, commerce_id, captured_at, total_amount, captured_amount, refunded_amount, commission_amount, commission_refunded, service_fee_amount, is_donation, commerces!inner(is_demo), baskets(is_donation)",
      )
      .eq("commerces.is_demo", false)
      .in("capture_status", ["captured", "partially_captured"])
      .gte("captured_at", debut.toISOString())
      .lt("captured_at", fin.toISOString())
      .order("captured_at", { ascending: true })
      .range(page * TAILLE, (page + 1) * TAILLE - 1);

    if (error) throw new Error(`Lecture des ventes : ${error.message}`);
    const lot = (data ?? []) as unknown as CommandeReleve[];
    toutes.push(...lot);
    if (lot.length < TAILLE) break;
  }

  return toutes;
}

/**
 * Construit le relevé de chaque commerce ayant vendu sur la période.
 *
 * Les dons y figurent : le commerce a bien remis un panier, même sans
 * contrepartie. Les omettre lui masquerait une partie de son activité.
 */
export async function relevesPeriode(periode: string): Promise<Releve[]> {
  const supabase = createAdminClient();
  const { debut, fin } = bornesPeriode(periode);

  const [commandes, { data: commerces }] = await Promise.all([
    commandesDuMois(debut, fin),
    supabase
      .from("commerces")
      .select("id, name, email, address, postal_code, city, siret")
      .eq("is_demo", false),
  ]);

  const identites = new Map((commerces ?? []).map((c) => [c.id, c]));
  const parCommerce = new Map<string, LigneVente[]>();

  for (const o of commandes) {
    const initial = Number(o.captured_amount ?? o.total_amount);
    const rembourse = Number(o.refunded_amount ?? 0);
    const vente = arrondi(initial - rembourse);
    const commission = arrondi(Number(o.commission_amount) - Number(o.commission_refunded ?? 0));

    // Un panier publié comme don par le commerce porte le drapeau côté panier ;
    // un panier ordinaire acheté puis offert ne le porte que côté commande.
    const nature: NatureVente = o.baskets?.is_donation
      ? "don_commerce"
      : o.is_donation
        ? "don_client"
        : "vente";

    const lignes = parCommerce.get(o.commerce_id) ?? [];
    lignes.push({
      reference: referenceCommande(o.id),
      date: o.captured_at,
      montantInitial: arrondi(initial),
      rembourse: arrondi(rembourse),
      vente,
      commission,
      net: arrondi(vente - commission),
      nature,
    });
    parCommerce.set(o.commerce_id, lignes);
  }

  const finIncluse = new Date(fin.getTime() - 86_400_000).toISOString().slice(0, 10);
  const resultats: Releve[] = [];

  for (const [commerceId, lignes] of parCommerce) {
    const identite = identites.get(commerceId);
    if (!identite) continue;

    const ventes = arrondi(lignes.reduce((s, l) => s + l.vente, 0));
    const commission = arrondi(lignes.reduce((s, l) => s + l.commission, 0));
    const remboursements = arrondi(lignes.reduce((s, l) => s + l.rembourse, 0));
    const fraisService = arrondi(
      commandes
        .filter((o) => o.commerce_id === commerceId)
        .reduce((s, o) => s + Number(o.service_fee_amount ?? 0), 0),
    );

    resultats.push({
      commerceId,
      nom: identite.name,
      email: identite.email,
      adresse: identite.address,
      codePostal: identite.postal_code,
      ville: identite.city,
      siret: identite.siret,
      periode,
      periodeLibelle: libellePeriode(periode),
      debut: debut.toISOString().slice(0, 10),
      fin: finIncluse,
      ventes,
      commission,
      fraisService,
      remboursements,
      net: arrondi(ventes - commission),
      paniers: lignes.filter((l) => l.nature === "vente").length,
      donsClients: lignes.filter((l) => l.nature === "don_client").length,
      donsCommerce: lignes.filter((l) => l.nature === "don_commerce").length,
      lignes,
    });
  }

  return resultats.sort((a, b) => b.ventes - a.ventes);
}

/**
 * Référence d'un relevé : `RV-AAAA-MM-XXXXXXXX`.
 *
 * Pas de suite continue comme pour une facture — un relevé ne constate pas une
 * créance et n'a pas d'obligation de numérotation. La référence doit seulement
 * être unique et parlante, et rester stable quand on la cherche.
 */
export function referenceReleve(periode: string, commerceId: string): string {
  return `RV-${periode}-${commerceId.slice(0, 8)}`;
}
