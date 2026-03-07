import { createClient }           from "@/lib/supabase/server";
import { AdminPaniersJourClient } from "@/components/admin/admin-paniers-jour-client";

export default async function AdminPaniersJourPage() {
  const supabase = await createClient();

  const { data: basketsRaw } = await supabase
    .from("baskets")
    .select("id, type, pickup_start, pickup_end, sold_price, quantity_total, quantity_sold, is_donation, status, day, commerces(name)")
    .in("day", ["today", "tomorrow"])
    .neq("status", "disabled")
    .order("created_at", { ascending: false });

  const allBaskets = basketsRaw ?? [];

  type BasketRow = {
    id: string; commerceName: string; type: string; pickupTime: string;
    price: number; quantity: number; isDonation: boolean;
    status: "published" | "draft" | "sold_out";
  };

  function toRow(b: typeof allBaskets[number]): BasketRow {
    const commerce = b.commerces as { name: string } | null;
    return {
      id:           b.id,
      commerceName: commerce?.name ?? "—",
      type:         b.type,
      pickupTime:   `${b.pickup_start}–${b.pickup_end}`,
      price:        b.sold_price ?? 0,
      quantity:     (b.quantity_total ?? 0) - (b.quantity_sold ?? 0),
      isDonation:   b.is_donation ?? false,
      status:       b.status as "published" | "draft" | "sold_out",
    };
  }

  const today    = allBaskets.filter((b) => b.day === "today").map(toRow);
  const tomorrow = allBaskets.filter((b) => b.day === "tomorrow").map(toRow);

  const todayCA      = today.filter((b) => !b.isDonation).reduce((s, b) => s + b.price * b.quantity, 0);
  const todayDons    = today.filter((b) => b.isDonation).length;
  const commerces    = [...new Set(allBaskets.map((b) => (b.commerces as { name: string } | null)?.name ?? "").filter(Boolean))];
  const activeCommerceCount = new Set(today.map((b) => b.commerceName)).size;

  const kpis = [
    { label: "Paniers aujourd'hui", value: today.length.toString(),        color: "text-[#3744C8]",  icon: "🛍️" },
    { label: "CA du jour",          value: `${todayCA.toFixed(0)}€`,       color: "text-green-600",  icon: "💰" },
    { label: "Commerces actifs",    value: activeCommerceCount.toString(),  color: "text-purple-600", icon: "🏪" },
    { label: "Paniers dons",        value: todayDons.toString(),            color: "text-amber-600",  icon: "🤝" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Paniers de la journée</h1>
        <p className="text-sm text-gray-400 mt-0.5">Vue en temps réel des paniers publiés</p>
      </div>
      <AdminPaniersJourClient
        todayBaskets={today}
        tomorrowBaskets={tomorrow}
        commerceNames={commerces}
        kpis={kpis}
      />
    </div>
  );
}
