"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp, User, Store, Calendar, Package } from "lucide-react";

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  date: string;
  quantity: number;
  pricePerBasket: number;
  total: number;
  isDonation: boolean;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  commerceName: string;
  commerceType: string;
  associationName?: string;
  associationEmail?: string;
  associationPhone?: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  paid:             { label: "En cours",   cls: "bg-blue-100 text-blue-700" },
  ready_for_pickup: { label: "Prête",      cls: "bg-amber-100 text-amber-700" },
  picked_up:        { label: "Complétée",  cls: "bg-green-100 text-green-700" },
  no_show:          { label: "Non venu",   cls: "bg-red-100 text-red-700" },
  refunded:         { label: "Remboursée", cls: "bg-gray-100 text-gray-600" },
  cancelled_admin:  { label: "Annulée",    cls: "bg-red-100 text-red-700" },
  created:          { label: "Créée",      cls: "bg-gray-100 text-gray-600" },
};

function OrderRow({ order }: { order: AdminOrder }) {
  const [expanded, setExpanded] = useState(true);
  const status = STATUS_CONFIG[order.status] ?? { label: order.status, cls: "bg-gray-100 text-gray-500" };

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-hidden mb-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#fafbff] transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 text-left flex-wrap gap-y-1">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-semibold text-[#3744C8] text-sm">{order.orderNumber}</span>
            {order.isDonation && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                Don - Mitzvah
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {order.date}</span>
            <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {order.quantity} panier{order.quantity > 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <div className="text-xs text-gray-400">Prix/panier</div>
            <div className="text-sm font-medium text-gray-700">
              {order.isDonation ? "Gratuit" : `${order.pricePerBasket.toFixed(2)}€`}
            </div>
          </div>
          <div className="text-right min-w-[70px]">
            <div className="text-xs text-gray-400">Total</div>
            <div className={`text-base font-bold ${order.isDonation ? "text-purple-600 text-lg" : "text-gray-900"}`}>
              {order.isDonation ? "Don" : `${order.total.toFixed(2)}€`}
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-5 pt-1 border-t border-[#f0f1f5]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#fafbff] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {order.isDonation
                  ? <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><Store className="h-4 w-4 text-purple-500" /></div>
                  : <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><User className="h-4 w-4 text-[#3744C8]" /></div>}
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {order.isDonation ? "Association" : "Client"}
                </span>
              </div>
              <div className="font-semibold text-gray-900 text-sm mb-1">
                {order.isDonation ? (order.associationName ?? "Association") : order.clientName}
              </div>
              {order.isDonation ? (
                <>
                  {order.associationEmail && <div className="text-xs text-gray-400">✉️ {order.associationEmail}</div>}
                  {order.associationPhone && <div className="text-xs text-gray-400 mt-0.5">📞 {order.associationPhone}</div>}
                </>
              ) : (
                <>
                  <div className="text-xs text-gray-400">✉️ {order.clientEmail}</div>
                  <div className="text-xs text-gray-400 mt-0.5">📞 {order.clientPhone}</div>
                </>
              )}
            </div>
            <div className="bg-[#fafbff] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Store className="h-4 w-4 text-orange-500" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Commerçant</span>
              </div>
              <div className="font-semibold text-gray-900 text-sm mb-1">{order.commerceName}</div>
              <div className="text-xs text-gray-400">{order.commerceType}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminOrdersClient({
  orders,
  kpis,
}: {
  orders: AdminOrder[];
  kpis: { label: string; value: string; borderColor: string; icon: string }[];
}) {
  const [search, setSearch] = useState("");

  const filtered = orders.filter((o) =>
    !search ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.clientName.toLowerCase().includes(search.toLowerCase()) ||
    o.commerceName.toLowerCase().includes(search.toLowerCase()) ||
    (o.associationName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border-l-4 ${k.borderColor} border-t border-r border-b border-[#e2e5f0] shadow-sm p-5 flex items-center justify-between`}>
            <div><div className="text-xs text-gray-400 mb-1">{k.label}</div><div className="text-2xl font-bold text-gray-900">{k.value}</div></div>
            <span className="text-3xl">{k.icon}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par commande, client ou commerçant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 focus:border-[#3744C8] transition-colors placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-12 text-center text-gray-400 text-sm">
          Aucune commande trouvée
        </div>
      ) : (
        filtered.map((o) => <OrderRow key={o.id} order={o} />)
      )}
    </div>
  );
}
