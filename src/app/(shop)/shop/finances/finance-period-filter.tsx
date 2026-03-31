"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const LAUNCH_YEAR = 2026;

const BASE_PERIODS = [
  { value: "today",    label: "Aujourd'hui" },
  { value: "week",     label: "Cette semaine" },
  { value: "month",    label: "Ce mois" },
  { value: "3months",  label: "3 derniers mois" },
  { value: "6months",  label: "6 derniers mois" },
  { value: "12months", label: "12 derniers mois" },
  { value: "year",     label: "Cette année" },
  { value: "total",    label: "Total" },
];

function getPeriodOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = LAUNCH_YEAR; y <= currentYear; y++) {
    years.push({ value: `y${y}`, label: `${y}` });
  }
  return [...BASE_PERIODS, ...years];
}

const PERIODS = getPeriodOptions();

export function ShopFinancePeriodFilter({ period }: { period: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
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
