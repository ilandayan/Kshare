import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardCharts } from "@/components/shop/dashboard-charts";
import { TrendingUp, ShoppingBag, Heart, Euro } from "lucide-react";

/* ── Period helpers ────────────────────────────────────────────── */
function getPeriodStart(period: string): Date {
  const now = new Date();
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === "3months") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d;
  }
  // week: Monday of current week
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const TYPE_COLORS: Record<string, string> = {
  bassari: "#3744C8",
  halavi:  "#10b981",
  parve:   "#f59e0b",
  shabbat: "#8b5cf6",
  mix:     "#ec4899",
};
const TYPE_EMOJIS: Record<string, string> = {
  bassari: "🥩", halavi: "🧀", parve: "🌿", shabbat: "🍷", mix: "➕",
};

/* ── Page ──────────────────────────────────────────────────────── */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = rawPeriod ?? "week";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, name, commission_rate")
    .eq("profile_id", user.id)
    .single();
  if (!commerce) redirect("/inscription-commercant");

  const periodStart = getPeriodStart(period);

  // Fetch paid orders in period
  const { data: orders } = await supabase
    .from("orders")
    .select("id, total_amount, quantity, created_at, is_donation")
    .eq("commerce_id", commerce.id)
    .in("status", ["paid", "ready_for_pickup", "picked_up"])
    .gte("created_at", periodStart.toISOString());

  // Fetch baskets in period for type breakdown + bar chart
  const { data: basketsRaw } = await supabase
    .from("baskets")
    .select("id, type, quantity_sold, is_donation, sold_price, created_at")
    .eq("commerce_id", commerce.id)
    .gte("created_at", periodStart.toISOString());

  const allOrders  = orders ?? [];
  const allBaskets = basketsRaw ?? [];

  const commissionRate = (commerce.commission_rate ?? 15) / 100;
  const caGenere   = allOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const commission = caGenere * commissionRate;
  const caNet      = caGenere - commission;
  const paniers    = allOrders.reduce((s, o) => s + (o.quantity ?? 1), 0);
  const donCommerce = allBaskets.filter((b) => b.is_donation).length;
  const donClients  = allOrders.filter((o) => o.is_donation).length;
  const avgPrice    = paniers > 0 ? caGenere / paniers : 0;

  // Bar chart — sales by day of week (last 7 days)
  const salesByDay: Record<number, number> = {};
  for (let i = 0; i < 7; i++) salesByDay[i] = 0;
  allOrders.forEach((o) => {
    const d = new Date(o.created_at);
    let dow = d.getDay(); // 0=sun
    dow = dow === 0 ? 6 : dow - 1; // convert to Mon=0
    salesByDay[dow] = (salesByDay[dow] ?? 0) + (o.quantity ?? 1);
  });
  const barData = DAYS_FR.map((day, i) => ({ day, ventes: salesByDay[i] ?? 0 }));

  // Pie chart — basket type distribution
  const typeCounts: Record<string, number> = {};
  allOrders.forEach((o) => {
    // approximate: each order contributes quantity to a type — we'd need basket type join
    // For now use a simplified count per order
  });
  allBaskets.forEach((b) => {
    typeCounts[b.type] = (typeCounts[b.type] ?? 0) + (b.quantity_sold ?? 1);
  });
  const totalSold = Object.values(typeCounts).reduce((s, v) => s + v, 0);
  const pieData = Object.entries(typeCounts)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: totalSold > 0 ? Math.round((value / totalSold) * 100) : 0,
      color: TYPE_COLORS[type] ?? "#9ca3af",
    }));

  /* ── KPI cards config ───────────────────────────────────────── */
  const kpis = [
    {
      label: "CA généré",
      value: `${caGenere.toFixed(2)}€`,
      sub: `${paniers} paniers vendus`,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      icon: Euro,
    },
    {
      label: "CA net",
      value: `${caNet.toFixed(2)}€`,
      sub: `Après ${commerce.commission_rate ?? 15}% commission`,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      icon: TrendingUp,
    },
    {
      label: "Paniers vendus",
      value: paniers.toString(),
      sub: `Prix moyen ${avgPrice.toFixed(2)}€`,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      icon: ShoppingBag,
    },
    {
      label: "Paniers dons",
      value: (donCommerce + donClients).toString(),
      sub: `${donCommerce} commerçant · ${donClients} clients`,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      icon: Heart,
    },
  ];

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 font-medium">{k.label}</p>
              <div className={`w-10 h-10 ${k.iconBg} rounded-xl flex items-center justify-center`}>
                <k.icon className={`h-5 w-5 ${k.iconColor}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{k.value}</div>
            <p className="text-xs text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts
        period={period}
        barData={barData}
        pieData={pieData}
        avgPrice={avgPrice}
        donCommerce={donCommerce}
        donClients={donClients}
      />
    </div>
  );
}
