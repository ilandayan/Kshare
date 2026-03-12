"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface DayData { day: string; paniers: number }

const PERIODS = [
  { value: "today",    label: "Aujourd'hui" },
  { value: "week",     label: "Cette semaine" },
  { value: "month",    label: "Ce mois" },
  { value: "3months",  label: "3 derniers mois" },
  { value: "6months",  label: "6 derniers mois" },
  { value: "12months", label: "12 derniers mois" },
  { value: "year",     label: "Cette année" },
  { value: "total",    label: "Total" },
] as const;

function PeriodSelector({ period }: { period: string }) {
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
        className="text-sm font-medium text-gray-800 bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/25 cursor-pointer"
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
    </div>
  );
}

export function AssoDashboardCharts({ period, barData, barTitle }: { period: string; barData: DayData[]; barTitle: string }) {
  return (
    <>
      <PeriodSelector period={period} />

      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-6 text-sm">{barTitle}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ border: "1px solid #e2e5f0", borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              cursor={{ fill: "#f3e8ff" }}
            />
            <Bar dataKey="paniers" fill="url(#purpleGrad)" radius={[4, 4, 0, 0]} />
            <defs>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
