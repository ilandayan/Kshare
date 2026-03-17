import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardCharts } from "@/components/shop/dashboard-charts";
import { TrendingUp, ShoppingBag, Heart, Euro, Star } from "lucide-react";

/* ── Period helpers ────────────────────────────────────────────── */
function getPeriodStart(period: string, commerceCreatedAt?: string): Date {
  const now = new Date();

  switch (period) {
    case "today": {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    case "month": {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case "3months": {
      return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    }
    case "6months": {
      return new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }
    case "12months": {
      return new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }
    case "year": {
      return new Date(now.getFullYear(), 0, 1);
    }
    case "total": {
      return commerceCreatedAt ? new Date(commerceCreatedAt) : new Date(2020, 0, 1);
    }
    default: {
      // week: Monday of current week
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const HOURS = Array.from({ length: 15 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}h`); // 08h–22h

const TYPE_COLORS: Record<string, string> = {
  bassari: "#3744C8",
  halavi:  "#10b981",
  parve:   "#f59e0b",
  shabbat: "#8b5cf6",
  mix:     "#ec4899",
};
const TYPE_ICON_NAMES: Record<string, string> = {
  bassari: "UtensilsCrossed", halavi: "Milk", parve: "Leaf", shabbat: "Wine", mix: "Layers",
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
  if (!user) redirect("/");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, name, commission_rate, created_at, average_rating, total_ratings")
    .eq("profile_id", user.id)
    .single();
  if (!commerce) redirect("/inscription-commercant");

  const periodStart = getPeriodStart(period, commerce.created_at);

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

  const commissionRate = (commerce.commission_rate ?? 18) / 100;
  const caGenere   = allOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const commission = caGenere * commissionRate;
  const caNet      = caGenere - commission;
  const paniers    = allOrders.reduce((s, o) => s + (o.quantity ?? 1), 0);
  const donCommerce = allBaskets.filter((b) => b.is_donation).length;
  const donClients  = allOrders.filter((o) => o.is_donation).length;
  const avgPrice    = paniers > 0 ? caGenere / paniers : 0;

  // Bar chart — dynamic grouping based on period
  let barData: { day: string; ventes: number }[];
  let barTitle: string;

  if (period === "today") {
    // Group by hour (08h–22h)
    barTitle = "Ventes par heure";
    const salesByHour: Record<number, number> = {};
    for (let i = 8; i <= 22; i++) salesByHour[i] = 0;
    allOrders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      if (h >= 8 && h <= 22) salesByHour[h] = (salesByHour[h] ?? 0) + (o.quantity ?? 1);
    });
    barData = HOURS.map((label, i) => ({ day: label, ventes: salesByHour[i + 8] ?? 0 }));
  } else if (period === "week") {
    // Group by day of week (Mon–Sun)
    barTitle = "Ventes de la semaine";
    const salesByDay: Record<number, number> = {};
    for (let i = 0; i < 7; i++) salesByDay[i] = 0;
    allOrders.forEach((o) => {
      const d = new Date(o.created_at);
      let dow = d.getDay();
      dow = dow === 0 ? 6 : dow - 1;
      salesByDay[dow] = (salesByDay[dow] ?? 0) + (o.quantity ?? 1);
    });
    barData = DAYS_FR.map((day, i) => ({ day, ventes: salesByDay[i] ?? 0 }));
  } else if (period === "month") {
    // Group by day of month (1–31)
    barTitle = "Ventes du mois";
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const salesByDate: Record<number, number> = {};
    for (let i = 1; i <= daysInMonth; i++) salesByDate[i] = 0;
    allOrders.forEach((o) => {
      const day = new Date(o.created_at).getDate();
      salesByDate[day] = (salesByDate[day] ?? 0) + (o.quantity ?? 1);
    });
    barData = Array.from({ length: daysInMonth }, (_, i) => ({ day: (i + 1).toString(), ventes: salesByDate[i + 1] ?? 0 }));
  } else if (["3months", "6months", "12months", "year"].includes(period)) {
    // Group by month
    const periodLabels: Record<string, string> = {
      "3months": "Ventes des 3 derniers mois",
      "6months": "Ventes des 6 derniers mois",
      "12months": "Ventes des 12 derniers mois",
      year: "Ventes de l'année",
    };
    barTitle = periodLabels[period] ?? "Ventes";
    const now = new Date();
    const startMonth = periodStart.getMonth();
    const startYear = periodStart.getFullYear();
    const endMonth = now.getMonth();
    const endYear = now.getFullYear();
    const months: { key: string; label: string; month: number; year: number }[] = [];
    let y = startYear, m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      months.push({ key: `${y}-${m}`, label: MONTHS_FR[m], month: m, year: y });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    const salesByMonth: Record<string, number> = {};
    months.forEach((mo) => { salesByMonth[mo.key] = 0; });
    allOrders.forEach((o) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      salesByMonth[key] = (salesByMonth[key] ?? 0) + (o.quantity ?? 1);
    });
    barData = months.map((mo) => ({ day: mo.label, ventes: salesByMonth[mo.key] ?? 0 }));
  } else {
    // "total" — group by month (all time)
    barTitle = "Ventes totales";
    const now = new Date();
    const startMonth = periodStart.getMonth();
    const startYear = periodStart.getFullYear();
    const endMonth = now.getMonth();
    const endYear = now.getFullYear();
    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

    if (totalMonths <= 24) {
      // Show by month
      const months: { key: string; label: string }[] = [];
      let y = startYear, m = startMonth;
      while (y < endYear || (y === endYear && m <= endMonth)) {
        months.push({ key: `${y}-${m}`, label: `${MONTHS_FR[m]} ${y.toString().slice(2)}` });
        m++;
        if (m > 11) { m = 0; y++; }
      }
      const salesByMonth: Record<string, number> = {};
      months.forEach((mo) => { salesByMonth[mo.key] = 0; });
      allOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        salesByMonth[key] = (salesByMonth[key] ?? 0) + (o.quantity ?? 1);
      });
      barData = months.map((mo) => ({ day: mo.label, ventes: salesByMonth[mo.key] ?? 0 }));
    } else {
      // Show by year
      const years: number[] = [];
      for (let y = startYear; y <= endYear; y++) years.push(y);
      const salesByYear: Record<number, number> = {};
      years.forEach((y) => { salesByYear[y] = 0; });
      allOrders.forEach((o) => {
        const y = new Date(o.created_at).getFullYear();
        salesByYear[y] = (salesByYear[y] ?? 0) + (o.quantity ?? 1);
      });
      barData = years.map((y) => ({ day: y.toString(), ventes: salesByYear[y] ?? 0 }));
    }
  }

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
      sub: "Après commission",
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
    {
      label: "Note moyenne",
      value: (commerce.average_rating ?? 0) > 0 ? `${Number(commerce.average_rating).toFixed(1)}/5` : "—",
      sub: (commerce.total_ratings ?? 0) > 0 ? `${commerce.total_ratings} avis clients` : "Aucun avis pour le moment",
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-500",
      icon: Star,
    },
  ];

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
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
        barTitle={barTitle}
        pieData={pieData}
        avgPrice={avgPrice}
        donCommerce={donCommerce}
        donClients={donClients}
      />
    </div>
  );
}
