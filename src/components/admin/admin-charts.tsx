"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

interface DayData  { day: string; ventes: number; ca: number }
interface TypeData { type: string; count: number; percent: number; emoji: string; color: string }

interface AdminChartsProps {
  period: string;
  dayData: DayData[];
  typeData: TypeData[];
}

const PERIODS = [
  { value: "week",    label: "Cette semaine" },
  { value: "month",   label: "Ce mois" },
  { value: "3months", label: "3 derniers mois" },
] as const;

export function AdminPeriodSelector({ period }: { period: string }) {
  const router      = useRouter();
  const pathname    = usePathname();
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

export function AdminCharts({ period, dayData, typeData }: AdminChartsProps) {
  return (
    <>
      <AdminPeriodSelector period={period} />

      {/* Charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Line chart — CA */}
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-6 text-sm">Chiffre d&apos;affaires hebdomadaire</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dayData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: "1px solid #e2e5f0", borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                formatter={(v) => [`${v}€`, "CA"]}
              />
              <Line
                type="monotone"
                dataKey="ca"
                stroke="#3744C8"
                strokeWidth={2.5}
                dot={{ fill: "#3744C8", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart — Paniers */}
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
          <h3 className="font-semibold text-[#E8531E] mb-6 text-sm">Paniers vendus par jour</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dayData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: "1px solid #e2e5f0", borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                cursor={{ fill: "#EEF0F8" }}
              />
              <Bar dataKey="ventes" fill="url(#adminBlueGrad)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="adminBlueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3744C8" />
                  <stop offset="100%" stopColor="#2B38B8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Type breakdown */}
      {typeData.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-5 text-sm">Répartition par type de panier</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {typeData.map((t) => (
              <div key={t.type} className="bg-[#f8f9fc] rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 mb-2 font-medium">{t.emoji} {t.type}</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{t.count} paniers</div>
                <div className="text-sm font-semibold text-[#3744C8]">{t.percent}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
