"use client";

import { Clock, Store, MapPin, QrCode, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  paid:             { label: "Payee",              color: "bg-blue-100 text-blue-700",    icon: Clock },
  ready_for_pickup: { label: "Prete au retrait",   color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  picked_up:        { label: "Recuperee",           color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  no_show:          { label: "Non recuperee",       color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  refunded:         { label: "Remboursee",          color: "bg-gray-100 text-gray-600",    icon: XCircle },
  cancelled_admin:  { label: "Annulee",             color: "bg-red-100 text-red-700",      icon: XCircle },
};

const TYPE_EMOJIS: Record<string, string> = {
  bassari: "\ud83e\udd69",
  halavi: "\ud83e\uddc0",
  parve: "\ud83c\udf3f",
  shabbat: "\ud83c\udf77",
  mix: "\u2795",
};

const DAY_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  tomorrow: "Demain",
};

interface OrderCardProps {
  order: {
    id: string;
    status: string;
    total_amount: number;
    quantity: number;
    qr_code_token: string | null;
    created_at: string;
    pickup_start: string | null;
    pickup_end: string | null;
    pickup_date: string | null;
    basket_type: string;
    commerce_name: string;
    commerce_city: string;
  };
  isDonation?: boolean;
}

export function OrderCard({ order, isDonation }: OrderCardProps) {
  const [showCode, setShowCode] = useState(false);
  const statusConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.paid;
  const StatusIcon = statusConfig.icon;
  const emoji = TYPE_EMOJIS[order.basket_type] ?? "\ud83d\udce6";
  const isActive = ["paid", "ready_for_pickup"].includes(order.status);

  return (
    <div className={`bg-white rounded-2xl border ${isActive ? "border-emerald-200" : "border-[#e2e5f0]"} overflow-hidden`}>
      <div className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{emoji}</span>
            <div>
              <div className="font-semibold text-gray-900">{order.commerce_name}</div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {order.commerce_city}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDonation && (
              <div className="bg-pink-100 text-pink-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                Don
              </div>
            )}
            <div className={`${statusConfig.color} text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Quantite :</span>{" "}
            <span className="font-medium text-gray-900">{order.quantity}</span>
          </div>
          <div>
            <span className="text-gray-500">Total :</span>{" "}
            <span className="font-medium text-gray-900">{order.total_amount.toFixed(2)}&nbsp;&euro;</span>
          </div>
          {order.pickup_date && (
            <div>
              <span className="text-gray-500">Retrait :</span>{" "}
              <span className="font-medium text-gray-900">{DAY_LABELS[order.pickup_date] ?? order.pickup_date}</span>
            </div>
          )}
          {order.pickup_start && order.pickup_end && (
            <div>
              <span className="text-gray-500">Horaire :</span>{" "}
              <span className="font-medium text-gray-900">{order.pickup_start} - {order.pickup_end}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-400">
          Commande du {new Date(order.created_at).toLocaleDateString("fr-FR")}
        </div>

        {/* QR Code / Pickup code */}
        {isActive && order.qr_code_token && (
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowCode((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-sm rounded-xl transition-colors"
            >
              <QrCode className="h-4 w-4" />
              {showCode ? "Masquer le code" : "Afficher le code de retrait"}
            </button>
            {showCode && (
              <div className="mt-3 text-center">
                <div className="inline-block bg-gray-900 text-white px-8 py-4 rounded-2xl">
                  <div className="text-xs text-gray-400 mb-1">Code de retrait</div>
                  <div className="text-3xl font-mono font-bold tracking-widest">
                    {order.qr_code_token}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Presentez ce code au commercant lors du retrait
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
