"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

/* ── Types ───────────────────────────────────────────────────── */
interface DayData   { day: string; ventes: number }
interface TypeData  { name: string; value: number; color: string }

interface DashboardChartsProps {
  period: string;
  barData: DayData[];
  pieData: TypeData[];
  avgPrice: number;
  donCommerce: number;
  donClients: number;
}

/* ── Period selector ─────────────────────────────────────────── */
const PERIODS = [
  { value: "week",    label: "Cette semaine" },
  { value: "month",   label: "Ce mois" },
  { value: "3months", label: "3 derniers mois" },
] as const;

export function PeriodSelector({ period }: { period: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 flex items-center gap-4 mb-6">
      <span className="text-sm text-gray-500 font-medium">Période :</span>
      <select
        value={period}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm font-medium text-gray-800 bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 cursor-pointer"
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Charts + métriques ──────────────────────────────────────── */
export function DashboardCharts({ period, barData, pieData, avgPrice, donCommerce, donClients }: DashboardChartsProps) {
  return (
    <>
      <PeriodSelector period={period} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Bar chart */}
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-6 text-sm">Ventes de la semaine</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: "1px solid #e2e5f0", borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                cursor={{ fill: "#EEF0F8" }}
              />
              <Bar dataKey="ventes" fill="url(#blueGrad)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3744C8" />
                  <stop offset="100%" stopColor="#2B38B8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Répartition par type de panier</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
              Aucune donnée pour cette période
            </div>
          )}
        </div>
      </div>

      {/* Métriques détaillées */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-5 text-sm">Métriques détaillées</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-gray-400 mb-1">Prix moyen par panier</div>
            <div className="text-xl font-bold text-gray-900">{avgPrice.toFixed(2)}€</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Paniers dons (commerçant)</div>
            <div className="text-xl font-bold text-gray-900">{donCommerce} paniers</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Paniers dons (clients)</div>
            <div className="text-xl font-bold text-gray-900">{donClients} paniers</div>
          </div>
        </div>
      </div>
    </>
  );
}
