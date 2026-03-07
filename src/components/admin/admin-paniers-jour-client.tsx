"use client";

import { useState } from "react";

interface BasketRow {
  id: string;
  commerceName: string;
  type: string;
  pickupTime: string;
  price: number;
  quantity: number;
  isDonation: boolean;
  status: "published" | "draft" | "sold_out";
}

interface PaniersJourClientProps {
  todayBaskets:    BasketRow[];
  tomorrowBaskets: BasketRow[];
  commerceNames:   string[];
  kpis: { label: string; value: string; color: string; icon: string; }[];
}

const TYPE_LABELS: Record<string, string> = {
  bassari: "Bassari", halavi: "Halavi", parve: "Parvé", shabbat: "Shabbat", mix: "Mix",
};

function StatusCell({ isDonation, status }: { isDonation: boolean; status: string }) {
  if (isDonation) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      🤝 Don
    </span>
  );
  if (status === "published") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Vente
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      Planifié
    </span>
  );
}

function BasketTable({ title, baskets, typeFilter, commerceFilter, statusFilter }: {
  title: string;
  baskets: BasketRow[];
  typeFilter: string;
  commerceFilter: string;
  statusFilter: string;
}) {
  const filtered = baskets.filter((b) => {
    const matchType    = typeFilter    === "" || b.type === typeFilter;
    const matchCommerce = commerceFilter === "" || b.commerceName === commerceFilter;
    const matchStatus  = statusFilter  === "" || (statusFilter === "don" ? b.isDonation : !b.isDonation && b.status === statusFilter);
    return matchType && matchCommerce && matchStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-hidden mb-5">
      <div className="px-6 py-4 border-b border-[#e2e5f0]">
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">Aucun panier</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e5f0]">
                {["Commerce", "Type panier", "Heure retrait", "Prix", "Quantité", "Statut"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f1f5]">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-[#fafbff] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">🏪</span>
                      <span className="font-medium text-[#3744C8]">{b.commerceName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{TYPE_LABELS[b.type] ?? b.type}</td>
                  <td className="px-6 py-4 text-sm text-[#3744C8] font-medium">{b.pickupTime}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {b.isDonation ? "0€" : `${b.price}€`}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-[#f0f1f5] rounded-lg text-sm font-bold text-gray-700">
                      {b.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusCell isDonation={b.isDonation} status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminPaniersJourClient({
  todayBaskets, tomorrowBaskets, commerceNames, kpis,
}: PaniersJourClientProps) {
  const [typeFilter,    setTypeFilter]    = useState("");
  const [commerceFilter, setCommerceFilter] = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");

  const allTypes = ["bassari", "halavi", "parve", "shabbat", "mix"];

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-gray-400 font-medium">{k.label}</p>
              <span className="text-2xl">{k.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 mb-5 flex items-center gap-3 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 text-gray-700"
        >
          <option value="">Tous les types</option>
          {allTypes.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select
          value={commerceFilter}
          onChange={(e) => setCommerceFilter(e.target.value)}
          className="text-sm bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 text-gray-700"
        >
          <option value="">Tous les commerces</option>
          {commerceNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 text-gray-700"
        >
          <option value="">Tous</option>
          <option value="published">Vente</option>
          <option value="don">Dons</option>
          <option value="draft">Planifiés</option>
        </select>
      </div>

      <BasketTable title="Paniers aujourd'hui" baskets={todayBaskets}    typeFilter={typeFilter} commerceFilter={commerceFilter} statusFilter={statusFilter} />
      <BasketTable title="Paniers demain"      baskets={tomorrowBaskets} typeFilter={typeFilter} commerceFilter={commerceFilter} statusFilter={statusFilter} />
    </div>
  );
}
