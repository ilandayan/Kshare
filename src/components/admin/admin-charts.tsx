"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { UtensilsCrossed, Milk, Leaf, Wine, Layers, ShoppingCart, Trophy, Star, type LucideIcon } from "lucide-react";

const TYPE_ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Milk, Leaf, Wine, Layers, ShoppingCart,
};

interface DayData  { day: string; ventes: number; ca: number }
interface TypeData { type: string; count: number; percent: number; iconName: string; color: string }
interface RankingEntry { name: string; city: string; ca: number; commission: number; paniers: number; favoris: number; avgRating: number | null; totalRatings: number }

interface AdminChartsProps {
  period: string;
  commerce: string;
  commercesList: { id: string; name: string }[];
  dayData: DayData[];
  typeData: TypeData[];
  caTitle?: string;
  ventesTitle?: string;
  ranking: RankingEntry[];
  favoritesRanking?: RankingEntry[];
  ratingsRanking?: RankingEntry[];
}

const PERIODS = [
  { value: "today",    label: "Aujourd'hui" },
  { value: "week",     label: "Cette semaine" },
  { value: "month",    label: "Ce mois" },
  { value: "3months",  label: "3 derniers mois" },
  { value: "6months",  label: "6 derniers mois" },
  { value: "12months", label: "12 derniers mois" },
  { value: "year",     label: "Cette année" },
  { value: "total",    label: "Total" },
];

function AdminFilters({ period, commerce, commercesList }: { period: string; commerce: string; commercesList: { id: string; name: string }[] }) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  function handleChange(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectCls = "text-sm font-medium text-gray-800 bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 cursor-pointer";

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 flex flex-wrap items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">Période :</span>
        <select
          value={period}
          onChange={(e) => handleChange("period", e.target.value)}
          className={selectCls}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">Commerçant :</span>
        <select
          value={commerce}
          onChange={(e) => handleChange("commerce", e.target.value)}
          className={selectCls}
        >
          <option value="">Tous les commerçants</option>
          {commercesList.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function AdminCharts({ period, commerce, commercesList, dayData, typeData, caTitle, ventesTitle, ranking, favoritesRanking = [], ratingsRanking = [] }: AdminChartsProps) {
  return (
    <>
      <AdminFilters period={period} commerce={commerce} commercesList={commercesList} />

      {/* Charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Line chart — CA */}
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-6 text-sm">{caTitle ?? "Chiffre d'affaires"}</h3>
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
          <h3 className="font-semibold text-[#E8531E] mb-6 text-sm">{ventesTitle ?? "Paniers vendus"}</h3>
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
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-5 text-sm">Répartition par type de panier</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {typeData.map((t) => {
              const Icon = TYPE_ICON_MAP[t.iconName] ?? ShoppingCart;
              return (
                <div key={t.type} className="bg-[#f8f9fc] rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-2 font-medium flex items-center justify-center gap-1.5"><Icon className="h-4 w-4 text-[#3744C8]" /> {t.type}</div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{t.count} paniers</div>
                  <div className="text-sm font-semibold text-[#3744C8]">{t.percent}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Commerce ranking */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <Trophy className="h-5 w-5 text-amber-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Classement des commerçants</h3>
        </div>

        {ranking.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Aucune donnée sur la période sélectionnée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e2e5f0]">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">#</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Commerce</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ville</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Paniers</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">CA</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Commission</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Favoris</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((entry, i) => {
                  const isSelected = commerce && commercesList.find((c) => c.name === entry.name)?.id === commerce;
                  return (
                    <tr
                      key={entry.name}
                      className={`border-b border-[#e2e5f0]/50 last:border-0 transition-colors ${isSelected ? "bg-[#3744C8]/5" : "hover:bg-[#f8f9fc]"}`}
                    >
                      <td className="py-3 px-3">
                        {i < 3 ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-white ${
                            i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : "bg-amber-700"
                          }`}>
                            {i + 1}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium pl-1.5">{i + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-900">{entry.name}</td>
                      <td className="py-3 px-3 text-gray-500">{entry.city || "—"}</td>
                      <td className="py-3 px-3 font-medium text-gray-900">{entry.paniers}</td>
                      <td className="py-3 px-3 font-bold text-green-600">{entry.ca.toFixed(2)}€</td>
                      <td className="py-3 px-3 font-medium text-purple-600">{entry.commission.toFixed(2)}€</td>
                      <td className="py-3 px-3">
                        {entry.favoris > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {entry.favoris}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {entry.avgRating !== null ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {entry.avgRating.toFixed(1)}
                            <span className="text-xs text-gray-400 font-normal">({entry.totalRatings})</span>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Favorites ranking */}
      {favoritesRanking.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6 mt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Commerces les plus mis en favoris</h3>
              <p className="text-xs text-gray-400">Classement par nombre de clients ayant ajouté le commerce en favoris</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e2e5f0]">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">#</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Commerce</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ville</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Favoris</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Paniers vendus</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">CA</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody>
                {favoritesRanking.map((entry, i) => (
                  <tr
                    key={entry.name}
                    className="border-b border-[#e2e5f0]/50 last:border-0 hover:bg-[#f8f9fc] transition-colors"
                  >
                    <td className="py-3 px-3">
                      {i < 3 ? (
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-white ${
                          i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : "bg-amber-700"
                        }`}>
                          {i + 1}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium pl-1.5">{i + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-900">{entry.name}</td>
                    <td className="py-3 px-3 text-gray-500">{entry.city || "—"}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {entry.favoris}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-900">{entry.paniers}</td>
                    <td className="py-3 px-3 font-bold text-green-600">{entry.ca.toFixed(2)}€</td>
                    <td className="py-3 px-3">
                      {entry.avgRating !== null ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {entry.avgRating.toFixed(1)}
                          <span className="text-xs text-gray-400 font-normal">({entry.totalRatings})</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ratings ranking */}
      {ratingsRanking.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6 mt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Commerces les mieux notés</h3>
              <p className="text-xs text-gray-400">Classement par note moyenne des clients</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e2e5f0]">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">#</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Commerce</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ville</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Note</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Avis</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Paniers vendus</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">CA</th>
                </tr>
              </thead>
              <tbody>
                {ratingsRanking.map((entry, i) => (
                  <tr
                    key={entry.name}
                    className="border-b border-[#e2e5f0]/50 last:border-0 hover:bg-[#f8f9fc] transition-colors"
                  >
                    <td className="py-3 px-3">
                      {i < 3 ? (
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-white ${
                          i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : "bg-amber-700"
                        }`}>
                          {i + 1}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium pl-1.5">{i + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-900">{entry.name}</td>
                    <td className="py-3 px-3 text-gray-500">{entry.city || "—"}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {entry.avgRating?.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-600">{entry.totalRatings} avis</td>
                    <td className="py-3 px-3 font-medium text-gray-900">{entry.paniers}</td>
                    <td className="py-3 px-3 font-bold text-green-600">{entry.ca.toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
