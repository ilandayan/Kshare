"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface DayData { day: string; paniers: number }

export function AssoDashboardCharts({ barData }: { barData: DayData[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-6 text-sm">Paniers récupérés cette semaine</h3>
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
  );
}
