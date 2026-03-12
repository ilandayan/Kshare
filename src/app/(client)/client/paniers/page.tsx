import { createClient } from "@/lib/supabase/server";
import { BasketFilters } from "@/components/client/basket-filters";
import { BasketCard } from "@/components/client/basket-card";
import { ShoppingBag } from "lucide-react";
import type { Database } from "@/types/database.types";

type BasketType = Database["public"]["Enums"]["basket_type"];
type BasketDay = Database["public"]["Enums"]["basket_day"];

const VALID_TYPES: BasketType[] = ["bassari", "halavi", "parve", "shabbat", "mix"];
const VALID_DAYS: BasketDay[] = ["today", "tomorrow"];

interface PageProps {
  searchParams: Promise<{
    type?: string;
    city?: string;
    day?: string;
    q?: string;
  }>;
}

export default async function ClientPaniersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { type, city, day, q } = params;

  const supabase = await createClient();

  // Fetch published baskets with commerce info
  let query = supabase
    .from("baskets")
    .select(
      "id, type, sold_price, original_price, description, day, pickup_start, pickup_end, quantity_total, quantity_sold, quantity_reserved, is_donation, commerces!inner(name, city, status)"
    )
    .eq("status", "published")
    .eq("commerces.status", "validated");

  if (type && VALID_TYPES.includes(type as BasketType)) {
    query = query.eq("type", type as BasketType);
  }
  if (day && VALID_DAYS.includes(day as BasketDay)) {
    query = query.eq("day", day as BasketDay);
  }

  const { data: baskets } = await query.order("created_at", { ascending: false });

  // Post-fetch filtering (city and search) since we need to filter on joined table
  let filteredBaskets = (baskets ?? [])
    .map((b) => {
      const commerce = b.commerces as unknown as { name: string; city: string; status: string };
      return {
        id: b.id,
        type: b.type,
        sold_price: b.sold_price,
        original_price: b.original_price,
        description: b.description,
        day: b.day,
        pickup_start: b.pickup_start,
        pickup_end: b.pickup_end,
        quantity_total: b.quantity_total,
        quantity_sold: b.quantity_sold,
        quantity_reserved: b.quantity_reserved,
        is_donation: b.is_donation,
        commerce_name: commerce.name,
        commerce_city: commerce.city,
      };
    })
    // Only show baskets with available quantity
    .filter((b) => b.quantity_total - b.quantity_sold - b.quantity_reserved > 0);

  if (city) {
    filteredBaskets = filteredBaskets.filter(
      (b) => b.commerce_city.toLowerCase() === city.toLowerCase()
    );
  }

  if (q) {
    const searchLower = q.toLowerCase();
    filteredBaskets = filteredBaskets.filter(
      (b) =>
        b.commerce_name.toLowerCase().includes(searchLower) ||
        b.commerce_city.toLowerCase().includes(searchLower) ||
        (b.description?.toLowerCase().includes(searchLower) ?? false)
    );
  }

  // Get unique cities for filter dropdown
  const allCities = [
    ...new Set(
      (baskets ?? []).map((b) => {
        const commerce = b.commerces as unknown as { name: string; city: string };
        return commerce.city;
      })
    ),
  ].sort();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paniers disponibles</h1>
        <p className="text-sm text-gray-500 mt-1">
          Decouvrez les paniers anti-gaspi casher pres de chez vous
        </p>
      </div>

      <BasketFilters cities={allCities} />

      {filteredBaskets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#e2e5f0]">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Aucun panier disponible</p>
          <p className="text-sm text-gray-400 mt-1">
            {q || type || city || day
              ? "Essayez de modifier vos filtres"
              : "Revenez bientot, de nouveaux paniers arrivent regulierement !"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBaskets.map((basket) => (
            <BasketCard key={basket.id} basket={basket} />
          ))}
        </div>
      )}

      <div className="text-center text-sm text-gray-400">
        {filteredBaskets.length} panier{filteredBaskets.length !== 1 ? "s" : ""} disponible{filteredBaskets.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
