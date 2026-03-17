"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronDown, ChevronUp, Calendar, Package, Clock,
  ShoppingCart, Wallet, ShoppingBag, Handshake, CheckCircle,
  XCircle, Loader2, Star, CircleDot, PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { marquerPretRetrait, marquerNoShow } from "@/app/(shop)/shop/paniers/orders/_actions";
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
  pickupDate: string;
  isToday: boolean;
  rating: number | null;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  paid:             { label: "En cours",   cls: "bg-blue-100 text-blue-700" },
  ready_for_pickup: { label: "Prête",      cls: "bg-amber-100 text-amber-700" },
  picked_up:        { label: "Récupérée",  cls: "bg-green-100 text-green-700" },
  no_show:          { label: "Non venu",   cls: "bg-red-100 text-red-700" },
  refunded:         { label: "Remboursée", cls: "bg-gray-100 text-gray-600" },
  cancelled_admin:  { label: "Annulée",    cls: "bg-red-100 text-red-700" },
  created:          { label: "Créée",      cls: "bg-gray-100 text-gray-600" },
};

const TYPE_LABELS: Record<string, string> = {
  bassari: "Bassari", halavi: "Halavi", parve: "Parvé", shabbat: "Shabbat", mix: "Mix",
};

/* ───── Order Row ───── */
function OrderRow({ order, compact }: { order: Order; compact?: boolean }) {
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
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#fafbff] transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left flex-wrap">
          <span className="font-mono font-semibold text-[#3744C8] text-sm">{order.orderNumber}</span>
          {order.isDonation && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Don
            </span>
          )}
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
            {status.label}
          </span>
          {!compact && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar className="h-3 w-3" /> {order.date}
            </span>
          )}
          {compact && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="h-3 w-3" /> {order.pickupTime}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className={`text-sm font-bold ${order.isDonation ? "text-purple-600" : "text-gray-900"}`}>
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
        <div className="px-5 pb-5 pt-1 border-t border-[#f0f1f5]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#fafbff] rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Package className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</span>
              </div>
              <div className="font-semibold text-gray-900 text-sm">{TYPE_LABELS[order.basketType] ?? order.basketType}</div>
            </div>
            <div className="bg-[#fafbff] rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Quantité</span>
              </div>
              <div className="font-semibold text-gray-900 text-sm">{order.quantity} panier{order.quantity > 1 ? "s" : ""} x {order.pricePerBasket.toFixed(2)}€</div>
            </div>
            <div className="bg-[#fafbff] rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Jour</span>
              </div>
              <div className="font-semibold text-gray-900 text-sm">{order.basketDay}</div>
            </div>
            <div className="bg-[#fafbff] rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Retrait</span>
              </div>
              <div className="font-semibold text-gray-900 text-sm">{order.pickupTime}</div>
            </div>
          </div>

          {/* Rating */}
          {order.rating !== null && (
            <div className="flex items-center gap-2 mt-3 px-1">
              <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-3 py-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-amber-700">{order.rating}/5</span>
                <span className="text-xs text-amber-600 ml-1">Note client</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {["paid", "ready_for_pickup"].includes(order.status) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#f0f1f5] flex-wrap">
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
              {order.status === "ready_for_pickup" && (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                  <Clock className="h-3.5 w-3.5" />
                  En attente de confirmation client
                </span>
              )}
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

/* ───── Today Section ───── */
function TodaySection({ orders }: { orders: Order[] }) {
  const pending  = orders.filter((o) => ["paid", "ready_for_pickup"].includes(o.status));
  const pickedUp = orders.filter((o) => o.status === "picked_up");
  const noShow   = orders.filter((o) => o.status === "no_show");

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-8 text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 font-medium">Aucune commande aujourd&apos;hui</p>
        <p className="text-xs text-gray-400 mt-1">Les commandes du jour apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 mb-8">
      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <CircleDot className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-700">{pending.length} en attente</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-green-50 border border-green-200 rounded-xl">
          <PackageCheck className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-green-700">{pickedUp.length} récupérée{pickedUp.length > 1 ? "s" : ""}</span>
        </div>
        {noShow.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-50 border border-red-200 rounded-xl">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">{noShow.length} non venu{noShow.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Pending orders */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              À récupérer ({pending.length})
            </h3>
          </div>
          {pending.map((o) => <OrderRow key={o.id} order={o} compact />)}
        </div>
      )}

      {/* Picked up orders */}
      {pickedUp.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Récupérées ({pickedUp.length})
            </h3>
          </div>
          {pickedUp.map((o) => <OrderRow key={o.id} order={o} compact />)}
        </div>
      )}

      {/* No-show orders */}
      {noShow.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Non venus ({noShow.length})
            </h3>
          </div>
          {noShow.map((o) => <OrderRow key={o.id} order={o} compact />)}
        </div>
      )}
    </div>
  );
}

/* ───── Main Component ───── */
export function ShopOrdersClient({
  orders,
  kpis,
  todayStr,
}: {
  orders: Order[];
  kpis: { label: string; value: string; borderColor: string; icon: string }[];
  todayStr: string;
}) {
  const [search, setSearch] = useState("");
  const [showAllOrders, setShowAllOrders] = useState(false);

  const todayOrders = orders.filter((o) => o.isToday);
  const filtered = orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border-l-4 ${k.borderColor} border-t border-r border-b border-[#e2e5f0] shadow-sm p-4 flex items-center justify-between`}>
            <div>
              <div className="text-xs text-gray-400 font-medium mb-1">{k.label}</div>
              <div className="text-xl font-bold text-gray-900">{k.value}</div>
            </div>
            {(() => { const Icon = KPI_ICONS[k.icon]; return Icon ? <Icon className="h-6 w-6 text-gray-300" /> : null; })()}
          </div>
        ))}
      </div>

      {/* Today's orders section */}
      <div className="mb-2">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3744C8]/10">
            <Calendar className="h-4 w-4 text-[#3744C8]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Commandes du jour</h2>
            <p className="text-xs text-gray-400">
              {todayOrders.length > 0
                ? `${todayOrders.length} commande${todayOrders.length > 1 ? "s" : ""} aujourd'hui`
                : "Aucune commande aujourd'hui"}
            </p>
          </div>
        </div>
        <TodaySection orders={todayOrders} />
      </div>

      {/* All orders (collapsible) */}
      <div>
        <button
          onClick={() => setShowAllOrders((v) => !v)}
          className="flex items-center gap-2.5 mb-4 group"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
            <ShoppingBag className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              Historique des commandes
              {showAllOrders
                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </h2>
            <p className="text-xs text-gray-400">{orders.length} commande{orders.length > 1 ? "s" : ""} au total</p>
          </div>
        </button>

        {showAllOrders && (
          <>
            {/* Search */}
            <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 mb-4">
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
          </>
        )}
      </div>
    </div>
  );
}
