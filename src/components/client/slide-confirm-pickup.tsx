"use client";

import { useState, useRef, useCallback } from "react";
import { CheckCircle2, Loader2, ChevronRight } from "lucide-react";
import { PICKUP_CONFIRMATION_TEXT } from "@/lib/constants";
import { confirmPickup } from "@/app/(client)/client/commandes/[id]/_actions";

interface SlideConfirmPickupProps {
  orderId: string;
  onConfirmed?: () => void;
}

/**
 * Slide-to-confirm pickup component.
 * User must slide the button to the right to confirm order pickup.
 */
export function SlideConfirmPickup({ orderId, onConfirmed }: SlideConfirmPickupProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slideX, setSlideX] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);

  const THUMB_WIDTH = 56;
  const THRESHOLD = 0.75; // Must slide 75% to confirm

  const getMaxSlide = useCallback(() => {
    if (!trackRef.current) return 200;
    return trackRef.current.offsetWidth - THUMB_WIDTH;
  }, []);

  const handleStart = (clientX: number) => {
    dragging.current = true;
    startX.current = clientX - slideX;
  };

  const handleMove = (clientX: number) => {
    if (!dragging.current) return;
    const maxSlide = getMaxSlide();
    const newX = Math.max(0, Math.min(clientX - startX.current, maxSlide));
    setSlideX(newX);
  };

  const handleEnd = async () => {
    if (!dragging.current) return;
    dragging.current = false;

    const maxSlide = getMaxSlide();
    if (slideX >= maxSlide * THRESHOLD) {
      // Snap to end and confirm
      setSlideX(maxSlide);
      setLoading(true);
      setError(null);

      const result = await confirmPickup(orderId);
      if (result.success) {
        setConfirmed(true);
        onConfirmed?.();
      } else {
        setError(result.error ?? "Erreur");
        setSlideX(0);
      }
      setLoading(false);
    } else {
      // Snap back
      setSlideX(0);
    }
  };

  if (confirmed) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium">
        <CheckCircle2 className="h-5 w-5" />
        Retrait confirmé
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 text-center">{PICKUP_CONFIRMATION_TEXT}</p>

      {/* Slide track */}
      <div
        ref={trackRef}
        className="relative h-14 bg-gray-100 rounded-full overflow-hidden select-none touch-none"
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        {/* Background label */}
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 font-medium pointer-events-none">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Glissez pour confirmer"
          )}
        </div>

        {/* Green fill */}
        <div
          className="absolute left-0 top-0 h-full bg-green-100 rounded-full transition-none"
          style={{ width: slideX + THUMB_WIDTH / 2 }}
        />

        {/* Thumb */}
        <div
          className="absolute top-1 left-1 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing transition-none border border-gray-200"
          style={{ transform: `translateX(${slideX}px)` }}
          onMouseDown={(e) => handleStart(e.clientX)}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        >
          <ChevronRight className="h-5 w-5 text-green-600" />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
