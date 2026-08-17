"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Landmark, Copy, Check, Info, CalendarClock, ExternalLink } from "lucide-react";
import type { Trimestre } from "@/lib/crm/assiette";

interface Props {
  annee: number;
  annees: number[];
  trimestres: Trimestre[];
  bareme: {
    annee: number;
    verifieLe: string;
    categorie: string;
    tauxCotisations: number;
    tauxVersementLiberatoire: number;
    tauxCfp: number;
  };
}

function euros(v: number): string {
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}

export function UrssafClient({ annee, annees, trimestres, bareme }: Props) {
  const router = useRouter();
  const [copie, setCopie] = useState<string | null>(null);
  const [versementLiberatoire, setVersementLiberatoire] = useState(false);

  const total = arrondi(trimestres.reduce((s, t) => s + t.aDeclarer, 0));
  const tauxTotal = bareme.tauxCotisations + bareme.tauxCfp + (versementLiberatoire ? bareme.tauxVersementLiberatoire : 0);

  // Le prochain trimestre clos non encore échu : c'est celui qu'on doit déclarer.
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const prochain = trimestres.find((t) => t.clos && t.echeance >= aujourdHui);

  async function copier(valeur: string, cle: string) {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(cle);
      setTimeout(() => setCopie(null), 2000);
      toast.success("Montant copié.");
    } catch {
      toast.error("Copie impossible depuis ce navigateur.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="h-6 w-6 text-[#3744C8]" />
            URSSAF
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Le chiffre d&apos;affaires à déclarer, trimestre par trimestre.
          </p>
        </div>

        <select
          value={annee}
          onChange={(e) => router.push(`/kshare-crm/urssaf?annee=${e.target.value}`)}
          className="px-4 py-2 rounded-xl border border-[#e2e5f0] bg-white text-sm font-medium text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
        >
          {annees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {prochain && (
        <div className="mb-5 rounded-2xl border border-[#3744C8]/20 bg-[#f7f8ff] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-3">
              <CalendarClock className="h-5 w-5 text-[#3744C8] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900">
                  À déclarer : {prochain.libelle}
                </div>
                <div className="text-sm text-gray-600 mt-0.5">
                  Échéance indicative le{" "}
                  {new Date(prochain.echeance).toLocaleDateString("fr-FR")}. Elle se décale quand
                  elle tombe un dimanche ou un jour férié.
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#3744C8]">
                {euros(prochain.aDeclarer)}
              </div>
              <button
                onClick={() => copier(prochain.aDeclarer.toFixed(2), prochain.cle)}
                className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#3744C8] hover:underline cursor-pointer"
              >
                {copie === prochain.cle ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> copier le montant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ce que l'on déclare, et surtout ce que l'on ne déclare pas. */}
      <div className="mb-5 rounded-2xl border border-[#e2e5f0] bg-white p-4 flex gap-3">
        <Info className="h-5 w-5 text-[#3744C8] shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700">
          <p className="font-semibold text-gray-900">
            On déclare la rémunération de Kshare, jamais le prix des paniers.
          </p>
          <p className="mt-1">
            Le montant payé par les clients appartient aux commerces et ne fait que transiter par
            le compte Stripe. Déclarer les ventes reviendrait à déclarer environ six fois trop, et
            à cotiser d&apos;autant. L&apos;assiette est la commission, les frais de service et les
            abonnements.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e2e5f0] overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f7f8fc] text-gray-500 text-xs">
                <th className="text-left font-semibold px-4 py-2.5">Trimestre</th>
                <th className="text-right font-semibold px-3 py-2.5">Commission</th>
                <th className="text-right font-semibold px-3 py-2.5">Frais de service</th>
                <th className="text-right font-semibold px-3 py-2.5">Abonnements</th>
                <th className="text-right font-semibold px-3 py-2.5">À déclarer</th>
                <th className="text-right font-semibold px-3 py-2.5">
                  Cotisations estimées
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {trimestres.map((t) => {
                const cotisations = arrondi((t.aDeclarer * tauxTotal) / 100);
                return (
                  <tr
                    key={t.cle}
                    className={`border-t border-[#f0f1f5] ${t.clos ? "" : "opacity-50"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{t.libelle}</div>
                      <div className="text-xs text-gray-400">
                        {t.clos
                          ? `échéance ${new Date(t.echeance).toLocaleDateString("fr-FR")}`
                          : "en cours"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700">{euros(t.commission)}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{euros(t.fraisService)}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{euros(t.abonnements)}</td>
                    <td className="px-3 py-3 text-right font-bold text-[#3744C8] whitespace-nowrap">
                      {euros(t.aDeclarer)}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700 whitespace-nowrap">
                      {euros(cotisations)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {t.aDeclarer > 0 && (
                        <button
                          onClick={() => copier(t.aDeclarer.toFixed(2), t.cle)}
                          title="Copier le montant à déclarer"
                          aria-label="Copier le montant à déclarer"
                          className="p-2 rounded-lg border border-[#e2e5f0] text-gray-500 hover:text-[#3744C8] hover:border-[#3744C8]/40 hover:bg-[#f7f8ff] transition-colors cursor-pointer"
                        >
                          {copie === t.cle ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#e2e5f0] bg-[#f7f8fc] font-semibold">
                <td className="px-4 py-3 text-gray-800">Total {annee}</td>
                <td className="px-3 py-3 text-right text-gray-700">
                  {euros(arrondi(trimestres.reduce((s, t) => s + t.commission, 0)))}
                </td>
                <td className="px-3 py-3 text-right text-gray-700">
                  {euros(arrondi(trimestres.reduce((s, t) => s + t.fraisService, 0)))}
                </td>
                <td className="px-3 py-3 text-right text-gray-700">
                  {euros(arrondi(trimestres.reduce((s, t) => s + t.abonnements, 0)))}
                </td>
                <td className="px-3 py-3 text-right text-[#3744C8]">{euros(total)}</td>
                <td className="px-3 py-3 text-right text-gray-800">
                  {euros(arrondi((total * tauxTotal) / 100))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e2e5f0] p-5">
        <div className="text-sm font-bold text-gray-800 mb-3">Barème {bareme.annee}</div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
          <Ligne libelle="Catégorie retenue" valeur={bareme.categorie} />
          <Ligne
            libelle="Cotisations sociales"
            valeur={`${bareme.tauxCotisations.toString().replace(".", ",")} %`}
          />
          <Ligne
            libelle="Versement libératoire"
            valeur={`${bareme.tauxVersementLiberatoire.toString().replace(".", ",")} % (sur option)`}
          />
          <Ligne
            libelle="Taux appliqué ci-dessus"
            valeur={`${tauxTotal.toFixed(2).replace(".", ",")} %`}
          />
        </dl>

        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={versementLiberatoire}
            onChange={(e) => setVersementLiberatoire(e.target.checked)}
            className="rounded cursor-pointer mt-0.5"
          />
          <span>
            J&apos;ai opté pour le versement libératoire de l&apos;impôt sur le revenu
            {/* L'option se prend à la création ou avant le 30 septembre pour
                l'année suivante, et beaucoup ne savent plus s'ils l'ont. Le
                moyen le plus sûr de trancher est de regarder son propre
                décompte : avec l'option, l'impôt y figure à côté des
                cotisations. */}
            <span className="block text-xs text-gray-500 mt-0.5">
              Dans le doute, ouvrez une déclaration passée sur votre compte Urssaf : si le
              versement libératoire s&apos;applique, une ligne d&apos;impôt sur le revenu
              figure à côté des cotisations sociales. Sinon, vous ne payez que les cotisations
              et l&apos;impôt se règle avec votre déclaration de revenus.
            </span>
          </span>
        </label>

        <p className="text-xs text-gray-400 mt-4">
          Barème vérifié le {new Date(bareme.verifieLe).toLocaleDateString("fr-FR")} auprès de
          l&apos;Urssaf. La contribution à la formation professionnelle n&apos;est pas incluse :
          elle n&apos;a pas pu être vérifiée à une source officielle et vaut mieux absente
          qu&apos;inventée. Ces montants sont une estimation destinée à préparer la déclaration —
          seul le décompte de l&apos;Urssaf fait foi.
        </p>

        <a
          href="https://www.autoentrepreneur.urssaf.fr/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#3744C8] hover:underline"
        >
          Déclarer sur autoentrepreneur.urssaf.fr
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#f4f5f9] pb-1.5">
      <dt className="text-gray-500">{libelle}</dt>
      <dd className="text-gray-900 font-medium text-right">{valeur}</dd>
    </div>
  );
}
