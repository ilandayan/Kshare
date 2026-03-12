"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, ChevronUp, Calendar, Package, Clock, ShoppingCart, Wallet, ShoppingBag, Handshake, CheckCircle, XCircle, Loader2, type LucideIcon } from "lucide-react";
import { marquerPretRetrait, confirmerRetrait, marquerNoShow } from "@/app/(shop)/shop/paniers/orders/_actions";
import { toast } from "sonner";

const KPI_ICONS: Record<string, LucideIcon> = {
  ShoppingCart, Wallet, ShoppingBag, Handshake,
};

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  date: string;
  quantity: number;
  pricePerBasket: number;
  total: number;
  isDonation: boolean;
  basketType: string;
  basketDay: string;
  pickupTime: string;
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

const TYPE_LABELS: Record<string, string> = {
  bassari: "Bassari", halavi: "Halavi", parve: "Parvé", shabbat: "Shabbat", mix: "Mix",
};

function OrderRow({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const status = STATUS_CONFIG[order.status] ?? { label: order.status, cls: "bg-gray-100 text-gray-500" };

  function handleAction(action: (id: string) => Promise<{ success: boolean; error?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action(order.id);
      if (result.success) {
        toast.success(successMsg);
        router.refresh();
      } else {
        toast.error("error" in result ? (result as { error: string }).error : "Erreur");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-hidden mb-3">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#fafbff] transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 text-left">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-semibold text-[#3744C8] text-sm">{order.orderNumber}</span>
            {order.isDonation && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                Don - Mitzvah
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {order.date}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <div className="text-xs text-gray-400">Total</div>
            <div className={`text-base font-bold ${order.isDonation ? "text-purple-600" : "text-gray-900"}`}>
              {order.isDonation ? "Don" : `${order.total.toFixed(2)}€`}
            </div>
          </div>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-gray-400" />
            : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-6 pb-5 pt-1 border-t border-[#f0f1f5]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#fafbff] rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Package className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</span>
              </div>
              <div className="font-semibold text-gray-900 text-sm">{TYPE_LABELS[order.basketType] ?? order.basketType}</div>
            </div>
            <div className="bg-[#fafbff] rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Quantité</span>
              </div>
              <div className="font-semibold text-gray-900 text-sm">{order.quantity} panier{order.quantity > 1 ? "s" : ""} x {order.pricePerBasket.toFixed(2)}€</div>
            </div>
            <div className="bg-[#fafbff] rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Jour</span>
              </div>
              <div className="font-semibold text-gray-900 text-sm">{order.basketDay}</div>
            </div>
            <div className="bg-[#fafbff] rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Retrait</span>
              </div>
              <div className="font-semibold text-gray-900 text-sm">{order.pickupTime}</div>
            </div>
          </div>

          {/* Action buttons */}
          {["paid", "ready_for_pickup"].includes(order.status) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#f0f1f5]">
              {order.status === "paid" && (
                <button
                  disabled={isPending}
                  onClick={() => handleAction(marquerPretRetrait, "Commande marquée prête !")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                  Prêt pour retrait
                </button>
              )}
              <button
                disabled={isPending}
                onClick={() => handleAction(confirmerRetrait, "Retrait confirmé !")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Confirmer retrait
              </button>
              <button
                disabled={isPending}
                onClick={() => handleAction(marquerNoShow, "Commande marquée comme non venu")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Non venu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ShopOrdersClient({ orders, kpis }: { orders: Order[]; kpis: { label: string; value: string; borderColor: string; icon: string }[] }) {
  const [search, setSearch] = useState("");

  const filtered = orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border-l-4 ${k.borderColor} border-t border-r border-b border-[#e2e5f0] shadow-sm p-5 flex items-center justify-between`}>
            <div>
              <div className="text-xs text-gray-400 font-medium mb-1">{k.label}</div>
              <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            </div>
            {(() => { const Icon = KPI_ICONS[k.icon]; return Icon ? <Icon className="h-7 w-7 text-gray-400" /> : null; })()}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro de commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 focus:border-[#3744C8] transition-colors placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-12 text-center text-gray-400">
          <p className="text-sm">Aucune commande trouvée</p>
        </div>
      ) : (
        filtered.map((o) => <OrderRow key={o.id} order={o} />)
      )}
    </div>
  );
}
