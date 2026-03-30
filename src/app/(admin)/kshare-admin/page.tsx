import { createClient } from "@/lib/supabase/server";
import dynamic from "next/dynamic";

const AdminCharts = dynamic(
  () => import("@/components/admin/admin-charts").then((m) => m.AdminCharts)
);
import { Euro, TrendingUp, ShoppingBag, Package, BarChart3, Store, Heart, Gift, CreditCard, Banknote, Receipt, Star } from "lucide-react";

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "3months":
      return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case "6months":
      return new Date(now.getFullYear(), now.getMonth() - 5, 1);
    case "12months":
      return new Date(now.getFullYear(), now.getMonth() - 11, 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "total":
      return new Date(2020, 0, 1);
    default: {
      // Année spécifique : "y2026", "y2027", etc.
      if (period.startsWith("y")) {
        const year = parseInt(period.slice(1), 10);
        if (!isNaN(year)) return new Date(year, 0, 1);
      }
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
}

function getPeriodEnd(period: string): Date | null {
  if (period.startsWith("y")) {
    const year = parseInt(period.slice(1), 10);
    if (!isNaN(year)) return new Date(year + 1, 0, 1);
  }
  return null;
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const HOURS = Array.from({ length: 15 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}h`);
const TYPE_ICON_NAMES: Record<string, string> = {
  bassari: "UtensilsCrossed", halavi: "Milk", parve: "Leaf", shabbat: "Wine", mix: "Layers",
};
const TYPE_LABELS_FR: Record<string, string> = {
  bassari: "Bassari", halavi: "Halavi", parve: "Parvé", shabbat: "Shabbat", mix: "Mix",
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; commerce?: string }>;
}) {
  const { period: rawPeriod, commerce: rawCommerce } = await searchParams;
  const period = rawPeriod ?? "week";
  const commerce = rawCommerce ?? "";

  const supabase    = await createClient();
  const periodStart = getPeriodStart(period);
  const periodEnd   = getPeriodEnd(period);

  // Fetch validated commerces list for filter
  const { data: commercesList } = await supabase
    .from("commerces")
    .select("id, name, city, commission_rate, average_rating, total_ratings")
    .eq("status", "validated")
    .order("name");

  // Orders — filtered by commerce and period
  let ordersQuery = supabase
    .from("orders")
    .select("id, total_amount, quantity, created_at, is_donation, commerce_id, service_fee_amount, status")
    .in("status", ["paid", "ready_for_pickup", "picked_up"])
    .gte("created_at", periodStart.toISOString());
  if (periodEnd) ordersQuery = ordersQuery.lt("created_at", periodEnd.toISOString());
  if (commerce) ordersQuery = ordersQuery.eq("commerce_id", commerce);
  const { data: orders } = await ordersQuery;

  // Baskets — filtered by commerce and period
  let basketsQuery = supabase
    .from("baskets")
    .select("id, type, quantity_sold, is_donation, created_at")
    .gte("created_at", periodStart.toISOString());
  if (periodEnd) basketsQuery = basketsQuery.lt("created_at", periodEnd.toISOString());
  if (commerce) basketsQuery = basketsQuery.eq("commerce_id", commerce);
  const { data: baskets } = await basketsQuery;

  const { count: activeCommerces } = await supabase
    .from("commerces")
    .select("*", { count: "exact", head: true })
    .eq("status", "validated");

  // Favorites — all time (not period-filtered, favorites are cumulative)
  const { data: favorites } = await supabase
    .from("favorites")
    .select("id, commerce_id, created_at");

  const allFavorites = favorites ?? [];
  const totalFavorites = allFavorites.length;

  // Favorites count per commerce
  const favoritesPerCommerce = new Map<string, number>();
  for (const fav of allFavorites) {
    favoritesPerCommerce.set(fav.commerce_id, (favoritesPerCommerce.get(fav.commerce_id) ?? 0) + 1);
  }

  const allOrders  = orders  ?? [];
  const allBaskets = baskets ?? [];

  // Commission rate: use commerce-specific rate when filtered, otherwise starter default (18%)
  const selectedCommerce = commerce ? commercesList?.find((c) => c.id === commerce) : null;
  const commissionRate = selectedCommerce ? (selectedCommerce.commission_rate ?? 18) / 100 : 0.18;

  const nonDonationOrders = allOrders.filter((o) => !o.is_donation);
  const nbTransactions = nonDonationOrders.length;
  const caGenere      = allOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const commission    = caGenere * commissionRate;
  const serviceFees   = allOrders.reduce((s, o) => s + (o.service_fee_amount ?? 0), 0);
  const caNet         = caGenere - commission;
  const paniersVendus = allOrders.reduce((s, o) => s + (o.quantity ?? 1), 0);
  const avgPrice      = paniersVendus > 0 ? caGenere / paniersVendus : 0;
  const donCommerce   = allBaskets.filter((b) => b.is_donation).length;
  const donClients    = allOrders.filter((o) => o.is_donation).length;
  const donsDistribues = allOrders.filter((o) => o.is_donation && o.status === "picked_up").reduce((s, o) => s + (o.quantity ?? 1), 0);
  // Stripe fees estimate: 1.4% + 0.25€ per transaction (European cards)
  const stripeFees    = nonDonationOrders.reduce((s, o) => s + ((o.total_amount ?? 0) * 0.014 + 0.25), 0);
  const revenuKshare  = commission + serviceFees;
  const revenuNet     = revenuKshare - stripeFees;

  // ── Ranking: aggregate ALL orders for the period (no commerce filter) ──
  let rankingQuery = supabase
    .from("orders")
    .select("commerce_id, total_amount, commission_amount, quantity")
    .in("status", ["paid", "ready_for_pickup", "picked_up"])
    .gte("created_at", periodStart.toISOString());
  if (periodEnd) rankingQuery = rankingQuery.lt("created_at", periodEnd.toISOString());
  const { data: rankingOrders } = await rankingQuery;

  const rankingMap = new Map<string, { name: string; city: string; ca: number; commission: number; paniers: number; favoris: number; avgRating: number | null; totalRatings: number }>();
  for (const c of commercesList ?? []) {
    rankingMap.set(c.id, { name: c.name, city: c.city ?? "", ca: 0, commission: 0, paniers: 0, favoris: favoritesPerCommerce.get(c.id) ?? 0, avgRating: c.average_rating ?? null, totalRatings: c.total_ratings ?? 0 });
  }
  for (const o of rankingOrders ?? []) {
    const entry = rankingMap.get(o.commerce_id);
    if (entry) {
      entry.ca += o.total_amount ?? 0;
      entry.commission += o.commission_amount ?? 0;
      entry.paniers += o.quantity ?? 1;
    }
  }
  const ranking = [...rankingMap.values()]
    .filter((c) => c.ca > 0 || c.paniers > 0 || c.favoris > 0)
    .sort((a, b) => b.ca - a.ca);

  // Favorites ranking — sorted by favorites count
  const favoritesRanking = [...rankingMap.values()]
    .filter((c) => c.favoris > 0)
    .sort((a, b) => b.favoris - a.favoris);

  // Ratings ranking — sorted by average rating (then by total ratings)
  const ratingsRanking = [...rankingMap.values()]
    .filter((c) => c.avgRating !== null && c.totalRatings > 0)
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || b.totalRatings - a.totalRatings);

  // ── Dynamic chart data based on period ──
  let dayData: { day: string; ca: number; ventes: number }[];
  let caTitle: string;
  let ventesTitle: string;

  if (period === "today") {
    caTitle = "CA par heure";
    ventesTitle = "Paniers vendus par heure";
    const byHour: Record<number, { ca: number; ventes: number }> = {};
    for (let i = 8; i <= 22; i++) byHour[i] = { ca: 0, ventes: 0 };
    allOrders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      if (h >= 8 && h <= 22) {
        byHour[h].ca += o.total_amount ?? 0;
        byHour[h].ventes += o.quantity ?? 1;
      }
    });
    dayData = HOURS.map((label, i) => ({ day: label, ca: Math.round(byHour[i + 8]?.ca ?? 0), ventes: byHour[i + 8]?.ventes ?? 0 }));
  } else if (period === "week") {
    caTitle = "CA de la semaine";
    ventesTitle = "Paniers vendus cette semaine";
    const byDay: Record<number, { ca: number; ventes: number }> = {};
    for (let i = 0; i < 7; i++) byDay[i] = { ca: 0, ventes: 0 };
    allOrders.forEach((o) => {
      let dow = new Date(o.created_at).getDay();
      dow = dow === 0 ? 6 : dow - 1;
      byDay[dow].ca += o.total_amount ?? 0;
      byDay[dow].ventes += o.quantity ?? 1;
    });
    dayData = DAYS_FR.map((day, i) => ({ day, ca: Math.round(byDay[i]?.ca ?? 0), ventes: byDay[i]?.ventes ?? 0 }));
  } else if (period === "month") {
    caTitle = "CA du mois";
    ventesTitle = "Paniers vendus ce mois";
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const byDate: Record<number, { ca: number; ventes: number }> = {};
    for (let i = 1; i <= daysInMonth; i++) byDate[i] = { ca: 0, ventes: 0 };
    allOrders.forEach((o) => {
      const d = new Date(o.created_at).getDate();
      byDate[d].ca += o.total_amount ?? 0;
      byDate[d].ventes += o.quantity ?? 1;
    });
    dayData = Array.from({ length: daysInMonth }, (_, i) => ({ day: (i + 1).toString(), ca: Math.round(byDate[i + 1]?.ca ?? 0), ventes: byDate[i + 1]?.ventes ?? 0 }));
  } else if (["3months", "6months", "12months", "year"].includes(period)) {
    const labels: Record<string, string[]> = {
      "3months":  ["CA (3 derniers mois)", "Paniers vendus (3 derniers mois)"],
      "6months":  ["CA (6 derniers mois)", "Paniers vendus (6 derniers mois)"],
      "12months": ["CA (12 derniers mois)", "Paniers vendus (12 derniers mois)"],
      year:       ["CA de l'année", "Paniers vendus cette année"],
    };
    caTitle = labels[period]?.[0] ?? "CA";
    ventesTitle = labels[period]?.[1] ?? "Paniers vendus";
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    let y = periodStart.getFullYear(), m = periodStart.getMonth();
    while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
      months.push({ key: `${y}-${m}`, label: MONTHS_FR[m] });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    const byMonth: Record<string, { ca: number; ventes: number }> = {};
    months.forEach((mo) => { byMonth[mo.key] = { ca: 0, ventes: 0 }; });
    allOrders.forEach((o) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (byMonth[key]) {
        byMonth[key].ca += o.total_amount ?? 0;
        byMonth[key].ventes += o.quantity ?? 1;
      }
    });
    dayData = months.map((mo) => ({ day: mo.label, ca: Math.round(byMonth[mo.key]?.ca ?? 0), ventes: byMonth[mo.key]?.ventes ?? 0 }));
  } else {
    // "total"
    caTitle = "CA total";
    ventesTitle = "Paniers vendus (total)";
    const now = new Date();
    const totalMonths = (now.getFullYear() - periodStart.getFullYear()) * 12 + (now.getMonth() - periodStart.getMonth()) + 1;
    if (totalMonths <= 24) {
      const months: { key: string; label: string }[] = [];
      let y = periodStart.getFullYear(), m = periodStart.getMonth();
      while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
        months.push({ key: `${y}-${m}`, label: `${MONTHS_FR[m]} ${y.toString().slice(2)}` });
        m++;
        if (m > 11) { m = 0; y++; }
      }
      const byMonth: Record<string, { ca: number; ventes: number }> = {};
      months.forEach((mo) => { byMonth[mo.key] = { ca: 0, ventes: 0 }; });
      allOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (byMonth[key]) {
          byMonth[key].ca += o.total_amount ?? 0;
          byMonth[key].ventes += o.quantity ?? 1;
        }
      });
      dayData = months.map((mo) => ({ day: mo.label, ca: Math.round(byMonth[mo.key]?.ca ?? 0), ventes: byMonth[mo.key]?.ventes ?? 0 }));
    } else {
      const years: number[] = [];
      for (let y = periodStart.getFullYear(); y <= now.getFullYear(); y++) years.push(y);
      const byYear: Record<number, { ca: number; ventes: number }> = {};
      years.forEach((y) => { byYear[y] = { ca: 0, ventes: 0 }; });
      allOrders.forEach((o) => {
        const y = new Date(o.created_at).getFullYear();
        if (byYear[y]) {
          byYear[y].ca += o.total_amount ?? 0;
          byYear[y].ventes += o.quantity ?? 1;
        }
      });
      dayData = years.map((y) => ({ day: y.toString(), ca: Math.round(byYear[y]?.ca ?? 0), ventes: byYear[y]?.ventes ?? 0 }));
    }
  }

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
      iconName: TYPE_ICON_NAMES[type] ?? "ShoppingCart",
      color:   "#3744C8",
    }));

  const kpis = [
    { label: "CA généré",         value: `${caGenere.toFixed(2)}€`,      sub: undefined,                          iconBg: "bg-green-100",  iconColor: "text-green-600",  icon: Euro },
    { label: "Revenu Kshare",     value: `${revenuKshare.toFixed(2)}€`,  sub: `Commission ${commission.toFixed(2)}€ + Frais ${serviceFees.toFixed(2)}€`, iconBg: "bg-purple-100", iconColor: "text-purple-600", icon: BarChart3 },
    { label: "Frais de service",  value: `${serviceFees.toFixed(2)}€`,   sub: `${nbTransactions} transaction${nbTransactions > 1 ? "s" : ""}`, iconBg: "bg-cyan-100",   iconColor: "text-cyan-600",   icon: CreditCard },
    { label: "Frais Stripe",      value: `${stripeFees.toFixed(2)}€`,    sub: "Estimé : 1.4% + 0.25€/transaction", iconBg: "bg-red-100",    iconColor: "text-red-500",    icon: Receipt },
    { label: "Revenu net Kshare", value: `${revenuNet.toFixed(2)}€`,     sub: `(Commission + Frais service) − Frais Stripe`,     iconBg: "bg-emerald-100", iconColor: "text-emerald-600", icon: Banknote },
    { label: "CA net commerces",  value: `${caNet.toFixed(2)}€`,         sub: undefined,                          iconBg: "bg-blue-100",   iconColor: "text-blue-600",   icon: TrendingUp },
    { label: "Paniers vendus",    value: paniersVendus.toString(),        sub: undefined,                          iconBg: "bg-yellow-100", iconColor: "text-yellow-600", icon: Package },
    { label: "Prix moyen",        value: `${avgPrice.toFixed(2)}€`,      sub: undefined,                          iconBg: "bg-indigo-100", iconColor: "text-indigo-600", icon: ShoppingBag },
    { label: "Commerces actifs",  value: (activeCommerces ?? 0).toString(), sub: undefined,                        iconBg: "bg-orange-100", iconColor: "text-orange-600", icon: Store },
    { label: "Dons commerçants",  value: donCommerce.toString(),          sub: undefined,                          iconBg: "bg-pink-100",   iconColor: "text-pink-500",   icon: Heart },
    { label: "Dons clients",      value: donClients.toString(),           sub: undefined,                          iconBg: "bg-rose-100",   iconColor: "text-rose-500",   icon: Gift },
    { label: "Dons distribués",  value: donsDistribues.toString(),       sub: "Paniers récupérés par les assos",  iconBg: "bg-teal-100",   iconColor: "text-teal-500",   icon: Package },
    { label: "Favoris total",     value: totalFavorites.toString(),       sub: `${favoritesPerCommerce.size} commerce${favoritesPerCommerce.size > 1 ? "s" : ""} en favoris`, iconBg: "bg-amber-100",  iconColor: "text-amber-500",  icon: Star },
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

      {/* Charts + type breakdown + ranking */}
      <AdminCharts
        period={period}
        commerce={commerce}
        commercesList={(commercesList ?? []).map((c) => ({ id: c.id, name: c.name }))}
        dayData={dayData}
        typeData={typeData}
        caTitle={caTitle}
        ventesTitle={ventesTitle}
        ranking={ranking}
        favoritesRanking={favoritesRanking}
        ratingsRanking={ratingsRanking}
      />
    </div>
  );
}
