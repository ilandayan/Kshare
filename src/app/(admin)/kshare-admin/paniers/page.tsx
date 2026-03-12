import { createClient } from "@/lib/supabase/server";
import { AdminPaniersClient, type BasketRow, type OrderStats } from "@/components/admin/admin-paniers-client";

export default async function AdminPaniersPage() {
  const supabase = await createClient();

  // 1. Fetch baskets
  const { data: basketsRaw } = await supabase
    .from("baskets")
    .select("id, type, day, pickup_start, pickup_end, original_price, sold_price, quantity_total, quantity_sold, is_donation, status, commerces(name)")
    .neq("status", "disabled")
    .order("created_at", { ascending: false });

  // 2. Fetch real orders (paid / ready_for_pickup / picked_up = CA réel)
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const { data: ordersRaw } = await supabase
    .from("orders")
    .select("total_amount, quantity, is_donation, status, pickup_date")
    .in("status", ["paid", "ready_for_pickup", "picked_up"]);

  const orders = ordersRaw ?? [];

  function computeStats(filtered: typeof orders): OrderStats {
    const ca = filtered
      .filter((o) => !o.is_donation)
      .reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    const soldCount = filtered.reduce((s, o) => s + (o.quantity ?? 1), 0);
    return { ca, soldCount };
  }

  const todayOrders    = orders.filter((o) => o.pickup_date === today);
  const tomorrowOrders = orders.filter((o) => o.pickup_date === tomorrow);

  const orderStats: Record<string, OrderStats> = {
    today:    computeStats(todayOrders),
    tomorrow: computeStats(tomorrowOrders),
    all:      computeStats(orders),
  };

  // 3. Map baskets
  const allBaskets = basketsRaw ?? [];

  function toRow(b: typeof allBaskets[number]): BasketRow {
    const commerce = b.commerces as { name: string } | null;
    return {
      id:            b.id,
      commerceName:  commerce?.name ?? "—",
      type:          b.type,
      day:           b.day,
      pickupTime:    `${(b.pickup_start as string).slice(0, 5)}–${(b.pickup_end as string).slice(0, 5)}`,
      price:         b.sold_price ?? 0,
      originalPrice: b.original_price ?? 0,
      quantityRemaining: (b.quantity_total ?? 0) - (b.quantity_sold ?? 0),
      quantitySold:  b.quantity_sold ?? 0,
      isDonation:    b.is_donation ?? false,
      status:        b.status as BasketRow["status"],
    };
  }

  const baskets = allBaskets.map(toRow);
  const commerceNames = [...new Set(baskets.map((b) => b.commerceName).filter(Boolean).filter((n) => n !== "—"))];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Paniers</h1>
        <p className="text-sm text-gray-400 mt-0.5">Vue d&apos;ensemble et supervision des paniers de la plateforme</p>
      </div>
      <AdminPaniersClient
        baskets={baskets}
        commerceNames={commerceNames}
        orderStats={orderStats}
      />
    </div>
  );
}
