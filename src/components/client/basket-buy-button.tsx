"use client";

import { useState } from "react";
import { ShoppingCart, Minus, Plus, Loader2, Heart } from "lucide-react";
import { SERVICE_FEE_FIXED, SERVICE_FEE_PERCENT } from "@/lib/constants";

interface BasketBuyButtonProps {
  basketId: string;
  available: number;
  soldPrice: number;
  isDonation: boolean;
  commissionRate: number;
}

export function BasketBuyButton({
  basketId,
  available,
  soldPrice,
  isDonation,
  commissionRate,
}: BasketBuyButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [donationLoading, setDonationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prix réduit pour le don client = prix de vente - commission Kshare
  const donationPrice =
    Math.round((soldPrice - soldPrice * (commissionRate / 100)) * 100) / 100;

  // Frais de service plateforme : 1.5% du prix panier + 0.79€
  const serviceFee =
    Math.round((soldPrice * quantity * SERVICE_FEE_PERCENT + SERVICE_FEE_FIXED) * 100) / 100;

  async function handleBuy() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basketId, quantity }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la commande");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDonate() {
    setDonationLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basketId, quantity, isDonation: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la commande");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setDonationLoading(false);
    }
  }

  if (isDonation) {
    return (
      <p className="text-sm text-gray-500 italic">
        Ce panier est réservé aux associations partenaires.
      </p>
    );
  }

  if (available <= 0) {
    return (
      <div className="bg-gray-100 text-gray-500 text-center py-3 rounded-xl font-medium">
        Rupture de stock
      </div>
    );
  }

  const basketTotal = soldPrice * quantity;
  const totalWithFee = Math.round((basketTotal + serviceFee) * 100) / 100;
  const donationTotal =
    Math.round(donationPrice * quantity * 100) / 100;

  return (
    <div className="space-y-4">
      {/* Quantity selector */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Quantité</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-semibold text-gray-900">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => Math.min(available, q + 1))}
            disabled={quantity >= available}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Panier</span>
          <span>{basketTotal.toFixed(2)}&nbsp;&euro;</span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Frais de service plateforme</span>
          <span>{serviceFee.toFixed(2)}&nbsp;&euro;</span>
        </div>
        <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between text-lg font-bold text-gray-900">
          <span>Total</span>
          <span>{totalWithFee.toFixed(2)}&nbsp;&euro;</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">
          {error}
        </div>
      )}

      {/* Buy button */}
      <button
        onClick={handleBuy}
        disabled={loading || donationLoading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Redirection vers le paiement...
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" />
            Commander — {totalWithFee.toFixed(2)}&nbsp;&euro;
          </>
        )}
      </button>

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-gray-400">ou</span>
        </div>
      </div>

      {/* Donate button */}
      <div className="space-y-2">
        <button
          onClick={handleDonate}
          disabled={loading || donationLoading}
          className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {donationLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Redirection vers le paiement...
            </>
          ) : (
            <>
              <Heart className="h-5 w-5" />
              Offrir à une association — {donationTotal.toFixed(2)}&nbsp;&euro;
            </>
          )}
        </button>
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Prix réduit (sans commission Kshare). Vous ne serez débité que si une
          association récupère le panier.
        </p>
      </div>
    </div>
  );
}
