import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import { ShopOrdersClient } from "@/components/shop/shop-orders-client";

function formatOrderNumber(id: string, createdAt: string): string {
  const year = new Date(createdAt).getFullYear();
  const short = id.replace(/-/g, "").slice(-4).toUpperCase();
  return `CMD-${year}-${short}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!commerce) redirect("/connexion");

  const [{ data: raw }, { data: ratingsRaw }] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        id, status, quantity, total_amount, created_at, is_donation,
        pickup_date, pickup_start, pickup_end,
        baskets!inner(sold_price, type, day, pickup_start, pickup_end)
      `)
      .eq("commerce_id", commerce.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ratings")
      .select("order_id, score")
      .eq("commerce_id", commerce.id),
  ]);

  const ratingsMap = new Map<string, number>();
  for (const r of ratingsRaw ?? []) {
    ratingsMap.set(r.order_id, r.score);
  }

  // Today's date in YYYY-MM-DD format (local timezone)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const orders = (raw ?? []).map((o) => {
    const basket = o.baskets as { sold_price: number; type: string; day: string; pickup_start: string; pickup_end: string } | null;
    const pricePerBasket = basket?.sold_price ?? 0;
    const total  = o.total_amount ?? 0;

    return {
      id: o.id,
      orderNumber: formatOrderNumber(o.id, o.created_at),
      status: o.status,
      date: formatDate(o.created_at),
      quantity: o.quantity ?? 1,
      pricePerBasket,
      total,
      isDonation: o.is_donation ?? false,
      basketType: basket?.type ?? "",
      basketDay: basket?.day === "today" ? "Aujourd'hui" : "Demain",
      pickupTime: `${(o.pickup_start ?? basket?.pickup_start)?.slice(0, 5) ?? ""} – ${(o.pickup_end ?? basket?.pickup_end)?.slice(0, 5) ?? ""}`,
      pickupDate: o.pickup_date ?? "",
      isToday: o.pickup_date === todayStr,
      rating: ratingsMap.get(o.id) ?? null,
    };
  });

  // KPIs
  const totalCommandes  = orders.length;
  const revenuTotal     = orders.reduce((s, o) => s + (o.isDonation ? 0 : o.total), 0);
  const paniersVendus   = orders.reduce((s, o) => s + o.quantity, 0);
  const dons            = orders.filter((o) => o.isDonation).length;

  const kpis = [
    { label: "Total Commandes", value: totalCommandes.toString(),       borderColor: "border-l-blue-500",   icon: "ShoppingCart" },
    { label: "Revenu Total",    value: `${revenuTotal.toFixed(2)}€`,    borderColor: "border-l-green-500",  icon: "Wallet" },
    { label: "Paniers Vendus",  value: paniersVendus.toString(),         borderColor: "border-l-orange-500", icon: "ShoppingBag" },
    { label: "Dons (Mitzvot)",  value: dons.toString(),                  borderColor: "border-l-purple-500", icon: "Handshake" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Commandes</h1>
        <p className="text-sm text-gray-400 mt-0.5">Toutes les commandes de votre commerce</p>
      </div>
      <ShopOrdersClient orders={orders} kpis={kpis} todayStr={todayStr} />
    </div>
  );
}
