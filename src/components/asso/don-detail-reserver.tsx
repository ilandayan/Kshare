"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Loader2, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reserverPanierDon } from "@/app/(asso)/asso/paniers-dons/[id]/_actions";
import { toast } from "sonner";

interface DonDetailReserverProps {
  basketId: string;
  available: number;
}

export function DonDetailReserver({ basketId, available }: DonDetailReserverProps) {
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleReserver() {
    startTransition(async () => {
      const result = await reserverPanierDon(basketId, quantity);
      if (result.success) {
        toast.success(
          `${quantity} panier${quantity > 1 ? "s" : ""} réservé${quantity > 1 ? "s" : ""} avec succès !`
        );
        router.push("/asso/mes-reservations");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (available <= 0) {
    return (
      <Button className="w-full" size="lg" disabled>
        Panier non disponible
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quantity selector */}
      <div className="flex items-center justify-between p-4 bg-[#f8f9fc] rounded-xl">
        <span className="text-sm text-gray-600 font-medium">Quantité à récupérer</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={quantity <= 1 || isPending}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-9 h-9 rounded-lg border border-[#e2e5f0] flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-bold text-gray-900 text-lg">{quantity}</span>
          <button
            type="button"
            disabled={quantity >= available || isPending}
            onClick={() => setQuantity((q) => Math.min(available, q + 1))}
            className="w-9 h-9 rounded-lg border border-[#e2e5f0] flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CTA button */}
      <Button
        type="button"
        className="w-full cursor-pointer"
        size="lg"
        disabled={isPending}
        onClick={handleReserver}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Handshake className="mr-2 h-4 w-4" />
        )}
        {isPending
          ? "Réservation en cours..."
          : `Nous récupérons ${quantity} panier${quantity > 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
