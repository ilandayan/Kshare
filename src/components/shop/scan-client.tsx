"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { ScanLine, Search, XCircle, Package, Clock, User, Hash, Loader2, Info } from "lucide-react";
import { rechercherParCode, type ScanResult } from "@/app/(shop)/shop/scan/_actions";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  paid:             { label: "Payé",            color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  ready_for_pickup: { label: "Prêt à retirer",  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  picked_up:        { label: "Retiré",          color: "text-gray-500",   bg: "bg-gray-50 border-gray-200" },
  no_show:          { label: "Non venu",        color: "text-red-700",    bg: "bg-red-50 border-red-200" },
};

const BASKET_LABELS: Record<string, { label: string; color: string }> = {
  bassari: { label: "Bassari", color: "text-red-600" },
  halavi:  { label: "Halavi",  color: "text-blue-600" },
  parve:   { label: "Parvé",   color: "text-green-600" },
  shabbat: { label: "Shabbat", color: "text-amber-600" },
  mix:     { label: "Mix",     color: "text-purple-600" },
};

type OrderData = Extract<ScanResult, { success: true }>["order"];

export function ScanClient() {
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSearch() {
    if (!code.trim()) return;
    setError("");
    setOrder(null);

    startTransition(async () => {
      const result = await rechercherParCode(code.trim());
      if (result.success) {
        setOrder(result.order);
      } else {
        setError(result.error);
      }
    });
  }

  function handleReset() {
    setCode("");
    setOrder(null);
    setError("");
    inputRef.current?.focus();
  }

  const statusInfo = order ? STATUS_LABELS[order.status] ?? { label: order.status, color: "text-gray-500", bg: "bg-gray-50 border-gray-200" } : null;
  const basketInfo = order ? BASKET_LABELS[order.basketType] ?? { label: order.basketType, color: "text-gray-600" } : null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* ── Search input ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e2a78] to-[#4f6df5] flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Code de retrait</h2>
            <p className="text-xs text-gray-400">Saisissez le code affiché par le client</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ex : 847291"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#2d4de0]/30 focus:border-[#2d4de0] placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-sans"
            disabled={isPending}
          />
          <button
            onClick={handleSearch}
            disabled={isPending || !code.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#1e2a78] to-[#4f6df5] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Order details ── */}
      {order && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Commande</p>
              <p className="text-base font-bold text-gray-900">{order.orderNumber}</p>
            </div>
            {statusInfo && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Client</span>
              <span className="ml-auto text-sm font-medium text-gray-900">{order.clientName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Panier</span>
              <span className={`ml-auto text-sm font-semibold ${basketInfo?.color}`}>
                {basketInfo?.label} x{order.quantity}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Total</span>
              <span className="ml-auto text-sm font-bold text-gray-900">
                {order.isDonation ? "Don" : `${order.totalAmount.toFixed(2)} €`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Créneau</span>
              <span className="ml-auto text-sm text-gray-900">{order.pickupStart} – {order.pickupEnd}</span>
            </div>
          </div>

          {/* Info + Nouveau scan */}
          <div className="px-6 py-4 border-t border-gray-100 space-y-3">
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Remettez le panier au client. La confirmation du retrait sera effectuée par le client depuis son application.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1e2a78] to-[#4f6df5] text-white font-medium hover:opacity-90 transition-opacity"
            >
              Nouveau scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
