"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Clock,
  Package,
  MapPin,
  Loader2,
  CheckCircle,
  UtensilsCrossed,
  Milk,
  Leaf,
  Wine,
  Layers,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { validerDonClient } from "@/app/(asso)/asso/paniers-dons/_actions";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  bassari: { label: "Bassari", Icon: UtensilsCrossed },
  halavi: { label: "Halavi", Icon: Milk },
  parve: { label: "Parvé", Icon: Leaf },
  shabbat: { label: "Shabbat", Icon: Wine },
  mix: { label: "Mix", Icon: Layers },
};

function formatTime(time: string): string {
  const parts = time.split(":");
  return `${parts[0]}h${parts[1]}`;
}

interface ClientDonationCardProps {
  order: {
    id: string;
    quantity: number;
    total_amount: number;
    pickup_start: string;
    pickup_end: string;
    donation_expires_at: string | null;
    basket: {
      type: string;
      description: string | null;
    } | null;
    commerce: {
      name: string;
      city: string;
      address: string | null;
    } | null;
  };
}

export function ClientDonationCard({ order }: ClientDonationCardProps) {
  const t = TYPE_ICONS[order.basket?.type ?? ""] ?? {
    label: "Panier",
    Icon: ShoppingCart,
  };
  const c = order.commerce;
  const initial = c?.name?.charAt(0)?.toUpperCase() ?? "K";

  const [isPending, startTransition] = useTransition();
  const [validated, setValidated] = useState(false);
  const router = useRouter();

  // Temps restant avant expiration
  const expiresAt = order.donation_expires_at
    ? new Date(order.donation_expires_at)
    : null;
  const now = new Date();
  const minutesLeft = expiresAt
    ? Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 60000))
    : null;

  function handleValidate() {
    startTransition(async () => {
      const result = await validerDonClient(order.id);
      if (result.success) {
        setValidated(true);
        toast.success("Don validé ! Le paiement a été capturé.");
        setTimeout(() => router.refresh(), 1500);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (validated) {
    return (
      <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <p className="font-semibold text-green-800 text-sm">
            Don validé avec succès !
          </p>
          <p className="text-xs text-green-600 mt-1">
            Rendez-vous dans &quot;Mes réservations&quot; pour le code de
            retrait
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
              {initial}
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">
                {c?.name}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <MapPin className="h-3 w-3" />
                {c?.city}
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold shrink-0 inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> Don client
          </span>
        </div>

        {/* Basket info */}
        <div className="bg-amber-50/50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Type</span>
            <span className="font-medium text-gray-900 inline-flex items-center gap-1.5">
              <t.Icon className="h-4 w-4 text-amber-600" /> {t.label}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-500">
              <Clock className="h-3.5 w-3.5" /> Heure retrait
            </span>
            <span className="font-medium text-gray-900">
              {formatTime(order.pickup_start)} –{" "}
              {formatTime(order.pickup_end)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-500">
              <Package className="h-3.5 w-3.5" /> Quantité
            </span>
            <span className="font-medium text-gray-900">
              {order.quantity} panier{order.quantity > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Expiration warning */}
        {minutesLeft !== null && minutesLeft <= 120 && (
          <div className="mt-3 px-3 py-2 bg-red-50 rounded-lg text-xs text-red-600 font-medium">
            Expire dans{" "}
            {minutesLeft >= 60
              ? `${Math.floor(minutesLeft / 60)}h${String(minutesLeft % 60).padStart(2, "0")}`
              : `${minutesLeft} min`}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <button
          type="button"
          disabled={isPending}
          onClick={handleValidate}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validation en cours...
            </>
          ) : (
            <>
              <Heart className="h-4 w-4" />
              Récupérer ce don
            </>
          )}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Un client a offert ce panier. En validant, le paiement sera capturé.
        </p>
      </div>
    </div>
  );
}
