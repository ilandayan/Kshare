import { createClient } from "@/lib/supabase/server";
import { AdminCharts }  from "@/components/admin/admin-charts";
import { Euro, TrendingUp, ShoppingBag, Package, BarChart3, Store, Heart, Gift } from "lucide-react";

function getPeriodStart(period: string): Date {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "3months") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const TYPE_EMOJIS: Record<string, string> = {
  bassari: "🥩", halavi: "🧀", parve: "🌿", shabbat: "🍷", mix: "➕",
};
const TYPE_LABELS_FR: Record<string, string> = {
  bassari: "Bassari", halavi: "Halavi", parve: "Parvé", shabbat: "Shabbat", mix: "Mix",
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = rawPeriod ?? "week";

  const supabase    = await createClient();
  const periodStart = getPeriodStart(period);

  const { data: orders } = await supabase
    .from("orders")
    .select("id, total_amount, quantity, created_at, is_donation")
    .in("status", ["paid", "ready_for_pickup", "picked_up"])
    .gte("created_at", periodStart.toISOString());

  const { data: baskets } = await supabase
    .from("baskets")
    .select("id, type, quantity_sold, is_donation, created_at")
    .gte("created_at", periodStart.toISOString());

  const { count: activeCommerces } = await supabase
    .from("commerces")
    .select("*", { count: "exact", head: true })
    .eq("status", "validated");

  const allOrders  = orders  ?? [];
  const allBaskets = baskets ?? [];

  const caGenere     = allOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const commission   = caGenere * 0.15;
  const caNet        = caGenere - commission;
  const paniersVendus = allOrders.reduce((s, o) => s + (o.quantity ?? 1), 0);
  const avgPrice     = paniersVendus > 0 ? caGenere / paniersVendus : 0;
  const donCommerce  = allBaskets.filter((b) => b.is_donation).length;
  const donClients   = allOrders.filter((o) => o.is_donation).length;

  const salesByDay: Record<number, { ca: number; ventes: number }> = {};
  for (let i = 0; i < 7; i++) salesByDay[i] = { ca: 0, ventes: 0 };
  allOrders.forEach((o) => {
    let dow = new Date(o.created_at).getDay();
    dow = dow === 0 ? 6 : dow - 1;
    salesByDay[dow].ca     += o.total_amount ?? 0;
    salesByDay[dow].ventes += o.quantity ?? 1;
  });
  const dayData = DAYS_FR.map((day, i) => ({
    day,
    ca:     Math.round(salesByDay[i]?.ca ?? 0),
    ventes: salesByDay[i]?.ventes ?? 0,
  }));

  const typeCounts: Record<string, number> = {};
  allBaskets.forEach((b) => {
    typeCounts[b.type] = (typeCounts[b.type] ?? 0) + (b.quantity_sold ?? 1);
  });
  const totalBasketCount = Object.values(typeCounts).reduce((s, v) => s + v, 0);
  const typeData = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({
      type:    TYPE_LABELS_FR[type] ?? type,
      count,
      percent: totalBasketCount > 0 ? Math.round((count / totalBasketCount) * 100) : 0,
      emoji:   TYPE_EMOJIS[type] ?? "🛒",
      color:   "#3744C8",
    }));

  const kpis = [
    { label: "CA généré",         value: `${caGenere.toFixed(2)}€`,   sub: undefined,      iconBg: "bg-green-100",  iconColor: "text-green-600",  icon: Euro },
    { label: "CA net",            value: `${caNet.toFixed(2)}€`,      sub: undefined,      iconBg: "bg-blue-100",   iconColor: "text-blue-600",   icon: TrendingUp },
    { label: "Commission Kshare", value: `${commission.toFixed(2)}€`, sub: "10% du CA",   iconBg: "bg-purple-100", iconColor: "text-purple-600", icon: BarChart3 },
    { label: "Paniers vendus",    value: paniersVendus.toString(),     sub: undefined,      iconBg: "bg-yellow-100", iconColor: "text-yellow-600", icon: Package },
    { label: "Prix moyen",        value: `${avgPrice.toFixed(2)}€`,   sub: undefined,      iconBg: "bg-indigo-100", iconColor: "text-indigo-600", icon: ShoppingBag },
    { label: "Commerces actifs",  value: (activeCommerces ?? 0).toString(), sub: undefined, iconBg: "bg-orange-100", iconColor: "text-orange-600", icon: Store },
    { label: "Dons commerçants",  value: donCommerce.toString(),       sub: undefined,      iconBg: "bg-pink-100",   iconColor: "text-pink-500",   icon: Heart },
    { label: "Dons clients",      value: donClients.toString(),        sub: undefined,      iconBg: "bg-rose-100",   iconColor: "text-rose-500",   icon: Gift },
  ];

  return (
    <div>
      {/* 8 KPI cards — 2 rows of 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-gray-400 font-medium">{k.label}</p>
              <div className={`w-9 h-9 ${k.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                <k.icon className={`h-4 w-4 ${k.iconColor}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            {k.sub && <p className="text-xs text-gray-400 mt-1">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Charts + type breakdown */}
      <AdminCharts period={period} dayData={dayData} typeData={typeData} />
    </div>
  );
}
