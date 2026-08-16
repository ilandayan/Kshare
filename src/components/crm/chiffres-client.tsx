"use client";

import { useRouter } from "next/navigation";
import { BarChart3, AlertTriangle, Gift } from "lucide-react";
import type { Chiffres } from "@/lib/crm/chiffres";

interface Props {
  donnees: Chiffres;
  nbMois: number;
}

function euros(v: number): string {
  const signe = v < 0 ? "− " : "";
  return `${signe}${Math.abs(v).toFixed(2).replace(".", ",")} €`;
}

const PERIODES = [
  { valeur: 3, label: "3 mois" },
  { valeur: 6, label: "6 mois" },
  { valeur: 12, label: "12 mois" },
  { valeur: 24, label: "24 mois" },
];

export function ChiffresClient({ donnees, nbMois }: Props) {
  const router = useRouter();
  const { mois, cumul, poidsStripe, fraisStripeIncomplets } = donnees;

  // L'échelle du graphe se cale sur le meilleur mois : à échelle absolue, les
  // premiers mois d'activité seraient invisibles.
  const maxRecettes = Math.max(...mois.map((m) => m.recettes), 1);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#3744C8]" />
            Chiffres
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Le revenu de l&apos;entreprise, frais Stripe et charges déduits.
          </p>
        </div>

        <select
          value={nbMois}
          onChange={(e) => router.push(`/kshare-crm/chiffres?mois=${e.target.value}`)}
          className="px-4 py-2 rounded-xl border border-[#e2e5f0] bg-white text-sm font-medium text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
        >
          {PERIODES.map((p) => (
            <option key={p.valeur} value={p.valeur}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Les frais Stripe ne sont connus qu'après la capture. Tous à zéro avec
          des ventes au compteur, c'est que la réconciliation n'a pas tourné —
          et la marge affichée est trop belle. */}
      {fraisStripeIncomplets && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Frais Stripe inconnus sur toute la période.</p>
            <p className="mt-1">
              Ils sont lus sur la transaction au moment de la capture. Tous à zéro alors que des
              paniers ont été vendus, c&apos;est que la réconciliation n&apos;a pas tourné : la
              marge ci-dessous est surestimée.
            </p>
          </div>
        </div>
      )}

      {/* Le cumul */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Carte libelle="Commission" valeur={euros(cumul.commission)} />
        <Carte libelle="Frais de service" valeur={euros(cumul.fraisService)} />
        <Carte libelle="Abonnements" valeur={euros(cumul.abonnements)} />
        <Carte libelle="Recettes" valeur={euros(cumul.recettes)} fort />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Carte
          libelle="Frais Stripe"
          valeur={euros(cumul.fraisStripe)}
          note={poidsStripe > 0 ? `${poidsStripe.toFixed(1).replace(".", ",")} % des recettes` : undefined}
          rouge
        />
        <Carte libelle="Charges" valeur={euros(cumul.charges)} rouge />
        <Carte
          libelle="Marge"
          valeur={euros(cumul.marge)}
          fort={cumul.marge >= 0}
          rouge={cumul.marge < 0}
        />
        <Carte
          libelle="Paniers vendus"
          valeur={String(cumul.paniers)}
          note={cumul.ventes > 0 ? `${euros(cumul.ventes)} de ventes` : undefined}
        />
      </div>

      {/* Recettes mois par mois */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] p-5 mb-5">
        <div className="text-sm font-bold text-gray-800 mb-4">Recettes par mois</div>
        <div className="flex items-end gap-1.5 h-40">
          {mois.map((m) => (
            <div key={m.mois} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#3744C8] to-[#5B6EF5] transition-all"
                  style={{ height: `${Math.max(2, (m.recettes / maxRecettes) * 100)}%` }}
                  title={`${m.libelle} — ${euros(m.recettes)}`}
                />
              </div>
              <div className="text-[10px] text-gray-400 truncate w-full text-center">
                {m.libelle.slice(0, 3)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Le détail */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f7f8fc] text-gray-500 text-xs">
                <th className="text-left font-semibold px-4 py-2.5">Mois</th>
                <th className="text-center font-semibold px-3 py-2.5">Paniers</th>
                <th className="text-right font-semibold px-3 py-2.5">Ventes</th>
                <th className="text-right font-semibold px-3 py-2.5">Commission</th>
                <th className="text-right font-semibold px-3 py-2.5">Frais service</th>
                <th className="text-right font-semibold px-3 py-2.5">Abonnements</th>
                <th className="text-right font-semibold px-3 py-2.5">Recettes</th>
                <th className="text-right font-semibold px-3 py-2.5">Frais Stripe</th>
                <th className="text-right font-semibold px-3 py-2.5">Charges</th>
                <th className="text-right font-semibold px-3 py-2.5">Marge</th>
              </tr>
            </thead>
            <tbody>
              {mois.map((m) => (
                <tr key={m.mois} className="border-t border-[#f0f1f5] hover:bg-[#fafbff]">
                  <td className="px-4 py-2.5 text-gray-800 whitespace-nowrap">
                    {m.libelle}
                    {m.dons > 0 && (
                      <span
                        className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-green-700"
                        title={`${m.dons} panier${m.dons > 1 ? "s" : ""} offert${m.dons > 1 ? "s" : ""} en don — sans commission`}
                      >
                        <Gift className="h-3 w-3" /> {m.dons}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-600">{m.paniers}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{euros(m.ventes)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-800">{euros(m.commission)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-800">{euros(m.fraisService)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-800">{euros(m.abonnements)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-[#3744C8]">
                    {euros(m.recettes)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-red-600">
                    {m.fraisStripe > 0 ? `− ${euros(m.fraisStripe).replace("− ", "")}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-red-600">
                    {m.charges > 0 ? `− ${euros(m.charges).replace("− ", "")}` : "—"}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-bold ${m.marge < 0 ? "text-red-600" : "text-gray-900"}`}
                  >
                    {euros(m.marge)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#e2e5f0] bg-[#f7f8fc] font-semibold">
                <td className="px-4 py-3 text-gray-800">Total</td>
                <td className="px-3 py-3 text-center text-gray-700">{cumul.paniers}</td>
                <td className="px-3 py-3 text-right text-gray-700">{euros(cumul.ventes)}</td>
                <td className="px-3 py-3 text-right text-gray-800">{euros(cumul.commission)}</td>
                <td className="px-3 py-3 text-right text-gray-800">{euros(cumul.fraisService)}</td>
                <td className="px-3 py-3 text-right text-gray-800">{euros(cumul.abonnements)}</td>
                <td className="px-3 py-3 text-right text-[#3744C8]">{euros(cumul.recettes)}</td>
                <td className="px-3 py-3 text-right text-red-600">{euros(cumul.fraisStripe)}</td>
                <td className="px-3 py-3 text-right text-red-600">{euros(cumul.charges)}</td>
                <td
                  className={`px-3 py-3 text-right font-bold ${cumul.marge < 0 ? "text-red-600" : "text-gray-900"}`}
                >
                  {euros(cumul.marge)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Les ventes sont le prix payé par les clients : elles appartiennent aux commerces, pas à
        Kshare. Seules la commission, les frais de service et les abonnements sont des recettes.
        Les frais Stripe ne sont pas récupérables, les services de paiement étant exonérés de TVA.
      </p>
    </div>
  );
}

function Carte({
  libelle,
  valeur,
  note,
  fort,
  rouge,
}: {
  libelle: string;
  valeur: string;
  note?: string;
  fort?: boolean;
  rouge?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] p-4">
      <div className="text-xs text-gray-500">{libelle}</div>
      <div
        className={`text-xl font-bold mt-1 ${
          rouge ? "text-red-600" : fort ? "text-[#3744C8]" : "text-gray-900"
        }`}
      >
        {valeur}
      </div>
      {note && <div className="text-[11px] text-gray-400 mt-0.5">{note}</div>}
    </div>
  );
}
