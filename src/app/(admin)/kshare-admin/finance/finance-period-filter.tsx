"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const LAUNCH_YEAR = 2026;

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

function getYearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  const years: { value: string; label: string }[] = [];
  for (let y = LAUNCH_YEAR; y <= currentYear; y++) {
    years.push({ value: `y${y}`, label: y.toString() });
  }
  return years;
}

export function FinancePeriodFilter({ period }: { period: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const years = getYearOptions();

  const setPeriod = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => setPeriod(p.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${
            period === p.value
              ? "bg-[#3744C8] text-white shadow-sm"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-[#e2e5f0]"
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* Séparateur */}
      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Années */}
      {years.map((y) => (
        <button
          key={y.value}
          onClick={() => setPeriod(y.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${
            period === y.value
              ? "bg-[#3744C8] text-white shadow-sm"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-[#e2e5f0]"
          }`}
        >
          {y.label}
        </button>
      ))}
    </div>
  );
}
