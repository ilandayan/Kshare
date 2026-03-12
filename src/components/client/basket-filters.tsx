"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState, useCallback } from "react";

const TYPE_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "bassari", label: "\ud83e\udd69 Bassari" },
  { value: "halavi", label: "\ud83e\uddc0 Halavi" },
  { value: "parve", label: "\ud83c\udf3f Parve" },
  { value: "shabbat", label: "\ud83c\udf77 Shabbat" },
  { value: "mix", label: "\u2795 Mix" },
];

const DAY_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "today", label: "Aujourd'hui" },
  { value: "tomorrow", label: "Demain" },
];

interface BasketFiltersProps {
  cities: string[];
}

export function BasketFilters({ cities }: BasketFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("type") ?? "";
  const currentCity = searchParams.get("city") ?? "";
  const currentDay = searchParams.get("day") ?? "";
  const currentSearch = searchParams.get("q") ?? "";
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [showFilters, setShowFilters] = useState(
    Boolean(currentType || currentCity || currentDay)
  );

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/client/paniers?${params.toString()}`);
    },
    [router, searchParams]
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams("q", searchValue.trim());
  }

  return (
    <div className="space-y-3">
      {/* Search bar + toggle */}
      <div className="flex gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un commerce, une ville..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2e5f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </form>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            showFilters
              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
              : "bg-white border-[#e2e5f0] text-gray-600 hover:bg-gray-50"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtres</span>
        </button>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 bg-white border border-[#e2e5f0] rounded-xl p-4">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
            <select
              value={currentType}
              onChange={(e) => updateParams("type", e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ville</label>
            <select
              value={currentCity}
              onChange={(e) => updateParams("city", e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Disponibilite</label>
            <select
              value={currentDay}
              onChange={(e) => updateParams("day", e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {DAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
