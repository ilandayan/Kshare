"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Clock, Package, Navigation, Minus, Plus, Loader2, CheckCircle,
  UtensilsCrossed, Milk, Leaf, Wine, Layers, ShoppingCart, Handshake,
  type LucideIcon,
} from "lucide-react";
import { reserverPanierDon } from "@/app/(asso)/asso/paniers-dons/[id]/_actions";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  bassari: { label: "Bassari", Icon: UtensilsCrossed },
  halavi:  { label: "Halavi",  Icon: Milk },
  parve:   { label: "Parvé",   Icon: Leaf },
  shabbat: { label: "Shabbat", Icon: Wine },
  mix:     { label: "Mix",     Icon: Layers },
};

interface DonBasketCardProps {
  basket: {
    id: string;
    type: string;
    pickup_start: string;
    pickup_end: string;
    quantity_total: number;
    quantity_sold: number;
    quantity_reserved: number;
    description: string | null;
    commerce: {
      name: string;
      city: string;
      hashgakha: string;
      address?: string;
    } | null;
  };
}

function formatTime(time: string): string {
  // "19:30:00" → "19h30" / "19:00:00" → "19h00"
  const parts = time.split(":");
  return `${parts[0]}h${parts[1]}`;
}

export function DonBasketCard({ basket }: DonBasketCardProps) {
  const t = TYPE_ICONS[basket.type] ?? { label: basket.type, Icon: ShoppingCart };
  const c = basket.commerce;
  const initial = c?.name?.charAt(0)?.toUpperCase() ?? "K";
  const remaining = basket.quantity_total - basket.quantity_sold - basket.quantity_reserved;

  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [reserved, setReserved] = useState(false);
  const router = useRouter();

  function handleReserver() {
    startTransition(async () => {
      const result = await reserverPanierDon(basket.id, quantity);
      if (result.success) {
        setReserved(true);
        toast.success(
          `${quantity} panier${quantity > 1 ? "s" : ""} réservé${quantity > 1 ? "s" : ""} avec succès !`
        );
        setTimeout(() => router.refresh(), 1500);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (reserved) {
    return (
      <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <p className="font-semibold text-green-800 text-sm">
            {quantity} panier{quantity > 1 ? "s" : ""} réservé{quantity > 1 ? "s" : ""} !
          </p>
          <p className="text-xs text-green-600 mt-1">
            Rendez-vous dans &quot;Mes réservations&quot; pour le suivi
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
              {initial}
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">{c?.name}</div>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <MapPin className="h-3 w-3" />
                {c?.city}
                {c?.hashgakha && (
                  <span className="ml-1 text-purple-600">· {c.hashgakha}</span>
                )}
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold shrink-0 inline-flex items-center gap-1">
            <Handshake className="h-3.5 w-3.5" /> Don
          </span>
        </div>

        {/* Basket info */}
        <div className="bg-[#f8f9fc] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Type</span>
            <span className="font-medium text-gray-900 inline-flex items-center gap-1.5">
              <t.Icon className="h-4 w-4 text-purple-600" /> {t.label}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-500">
              <Clock className="h-3.5 w-3.5" /> Heure retrait
            </span>
            <span className="font-medium text-gray-900">
              {formatTime(basket.pickup_start)} – {formatTime(basket.pickup_end)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-500">
              <Package className="h-3.5 w-3.5" /> Disponible
            </span>
            <span
              className={`font-medium ${remaining <= 2 ? "text-orange-500" : "text-green-600"}`}
            >
              {remaining} panier{remaining > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Description courte si disponible */}
        {basket.description && (
          <p className="text-xs text-gray-400 mt-3 line-clamp-2 leading-relaxed">
            {basket.description}
          </p>
        )}
      </div>

      {/* Quantity selector + CTA */}
      <div className="px-5 pb-5 space-y-3">
        {/* Quantity selector */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">Quantité à récupérer</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={quantity <= 1 || isPending}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg border border-[#e2e5f0] flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
            <button
              type="button"
              disabled={quantity >= remaining || isPending}
              onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
              className="w-8 h-8 rounded-lg border border-[#e2e5f0] flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isPending || remaining <= 0}
            onClick={handleReserver}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-semibold text-center transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Réservation...
              </>
            ) : (
              <>
                <Handshake className="h-4 w-4" />
                Nous le récupérons
              </>
            )}
          </button>
          {c?.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(c.address + " " + c.city)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-[#e2e5f0] text-gray-600 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors shrink-0 cursor-pointer"
            >
              <Navigation className="h-3.5 w-3.5" />
              Itinéraire
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
