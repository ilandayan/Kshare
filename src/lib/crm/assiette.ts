/**
 * L'assiette déclarable : ce que Kshare doit déclarer à l'URSSAF et au fisc.
 *
 * C'est le point le plus facile à se tromper de tout le CRM. Le chiffre
 * d'affaires d'un intermédiaire **n'est pas** ce que les clients paient : le
 * prix des paniers appartient aux commerces, il ne fait que transiter par le
 * compte Stripe. Déclarer les ventes reviendrait à déclarer environ six fois
 * trop, et à payer autant de cotisations.
 *
 * L'assiette est donc la rémunération de Kshare : commission, frais de service
 * et abonnements. Voir [[project_stripe_connect_model]] : Stripe est le
 * prestataire de paiement régulé, Kshare l'intermédiaire de mise en relation.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface Trimestre {
  /** `2026-T1`. */
  cle: string;
  libelle: string;
  annee: number;
  numero: 1 | 2 | 3 | 4;
  debut: string;
  fin: string;
  commission: number;
  fraisService: number;
  abonnements: number;
  /** Somme des trois : le montant à déclarer. */
  aDeclarer: number;
  /** Vrai quand le trimestre est clos et donc déclarable. */
  clos: boolean;
  /** Date limite indicative de déclaration : le dernier jour du mois suivant. */
  echeance: string;
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}

const LIBELLES_TRIMESTRE: Record<number, string> = {
  1: "janvier – mars",
  2: "avril – juin",
  3: "juillet – septembre",
  4: "octobre – décembre",
};

/**
 * Découpe une année en trimestres et calcule l'assiette de chacun.
 *
 * Les montants suivent la même règle que la facturation : commission acquise à
 * la capture, remboursements déduits, comptes de démonstration écartés. Les
 * deux écrans doivent tomber sur le même chiffre, sans quoi la déclaration ne
 * correspondrait à aucune facture.
 */
export async function trimestres(annee: number): Promise<Trimestre[]> {
  const supabase = createAdminClient();

  const debutAnnee = new Date(Date.UTC(annee, 0, 1));
  const finAnnee = new Date(Date.UTC(annee + 1, 0, 1));

  const [{ data: parMois, error }, { data: abonnements }] = await Promise.all([
    supabase.rpc("crm_chiffres", {
      p_debut: debutAnnee.toISOString(),
      p_fin: finAnnee.toISOString(),
    }),
    supabase
      .from("subscriptions")
      .select("monthly_price, status, created_at, canceled_at, plan")
      .eq("plan", "pro"),
  ]);

  if (error) throw new Error(`Assiette déclarable : ${error.message}`);

  const maintenant = new Date();
  const resultats: Trimestre[] = [];

  for (let t = 1 as 1 | 2 | 3 | 4; t <= 4; t = (t + 1) as 1 | 2 | 3 | 4) {
    const premierMois = (t - 1) * 3;
    const debut = new Date(Date.UTC(annee, premierMois, 1));
    const fin = new Date(Date.UTC(annee, premierMois + 3, 1));

    let commission = 0;
    let fraisService = 0;
    for (const m of parMois ?? []) {
      const d = new Date(m.mois);
      if (d >= debut && d < fin) {
        commission += Number(m.commission) - Number(m.commission_rendue);
        fraisService += Number(m.frais_service);
      }
    }

    // Un abonnement compte pour chacun des mois du trimestre où il courait.
    let abonnementsTrimestre = 0;
    for (let i = 0; i < 3; i++) {
      const moisDebut = new Date(Date.UTC(annee, premierMois + i, 1));
      const moisFin = new Date(Date.UTC(annee, premierMois + i + 1, 1));
      for (const a of abonnements ?? []) {
        if (a.status === "offered") continue;
        if (new Date(a.created_at) >= moisFin) continue;
        if (a.canceled_at && new Date(a.canceled_at) < moisDebut) continue;
        abonnementsTrimestre += Number(a.monthly_price);
      }
    }

    // L'échéance URSSAF tombe le dernier jour du mois suivant la fin du
    // trimestre. Indicative : elle se décale quand elle tombe un dimanche.
    const echeance = new Date(Date.UTC(annee, premierMois + 4, 0));

    resultats.push({
      cle: `${annee}-T${t}`,
      libelle: `T${t} ${annee} · ${LIBELLES_TRIMESTRE[t]}`,
      annee,
      numero: t,
      debut: debut.toISOString().slice(0, 10),
      fin: new Date(fin.getTime() - 86_400_000).toISOString().slice(0, 10),
      commission: arrondi(commission),
      fraisService: arrondi(fraisService),
      abonnements: arrondi(abonnementsTrimestre),
      aDeclarer: arrondi(commission + fraisService + abonnementsTrimestre),
      clos: fin <= maintenant,
      echeance: echeance.toISOString().slice(0, 10),
    });
  }

  return resultats;
}

/** Chiffre d'affaires déclarable cumulé sur l'année, pour le suivi des seuils. */
export async function caAnnuel(annee: number): Promise<number> {
  const liste = await trimestres(annee);
  return arrondi(liste.reduce((s, t) => s + t.aDeclarer, 0));
}
