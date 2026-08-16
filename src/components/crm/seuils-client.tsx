"use client";

import { useRouter } from "next/navigation";
import { Gauge, AlertTriangle, Info } from "lucide-react";
import type { EtatSeuil } from "@/lib/crm/fiscal";

interface Props {
  annee: number;
  annees: number[];
  ca: number;
  seuils: EtatSeuil[];
  anneeCourante: boolean;
  bareme: {
    annee: number;
    verifieLe: string;
    categorie: string;
    tauxCotisations: number;
    plafondMicro: number;
    franchise: number;
    franchiseMajoree: number;
  };
}

function euros(v: number): string {
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function SeuilsClient({ annee, annees, ca, seuils, anneeCourante, bareme }: Props) {
  const router = useRouter();
  const alertes = seuils.filter((s) => s.depasse || s.depassementPrevu);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gauge className="h-6 w-6 text-[#3744C8]" />
            Seuils
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Où en est le chiffre d&apos;affaires par rapport aux limites du régime.
          </p>
        </div>

        <select
          value={annee}
          onChange={(e) => router.push(`/kshare-crm/seuils?annee=${e.target.value}`)}
          className="px-4 py-2 rounded-xl border border-[#e2e5f0] bg-white text-sm font-medium text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
        >
          {annees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* L'assiette est le point où l'on se trompe le plus facilement. */}
      <div className="mb-5 rounded-2xl border border-[#e2e5f0] bg-[#f7f8ff] p-4 flex gap-3">
        <Info className="h-5 w-5 text-[#3744C8] shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700">
          <p className="font-semibold text-gray-900">
            Le chiffre d&apos;affaires déclarable est la rémunération de Kshare, pas le prix des
            paniers.
          </p>
          <p className="mt-1">
            L&apos;argent payé par les clients appartient aux commerces et ne fait que transiter.
            L&apos;assiette retenue ici est la commission, les frais de service et les
            abonnements — soit {euros(ca)} pour {annee}.
          </p>
        </div>
      </div>

      {alertes.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">
              {alertes.some((a) => a.depasse) ? "Seuil franchi." : "Seuil atteignable cette année."}
            </p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              {alertes.map((a) => (
                <li key={a.libelle}>
                  <span className="font-medium">{a.libelle}</span> —{" "}
                  {a.depasse
                    ? `franchi (${euros(a.realise)} sur ${euros(a.seuil)})`
                    : `projection à ${euros(a.projection)} au rythme actuel`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-5">
        {seuils.map((s) => {
          const part = Math.min(100, s.part);
          const partProjetee = Math.min(100, (s.projection / s.seuil) * 100);
          const couleur = s.depasse
            ? "bg-red-500"
            : s.depassementPrevu
              ? "bg-amber-500"
              : "bg-gradient-to-r from-[#3744C8] to-[#5B6EF5]";

          return (
            <div key={s.libelle} className="bg-white rounded-2xl border border-[#e2e5f0] p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <div className="font-semibold text-gray-900">{s.libelle}</div>
                <div className="text-sm text-gray-500">
                  <span
                    className={`font-bold ${s.depasse ? "text-red-600" : "text-gray-900"}`}
                  >
                    {euros(s.realise)}
                  </span>{" "}
                  sur {euros(s.seuil)} · {s.part.toFixed(1).replace(".", ",")} %
                </div>
              </div>

              <div className="relative h-2.5 rounded-full bg-[#f0f1f5] overflow-hidden mb-2">
                {/* La projection, en fond, montre où l'on arriverait sans rien changer. */}
                {anneeCourante && partProjetee > part && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gray-200"
                    style={{ width: `${partProjetee}%` }}
                  />
                )}
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${couleur}`}
                  style={{ width: `${Math.max(1, part)}%` }}
                />
              </div>

              <div className="text-xs text-gray-500">
                {anneeCourante && (
                  <>
                    Projection au 31 décembre au rythme actuel :{" "}
                    <span
                      className={`font-medium ${s.projection > s.seuil ? "text-amber-700" : "text-gray-700"}`}
                    >
                      {euros(s.projection)}
                    </span>
                    {" · "}
                  </>
                )}
                {s.consequence}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-[#e2e5f0] p-5">
        <div className="text-sm font-bold text-gray-800 mb-3">
          Barème {bareme.annee}
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Ligne libelle="Catégorie retenue" valeur={bareme.categorie} />
          <Ligne
            libelle="Cotisations sociales"
            valeur={`${bareme.tauxCotisations.toString().replace(".", ",")} % du CA déclaré`}
          />
          <Ligne libelle="Plafond du régime micro" valeur={euros(bareme.plafondMicro)} />
          <Ligne libelle="Franchise en base de TVA" valeur={euros(bareme.franchise)} />
          <Ligne libelle="Seuil majoré de franchise" valeur={euros(bareme.franchiseMajoree)} />
        </dl>
        <p className="text-xs text-gray-400 mt-4">
          Barème vérifié le {new Date(bareme.verifieLe).toLocaleDateString("fr-FR")} auprès de
          l&apos;Urssaf et d&apos;impots.gouv.fr. La catégorie d&apos;activité conditionne le taux
          de cotisations : une commission d&apos;intermédiaire relève normalement des BIC, mais
          c&apos;est la déclaration d&apos;activité qui tranche. L&apos;écart avec les BNC est de
          plus de quatre points.
        </p>
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
