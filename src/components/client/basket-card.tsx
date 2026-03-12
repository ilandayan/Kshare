"use client";

import Link from "next/link";
import { Clock, MapPin, Store, Tag } from "lucide-react";

const TYPE_CONFIG: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
  bassari:  { emoji: "\ud83e\udd69", label: "Bassari",  bg: "bg-red-50",    text: "text-red-700" },
  halavi:   { emoji: "\ud83e\uddc0", label: "Halavi",   bg: "bg-blue-50",   text: "text-blue-700" },
  parve:    { emoji: "\ud83c\udf3f", label: "Parve",    bg: "bg-green-50",  text: "text-green-700" },
  shabbat:  { emoji: "\ud83c\udf77", label: "Shabbat",  bg: "bg-purple-50", text: "text-purple-700" },
  mix:      { emoji: "\u2795",       label: "Mix",      bg: "bg-amber-50",  text: "text-amber-700" },
};

const DAY_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  tomorrow: "Demain",
};

interface BasketCardProps {
  basket: {
    id: string;
    type: string;
    sold_price: number;
    original_price: number;
    description: string | null;
    day: string;
    pickup_start: string;
    pickup_end: string;
    quantity_total: number;
    quantity_sold: number;
    quantity_reserved: number;
    commerce_name: string;
    commerce_city: string;
    is_donation: boolean;
  };
}

export function BasketCard({ basket }: BasketCardProps) {
  const typeConfig = TYPE_CONFIG[basket.type] ?? TYPE_CONFIG.mix;
  const available = basket.quantity_total - basket.quantity_sold - basket.quantity_reserved;
  const discount = Math.round((1 - basket.sold_price / basket.original_price) * 100);

  return (
    <Link
      href={`/client/paniers/${basket.id}`}
      className="bg-white rounded-2xl border border-[#e2e5f0] overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex flex-col"
    >
      {/* Header with type badge */}
      <div className={`${typeConfig.bg} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{typeConfig.emoji}</span>
          <span className={`text-sm font-semibold ${typeConfig.text}`}>{typeConfig.label}</span>
        </div>
        {!basket.is_donation && discount > 0 && (
          <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{discount}%
          </span>
        )}
        {basket.is_donation && (
          <span className="bg-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            Don
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-gray-600">
          <Store className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium truncate">{basket.commerce_name}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="text-sm truncate">{basket.commerce_city}</span>
        </div>

        {basket.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{basket.description}</p>
        )}

        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            {DAY_LABELS[basket.day] ?? basket.day} {basket.pickup_start}–{basket.pickup_end}
          </span>
        </div>

        {/* Price + availability */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-end justify-between">
          {basket.is_donation ? (
            <div className="text-pink-600 font-semibold text-sm">Gratuit (don)</div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">
                {basket.sold_price.toFixed(2)}&nbsp;&euro;
              </span>
              <span className="text-sm text-gray-400 line-through">
                {basket.original_price.toFixed(2)}&nbsp;&euro;
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-gray-400" />
            <span className={`text-sm font-medium ${available <= 2 ? "text-orange-600" : "text-gray-500"}`}>
              {available} dispo
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
