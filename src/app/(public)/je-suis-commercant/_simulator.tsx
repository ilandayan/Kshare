"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, CheckCircle, Star } from "lucide-react";

// Plans Kshare (alignés avec constants.ts)
const STARTER_COMMISSION = 0.18;
const PRO_COMMISSION = 0.12;
const PRO_MONTHLY = 29;

export default function Simulator() {
  const [basketsPerWeek, setBasketsPerWeek] = useState(20);
  const [pricePerBasket, setPricePerBasket] = useState(5);

  const monthlyBaskets = basketsPerWeek * 4.33;

  const {
    grossMonthly,
    starterCommission,
    starterNet,
    proCommission,
    proNet,
    bestPlan,
    savingsProVsStarter,
  } = useMemo(() => {
    const grossMonthly = monthlyBaskets * pricePerBasket;
    const starterCommission = grossMonthly * STARTER_COMMISSION;
    const starterNet = grossMonthly - starterCommission;
    const proCommission = grossMonthly * PRO_COMMISSION;
    const proNet = grossMonthly - proCommission - PRO_MONTHLY;
    const bestPlan = proNet > starterNet ? "pro" : "starter";
    const savingsProVsStarter = proNet - starterNet;
    return { grossMonthly, starterCommission, starterNet, proCommission, proNet, bestPlan, savingsProVsStarter };
  }, [monthlyBaskets, pricePerBasket]);

  const formatEur = (n: number) =>
    n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <div className="bg-white rounded-3xl border border-[#e2e5f0]/60 p-6 md:p-10 card-elevated">
      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div>
          <Label htmlFor="baskets" className="text-sm font-semibold text-gray-700 mb-2 block">
            Paniers vendus par semaine
          </Label>
          <div className="relative">
            <Input
              id="baskets"
              type="number"
              min={1}
              max={500}
              value={basketsPerWeek}
              onChange={(e) => setBasketsPerWeek(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
              className="pr-24 text-lg font-semibold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">paniers / sem.</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={basketsPerWeek}
            onChange={(e) => setBasketsPerWeek(Number(e.target.value))}
            className="w-full mt-3 accent-[#3744C8]"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span>
            <span>50</span>
            <span>100+</span>
          </div>
        </div>

        <div>
          <Label htmlFor="price" className="text-sm font-semibold text-gray-700 mb-2 block">
            Prix moyen par panier
          </Label>
          <div className="relative">
            <Input
              id="price"
              type="number"
              min={1}
              max={100}
              step={0.5}
              value={pricePerBasket}
              onChange={(e) => setPricePerBasket(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="pr-24 text-lg font-semibold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">€ / panier</span>
          </div>
          <input
            type="range"
            min={2}
            max={30}
            step={0.5}
            value={pricePerBasket}
            onChange={(e) => setPricePerBasket(Number(e.target.value))}
            className="w-full mt-3 accent-[#3744C8]"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>2€</span>
            <span>15€</span>
            <span>30€</span>
          </div>
        </div>
      </div>

      {/* CA généré */}
      <div className="bg-gradient-to-br from-[#F4F5FB] to-[#E8ECF8] rounded-2xl p-5 mb-6 text-center border border-[#e2e5f0]/60">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Chiffre d&apos;affaires mensuel estimé
        </div>
        <div className="text-4xl font-display font-bold bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] bg-clip-text text-transparent mb-1">
          {formatEur(grossMonthly)}
        </div>
        <div className="text-xs text-gray-500">
          ~{Math.round(monthlyBaskets)} paniers/mois × {formatEur(pricePerBasket)}
        </div>
      </div>

      {/* Comparaison plans */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-5">
        {/* STARTER */}
        <div
          className={`relative rounded-2xl p-6 border-2 transition-all ${
            bestPlan === "starter"
              ? "border-[#3744C8] bg-[#EEF0F8] shadow-lg"
              : "border-gray-200 bg-white"
          }`}
        >
          {bestPlan === "starter" && (
            <div className="absolute -top-3 left-6 bg-[#3744C8] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
              <Star className="h-3 w-3 fill-white" />
              Meilleur pour vous
            </div>
          )}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Starter</div>
            <div className="text-3xl font-display font-bold text-gray-900 mb-1">Gratuit</div>
            <div className="text-sm text-gray-500">Aucun abonnement</div>
          </div>
          <div className="space-y-2 text-sm mb-5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">CA brut</span>
              <span className="font-semibold text-gray-900">{formatEur(grossMonthly)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Commission (18 %)</span>
              <span className="font-semibold text-red-500">- {formatEur(starterCommission)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Abonnement</span>
              <span className="text-gray-400">—</span>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-gray-700">Vous gardez</span>
              <span className="text-2xl font-display font-bold text-[#3744C8]">{formatEur(starterNet)}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">par mois</div>
          </div>
          <ul className="mt-5 space-y-1.5">
            {["Inscription gratuite", "Sans engagement", "Publication illimitée", "Support email"].map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* PRO */}
        <div
          className={`relative rounded-2xl p-6 border-2 transition-all ${
            bestPlan === "pro"
              ? "border-[#3744C8] bg-[#EEF0F8] shadow-lg"
              : "border-gray-200 bg-white"
          }`}
        >
          {bestPlan === "pro" && (
            <div className="absolute -top-3 left-6 bg-[#3744C8] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
              <Star className="h-3 w-3 fill-white" />
              Meilleur pour vous
            </div>
          )}
          <div className="mb-4">
            <div className="text-xs font-semibold text-[#3744C8] uppercase tracking-wider mb-1">Pro</div>
            <div className="text-3xl font-display font-bold text-gray-900 mb-1">29 €<span className="text-base font-normal text-gray-500">/mois</span></div>
            <div className="text-sm text-gray-500">Prélèvement SEPA</div>
          </div>
          <div className="space-y-2 text-sm mb-5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">CA brut</span>
              <span className="font-semibold text-gray-900">{formatEur(grossMonthly)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Commission (12 %)</span>
              <span className="font-semibold text-red-500">- {formatEur(proCommission)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Abonnement</span>
              <span className="font-semibold text-red-500">- {formatEur(PRO_MONTHLY)}</span>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-gray-700">Vous gardez</span>
              <span className="text-2xl font-display font-bold text-[#3744C8]">{formatEur(proNet)}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">par mois</div>
          </div>
          <ul className="mt-5 space-y-1.5">
            {["Commission réduite à 12 %", "Statistiques avancées", "Support prioritaire", "Badge Premium"].map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommandation */}
      {Math.abs(savingsProVsStarter) > 5 && (
        <div className={`mt-6 rounded-xl p-4 border flex items-start gap-3 ${
          bestPlan === "pro"
            ? "bg-emerald-50 border-emerald-200"
            : "bg-blue-50 border-blue-200"
        }`}>
          <TrendingUp className={`h-5 w-5 shrink-0 mt-0.5 ${bestPlan === "pro" ? "text-emerald-600" : "text-blue-600"}`} />
          <div className="text-sm">
            {bestPlan === "pro" ? (
              <>
                <span className="font-semibold text-emerald-800">Le plan Pro est plus avantageux pour vous.</span>
                <span className="text-emerald-700"> Vous gagnez {formatEur(savingsProVsStarter)} de plus par mois qu&apos;avec le Starter.</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-blue-800">Le plan Starter est le plus avantageux pour démarrer.</span>
                <span className="text-blue-700"> Vous pourrez passer Pro plus tard, quand votre volume sera plus élevé.</span>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
        * Estimation à titre indicatif. Les frais Stripe (~1,4 % + 0,25 €/transaction) sont facturés séparément.
        <br />
        Reversement hebdomadaire sur votre compte bancaire chaque mardi.
      </p>
    </div>
  );
}
