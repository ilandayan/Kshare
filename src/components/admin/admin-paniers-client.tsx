"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Wallet, Store, Handshake, ShoppingCart, type LucideIcon } from "lucide-react";

export interface BasketRow {
  id: string;
  commerceName: string;
  type: string;
  pickupTime: string;
  price: number;
  originalPrice: number;
  quantityRemaining: number;
  quantitySold: number;
  isDonation: boolean;
  status: "published" | "sold_out" | "expired" | "disabled";
  day: string;
}

export interface OrderStats {
  ca: number;
  soldCount: number;
}

interface PaniersClientProps {
  baskets: BasketRow[];
  commerceNames: string[];
  orderStats: Record<string, OrderStats>;
}

const TYPE_LABELS: Record<string, string> = {
  bassari: "Bassari", halavi: "Halavi", parve: "Parvé", shabbat: "Shabbat", mix: "Mix",
};

const DAY_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  tomorrow: "Demain",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  published: { label: "Vente",     bg: "bg-green-100", text: "text-green-700" },
  sold_out:  { label: "Épuisé",    bg: "bg-red-100",   text: "text-red-700" },
  expired:   { label: "Expiré",    bg: "bg-gray-100",  text: "text-gray-500" },
  disabled:  { label: "Désactivé", bg: "bg-gray-100",  text: "text-gray-400" },
};

function StatusCell({ isDonation, status }: { isDonation: boolean; status: string }) {
  if (isDonation) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Handshake className="h-3.5 w-3.5" /> Don
    </span>
  );
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.published;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

const SUB_TABS = [
  { key: "today",    label: "Aujourd'hui" },
  { key: "tomorrow", label: "Demain" },
  { key: "all",      label: "Tous" },
] as const;

type TabKey = typeof SUB_TABS[number]["key"];

interface KpiCard {
  label: string;
  value: string;
  color: string;
  Icon: LucideIcon;
}

function computeKpis(tabBaskets: BasketRow[], activeTab: TabKey, stats: OrderStats): KpiCard[] {
  const totalCount    = tabBaskets.length;
  const commerceCount = new Set(tabBaskets.map((b) => b.commerceName)).size;
  const donCount      = tabBaskets.filter((b) => b.isDonation).length;

  const dayLabel = activeTab === "today" ? "aujourd'hui" : activeTab === "tomorrow" ? "demain" : "total";
  const caLabel  = activeTab === "today" ? "CA du jour" : activeTab === "tomorrow" ? "CA prévisionnel" : "CA total";

  const kpis: KpiCard[] = [
    { label: `Paniers ${dayLabel}`,  value: totalCount.toString(),                color: "text-[#D72638]",  Icon: ShoppingBag },
    { label: caLabel,                value: `${stats.ca.toFixed(2)}€`,            color: "text-green-600",  Icon: Wallet },
    { label: "Commerces actifs",     value: commerceCount.toString(),             color: "text-purple-600", Icon: Store },
    { label: "Paniers dons",         value: donCount.toString(),                  color: "text-amber-600",  Icon: Handshake },
  ];

  // "Paniers vendus" uniquement pour Aujourd'hui et Tous
  if (activeTab !== "tomorrow") {
    kpis.push({
      label: "Paniers vendus",
      value: stats.soldCount.toString(),
      color: "text-[#3744C8]",
      Icon:  ShoppingCart,
    });
  }

  return kpis;
}

export function AdminPaniersClient({ baskets, commerceNames, orderStats }: PaniersClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [typeFilter, setTypeFilter] = useState("");
  const [commerceFilter, setCommerceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const allTypes = ["bassari", "halavi", "parve", "shabbat", "mix"];

  // Baskets filtrées par sous-onglet
  const tabBaskets = useMemo(
    () => activeTab === "all" ? baskets : baskets.filter((b) => b.day === activeTab),
    [baskets, activeTab],
  );

  // Stats commandes réelles pour l'onglet actif
  const currentStats = orderStats[activeTab] ?? { ca: 0, soldCount: 0 };

  // KPIs dynamiques (CA et vendus viennent des commandes réelles)
  const kpis = useMemo(
    () => computeKpis(tabBaskets, activeTab, currentStats),
    [tabBaskets, activeTab, currentStats],
  );

  // Baskets filtrées par sous-onglet + filtres utilisateur (pour la table)
  const filtered = useMemo(() => tabBaskets.filter((b) => {
    if (typeFilter && b.type !== typeFilter) return false;
    if (commerceFilter && b.commerceName !== commerceFilter) return false;
    if (statusFilter === "don" && !b.isDonation) return false;
    if (statusFilter && statusFilter !== "don" && (b.isDonation || b.status !== statusFilter)) return false;
    return true;
  }), [tabBaskets, typeFilter, commerceFilter, statusFilter]);

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex items-center gap-2 mb-5">
        {SUB_TABS.map((tab) => {
          const count = tab.key === "all"
            ? baskets.length
            : baskets.filter((b) => b.day === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-[#D72638] to-[#FF6B6B] text-white shadow-sm"
                  : "bg-white border border-[#e2e5f0] text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* KPI cards — dynamiques selon le sous-onglet */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${kpis.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-5 mb-6`}>
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-gray-400 font-medium">{k.label}</p>
              <k.Icon className="h-6 w-6 text-gray-400" />
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
          className="text-sm bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D72638]/25 text-gray-700 cursor-pointer"
        >
          <option value="">Tous les types</option>
          {allTypes.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select
          value={commerceFilter}
          onChange={(e) => setCommerceFilter(e.target.value)}
          className="text-sm bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D72638]/25 text-gray-700 cursor-pointer"
        >
          <option value="">Tous les commerces</option>
          {commerceNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D72638]/25 text-gray-700 cursor-pointer"
        >
          <option value="">Tous les statuts</option>
          <option value="published">Vente</option>
          <option value="don">Dons</option>
          <option value="sold_out">Épuisés</option>
          <option value="expired">Expirés</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e5f0] flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            {activeTab === "today" ? "Paniers aujourd'hui" : activeTab === "tomorrow" ? "Paniers demain" : "Tous les paniers"}
          </h2>
          <span className="text-sm text-gray-400">{filtered.length} panier{filtered.length > 1 ? "s" : ""}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">Aucun panier</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e2e5f0]">
                  {["Commerce", "Type", activeTab === "all" ? "Jour" : null, "Heure retrait", "Prix", "Réduction", "Restant", "Vendus", "Statut"].filter(Boolean).map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f5]">
                {filtered.map((b) => {
                  const discount = b.originalPrice > 0 && b.price > 0
                    ? Math.round((1 - b.price / b.originalPrice) * 100)
                    : null;
                  return (
                    <tr key={b.id} className="hover:bg-[#fafbff] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Store className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-[#D72638]">{b.commerceName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{TYPE_LABELS[b.type] ?? b.type}</td>
                      {activeTab === "all" && (
                        <td className="px-6 py-4 text-sm text-gray-700">{DAY_LABELS[b.day] ?? b.day}</td>
                      )}
                      <td className="px-6 py-4 text-sm text-[#D72638] font-medium">{b.pickupTime}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {b.isDonation ? "0€" : `${b.price.toFixed(2)}€`}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {discount !== null ? (
                          <span className="text-green-600 font-medium">-{discount}%</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-[#f0f1f5] rounded-lg text-sm font-bold text-gray-700">
                          {b.quantityRemaining}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${b.quantitySold > 0 ? "bg-green-100 text-green-700" : "bg-[#f0f1f5] text-gray-400"}`}>
                          {b.quantitySold}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusCell isDonation={b.isDonation} status={b.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
