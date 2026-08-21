import { createClient } from "@/lib/supabase/server";
import { prochainPalier, resoudreTaux, type Palier } from "@/lib/groupes";
import { libellePeriode } from "@/lib/invoicing/compute";

export const dynamic = "force-dynamic";

const euros = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Le mois en cours, au format AAAA-MM. */
function periodeCourante(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type LigneMagasin = {
  id: string;
  nom: string;
  ville: string | null;
  ventes: number;
  paniers: number;
};

/**
 * La vue consolidée de l'enseigne.
 *
 * Tout passe par le client de session : c'est le RLS qui décide de ce que le
 * directeur voit, et non une requête privilégiée qu'il faudrait filtrer à la
 * main. Une erreur de périmètre se traduirait par une page vide, jamais par la
 * fuite d'un magasin qui n'est pas le sien.
 */
export default async function GroupePage() {
  const supabase = await createClient();

  const { data: groupe } = await supabase
    .from("groupes")
    .select("id, nom, paliers, taux_courant")
    .limit(1)
    .maybeSingle();

  if (!groupe) {
    return <p className="text-slate-600">Aucune enseigne rattachée à votre compte.</p>;
  }

  const { data: magasins } = await supabase
    .from("commerces")
    .select("id, name, city, commission_rate")
    .eq("groupe_id", groupe.id)
    .order("name");

  // Ventes du mois en cours, encaissées. Même définition que les relevés :
  // le montant capturé, diminué des remboursements.
  const debutMois = new Date();
  debutMois.setUTCDate(1);
  debutMois.setUTCHours(0, 0, 0, 0);

  const { data: commandes } = await supabase
    .from("orders")
    .select("commerce_id, total_amount, captured_amount, refunded_amount, is_donation")
    .in("capture_status", ["captured", "partially_captured"])
    .gte("captured_at", debutMois.toISOString());

  const parMagasin = new Map<string, { ventes: number; paniers: number }>();
  for (const o of commandes ?? []) {
    const vente =
      Number(o.captured_amount ?? o.total_amount ?? 0) - Number(o.refunded_amount ?? 0);
    const acc = parMagasin.get(o.commerce_id) ?? { ventes: 0, paniers: 0 };
    acc.ventes += vente;
    if (!o.is_donation) acc.paniers += 1;
    parMagasin.set(o.commerce_id, acc);
  }

  const lignes: LigneMagasin[] = (magasins ?? []).map((m) => {
    const cumul = parMagasin.get(m.id) ?? { ventes: 0, paniers: 0 };
    return {
      id: m.id,
      nom: m.name,
      ville: m.city,
      ventes: Math.round(cumul.ventes * 100) / 100,
      paniers: cumul.paniers,
    };
  });

  const caEnCours = Math.round(lignes.reduce((s, l) => s + l.ventes, 0) * 100) / 100;
  const paliers = (Array.isArray(groupe.paliers) ? groupe.paliers : null) as Palier[] | null;

  const tauxApplique = groupe.taux_courant;
  const tauxProjete = resoudreTaux(caEnCours, paliers);
  const suivant = prochainPalier(caEnCours, paliers);

  const { data: historique } = await supabase
    .from("groupe_taux_historique")
    .select("periode, ca_consolide, taux, magasins")
    .eq("groupe_id", groupe.id)
    .order("periode", { ascending: false })
    .limit(6);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">
          {libellePeriode(periodeCourante())}
        </h1>
        <p className="text-slate-600 mt-1">
          Ventes en cours pour l&apos;ensemble du réseau. Chaque magasin conserve son
          relevé et sa facture.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Carte titre="Ventes consolidées" valeur={euros(caEnCours)} detail={`${lignes.length} magasins`} />
        <Carte
          titre="Taux en vigueur"
          valeur={tauxApplique === null ? "18 %" : `${tauxApplique} %`}
          detail={tauxApplique === null ? "taux de base, premier mois" : "fixé par le mois précédent"}
        />
        <Carte
          titre="Taux du mois prochain"
          valeur={`${tauxProjete} %`}
          detail="au rythme actuel"
          accent
        />
      </section>

      {suivant && (
        <section className="rounded-lg border border-[#2d4de0]/20 bg-[#2d4de0]/5 px-5 py-4">
          <p className="text-slate-800">
            Encore <strong>{euros(suivant.manque)}</strong> de ventes ce mois-ci pour que
            l&apos;ensemble du réseau passe à <strong>{suivant.taux} %</strong> le mois prochain.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Magasins</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left font-semibold px-4 py-3">Magasin</th>
                <th className="text-left font-semibold px-4 py-3">Ville</th>
                <th className="text-right font-semibold px-4 py-3">Paniers</th>
                <th className="text-right font-semibold px-4 py-3">Ventes du mois</th>
              </tr>
            </thead>
            <tbody>
              {lignes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Aucun magasin rattaché pour le moment.
                  </td>
                </tr>
              )}
              {lignes.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-900 font-medium">{l.nom}</td>
                  <td className="px-4 py-3 text-slate-600">{l.ville ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{l.paniers}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                    {euros(l.ventes)}
                  </td>
                </tr>
              ))}
            </tbody>
            {lignes.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="px-4 py-3 text-slate-900" colSpan={2}>
                    Total réseau
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                    {lignes.reduce((s, l) => s + l.paniers, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                    {euros(caEnCours)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {historique && historique.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Historique des taux</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left font-semibold px-4 py-3">Mois observé</th>
                  <th className="text-right font-semibold px-4 py-3">Ventes consolidées</th>
                  <th className="text-right font-semibold px-4 py-3">Magasins</th>
                  <th className="text-right font-semibold px-4 py-3">Taux appliqué ensuite</th>
                </tr>
              </thead>
              <tbody>
                {historique.map((h) => (
                  <tr key={h.periode} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-900">{libellePeriode(h.periode)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {euros(Number(h.ca_consolide))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {h.magasins}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#2d4de0]">
                      {h.taux} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Carte({
  titre,
  valeur,
  detail,
  accent,
}: {
  titre: string;
  valeur: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white px-5 py-4 ${
        accent ? "border-[#2d4de0]/30" : "border-slate-200"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">{titre}</div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          accent ? "text-[#2d4de0]" : "text-slate-900"
        }`}
      >
        {valeur}
      </div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}
