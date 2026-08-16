"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet, Plus, Trash2, Loader2, Paperclip, Repeat, Info } from "lucide-react";
import {
  enregistrerCharge, supprimerCharge, lienJustificatif,
  CATEGORIES_CHARGE, LIBELLES_CHARGE, type CategorieCharge,
} from "@/app/(crm)/kshare-crm/charges/_actions";

export interface ChargeRow {
  id: string;
  label: string;
  category: string;
  amount: number;
  vat_amount: number | null;
  supplier: string | null;
  incurred_on: string;
  recurring: boolean;
  receipt_url: string | null;
  notes: string | null;
}

interface Props {
  charges: ChargeRow[];
  annee: number;
  annees: number[];
}

function euros(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} €`;
}

export function ChargesClient({ charges, annee, annees }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const { total, recurrentes, parCategorie, parMois } = useMemo(() => {
    const parCategorie = new Map<string, number>();
    const parMois = new Map<string, number>();
    let total = 0;
    let recurrentes = 0;

    for (const c of charges) {
      const montant = Number(c.amount);
      total += montant;
      if (c.recurring) recurrentes += montant;
      parCategorie.set(c.category, (parCategorie.get(c.category) ?? 0) + montant);
      const mois = c.incurred_on.slice(0, 7);
      parMois.set(mois, (parMois.get(mois) ?? 0) + montant);
    }

    return {
      total: Math.round(total * 100) / 100,
      recurrentes: Math.round(recurrentes * 100) / 100,
      parCategorie: [...parCategorie.entries()].sort((a, b) => b[1] - a[1]),
      parMois,
    };
  }, [charges]);

  const moisRenseignes = parMois.size;
  const moyenneMensuelle = moisRenseignes > 0 ? Math.round((total / moisRenseignes) * 100) / 100 : 0;

  function enregistrer(formData: FormData) {
    setEnCours("ajout");
    startTransition(async () => {
      const res = await enregistrerCharge(formData);
      setEnCours(null);
      if (res.success) {
        toast.success(res.message ?? "Enregistré.");
        formRef.current?.reset();
        setFormulaireOuvert(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function supprimer(id: string, libelle: string) {
    if (!confirm(`Supprimer « ${libelle} » ?`)) return;
    setEnCours(id);
    startTransition(async () => {
      const res = await supprimerCharge(id);
      setEnCours(null);
      if (res.success) {
        toast.success(res.message ?? "Supprimé.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  async function ouvrirJustificatif(id: string) {
    const res = await lienJustificatif(id);
    if (res.success) window.open(res.url, "_blank");
    else toast.error(res.error);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-[#3744C8]" />
            Charges
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ce que l&apos;activité coûte, pour piloter la trésorerie.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={annee}
            onChange={(e) => router.push(`/kshare-crm/charges?annee=${e.target.value}`)}
            className="px-4 py-2 rounded-xl border border-[#e2e5f0] bg-white text-sm font-medium text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
          >
            {annees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            onClick={() => setFormulaireOuvert((v) => !v)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] text-white text-sm font-semibold shadow-sm hover:opacity-90 cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* En micro-entreprise l'impôt se calcule sur le chiffre d'affaires : ces
          charges ne réduisent rien fiscalement. Le dire évite de croire à une
          économie d'impôt qui n'existe pas. */}
      <div className="mb-5 rounded-2xl border border-[#e2e5f0] bg-[#f7f8ff] p-4 flex gap-3">
        <Info className="h-5 w-5 text-[#3744C8] shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Ces charges ne sont pas déductibles.</p>
          <p className="mt-1">
            En micro-entreprise, cotisations et impôt se calculent sur le chiffre d&apos;affaires,
            sans tenir compte des dépenses. Cet écran sert à piloter la trésorerie et à connaître
            la marge réelle — pas à réduire l&apos;impôt.
          </p>
        </div>
      </div>

      {formulaireOuvert && (
        <form
          ref={formRef}
          action={enregistrer}
          className="bg-white rounded-2xl border border-[#e2e5f0] p-5 mb-5 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-gray-500">Libellé</span>
              <input
                name="libelle"
                required
                placeholder="Abonnement Vercel Pro"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Montant TTC</span>
              <input
                name="montant"
                required
                inputMode="decimal"
                placeholder="20,00"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Catégorie</span>
              <select
                name="categorie"
                defaultValue="logiciel"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              >
                {CATEGORIES_CHARGE.map((c) => (
                  <option key={c} value={c}>
                    {LIBELLES_CHARGE[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Date</span>
              <input
                type="date"
                name="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">
                Fournisseur <span className="font-normal text-gray-400">(facultatif)</span>
              </span>
              <input
                name="fournisseur"
                placeholder="Vercel Inc."
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">
                Dont TVA <span className="font-normal text-gray-400">(facultatif)</span>
              </span>
              <input
                name="tva"
                inputMode="decimal"
                placeholder="0,00"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-gray-500">
                Justificatif <span className="font-normal text-gray-400">(facultatif)</span>
              </span>
              <input
                type="file"
                name="justificatif"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                className="mt-1 w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#f0f1fb] file:text-[#3744C8] file:text-sm file:font-medium cursor-pointer"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" name="recurrent" className="rounded cursor-pointer" />
            Charge récurrente (mensuelle ou annuelle)
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">
              Notes <span className="font-normal text-gray-400">(facultatif)</span>
            </span>
            <textarea
              name="notes"
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-[#3744C8] text-white text-sm font-semibold hover:bg-[#2d38a8] disabled:opacity-40 cursor-pointer inline-flex items-center gap-2"
          >
            {enCours === "ajout" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Enregistrer
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Carte libelle={`Total ${annee}`} valeur={euros(total)} fort />
        <Carte libelle="Dont récurrent" valeur={euros(recurrentes)} />
        <Carte
          libelle="Moyenne mensuelle"
          valeur={euros(moyenneMensuelle)}
          note={moisRenseignes > 0 ? `sur ${moisRenseignes} mois` : undefined}
        />
        <Carte libelle="Lignes saisies" valeur={String(charges.length)} />
      </div>

      {parCategorie.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-5 mb-5">
          <div className="text-sm font-bold text-gray-800 mb-3">Répartition</div>
          <div className="space-y-2">
            {parCategorie.map(([cat, montant]) => (
              <div key={cat} className="flex items-center gap-3">
                <div className="w-52 shrink-0 text-sm text-gray-600 truncate">
                  {LIBELLES_CHARGE[cat as CategorieCharge] ?? cat}
                </div>
                <div className="flex-1 h-2 rounded-full bg-[#f0f1f5] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#3744C8] to-[#5B6EF5]"
                    style={{ width: `${total > 0 ? (montant / total) * 100 : 0}%` }}
                  />
                </div>
                <div className="w-24 text-right text-sm font-medium text-gray-800">
                  {euros(montant)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {charges.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-12 text-center">
          <Wallet className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucune charge saisie pour {annee}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f7f8fc] text-gray-500 text-xs">
                  <th className="text-left font-semibold px-4 py-2.5">Date</th>
                  <th className="text-left font-semibold px-3 py-2.5">Libellé</th>
                  <th className="text-left font-semibold px-3 py-2.5">Catégorie</th>
                  <th className="text-left font-semibold px-3 py-2.5">Fournisseur</th>
                  <th className="text-right font-semibold px-3 py-2.5">Montant</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {charges.map((c) => (
                  <tr key={c.id} className="border-t border-[#f0f1f5] hover:bg-[#fafbff]">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {new Date(c.incurred_on).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-900">{c.label}</span>
                        {c.recurring && (
                          <Repeat className="h-3.5 w-3.5 text-[#3744C8]" aria-label="Récurrente" />
                        )}
                      </div>
                      {c.notes && <div className="text-xs text-gray-500">{c.notes}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {LIBELLES_CHARGE[c.category as CategorieCharge] ?? c.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{c.supplier ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900 whitespace-nowrap">
                      {euros(Number(c.amount))}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.receipt_url && (
                          <button
                            onClick={() => ouvrirJustificatif(c.id)}
                            title="Voir le justificatif"
                            aria-label="Voir le justificatif"
                            className="p-2 rounded-lg border border-[#e2e5f0] text-gray-500 hover:text-[#3744C8] hover:border-[#3744C8]/40 hover:bg-[#f7f8ff] transition-colors cursor-pointer"
                          >
                            <Paperclip className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => supprimer(c.id, c.label)}
                          disabled={enCours === c.id}
                          title="Supprimer"
                          aria-label="Supprimer"
                          className="p-2 rounded-lg border border-[#e2e5f0] text-gray-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          {enCours === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Carte({
  libelle,
  valeur,
  note,
  fort,
}: {
  libelle: string;
  valeur: string;
  note?: string;
  fort?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] p-4">
      <div className="text-xs text-gray-500">{libelle}</div>
      <div className={`text-xl font-bold mt-1 ${fort ? "text-[#3744C8]" : "text-gray-900"}`}>
        {valeur}
      </div>
      {note && <div className="text-[11px] text-gray-400 mt-0.5">{note}</div>}
    </div>
  );
}
