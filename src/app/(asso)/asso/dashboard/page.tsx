import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import { Gift, Heart, ShoppingBag } from "lucide-react";
import { AssoDashboardCharts } from "@/components/asso/asso-dashboard-charts";

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const HOURS = Array.from({ length: 15 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}h`);


function getPeriodStart(period: string, assoCreatedAt?: string): Date {
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
      return assoCreatedAt ? new Date(assoCreatedAt) : new Date(2020, 0, 1);
    default: {
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
}

export default async function AssoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = rawPeriod ?? "week";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: asso } = await supabase
    .from("associations")
    .select("id, name, created_at")
    .eq("profile_id", user.id)
    .single();
  if (!asso) redirect("/");

  const periodStart = getPeriodStart(period, asso.created_at);

  // Donation orders for this association in the selected period
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, quantity, created_at, is_donation")
    .eq("association_id", asso.id)
    .eq("is_donation", true)
    .gte("created_at", periodStart.toISOString());

  const allOrders     = orders ?? [];
  const totalDons     = allOrders.reduce((s, o) => s + (o.quantity ?? 1), 0);
  const collected     = allOrders.filter((o) => o.status === "picked_up");
  const donCommerce   = allOrders.filter((o) => o.is_donation).length;
  const donClients    = 0;
  const totalPaniers = collected.reduce((s, o) => s + (o.quantity ?? 1), 0);

  // Bar chart — dynamic grouping based on period
  let barData: { day: string; paniers: number }[];
  let barTitle: string;

  if (period === "today") {
    barTitle = "Paniers récupérés par heure";
    const byHour: Record<number, number> = {};
    for (let i = 8; i <= 22; i++) byHour[i] = 0;
    allOrders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      if (h >= 8 && h <= 22) byHour[h] = (byHour[h] ?? 0) + (o.quantity ?? 1);
    });
    barData = HOURS.map((label, i) => ({ day: label, paniers: byHour[i + 8] ?? 0 }));
  } else if (period === "week") {
    barTitle = "Paniers récupérés cette semaine";
    const byDay: Record<number, number> = {};
    for (let i = 0; i < 7; i++) byDay[i] = 0;
    allOrders.forEach((o) => {
      let dow = new Date(o.created_at).getDay();
      dow = dow === 0 ? 6 : dow - 1;
      byDay[dow] = (byDay[dow] ?? 0) + (o.quantity ?? 1);
    });
    barData = DAYS_FR.map((day, i) => ({ day, paniers: byDay[i] ?? 0 }));
  } else if (period === "month") {
    barTitle = "Paniers récupérés ce mois";
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const byDate: Record<number, number> = {};
    for (let i = 1; i <= daysInMonth; i++) byDate[i] = 0;
    allOrders.forEach((o) => {
      const d = new Date(o.created_at).getDate();
      byDate[d] = (byDate[d] ?? 0) + (o.quantity ?? 1);
    });
    barData = Array.from({ length: daysInMonth }, (_, i) => ({ day: (i + 1).toString(), paniers: byDate[i + 1] ?? 0 }));
  } else if (["3months", "6months", "12months", "year"].includes(period)) {
    const labels: Record<string, string> = {
      "3months": "Paniers récupérés (3 derniers mois)",
      "6months": "Paniers récupérés (6 derniers mois)",
      "12months": "Paniers récupérés (12 derniers mois)",
      year: "Paniers récupérés cette année",
    };
    barTitle = labels[period] ?? "Paniers récupérés";
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    let y = periodStart.getFullYear(), m = periodStart.getMonth();
    while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
      months.push({ key: `${y}-${m}`, label: MONTHS_FR[m] });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    const byMonth: Record<string, number> = {};
    months.forEach((mo) => { byMonth[mo.key] = 0; });
    allOrders.forEach((o) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      byMonth[key] = (byMonth[key] ?? 0) + (o.quantity ?? 1);
    });
    barData = months.map((mo) => ({ day: mo.label, paniers: byMonth[mo.key] ?? 0 }));
  } else {
    barTitle = "Paniers récupérés (total)";
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
      const byMonth: Record<string, number> = {};
      months.forEach((mo) => { byMonth[mo.key] = 0; });
      allOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        byMonth[key] = (byMonth[key] ?? 0) + (o.quantity ?? 1);
      });
      barData = months.map((mo) => ({ day: mo.label, paniers: byMonth[mo.key] ?? 0 }));
    } else {
      const years: number[] = [];
      for (let y = periodStart.getFullYear(); y <= now.getFullYear(); y++) years.push(y);
      const byYear: Record<number, number> = {};
      years.forEach((y) => { byYear[y] = 0; });
      allOrders.forEach((o) => {
        const y = new Date(o.created_at).getFullYear();
        byYear[y] = (byYear[y] ?? 0) + (o.quantity ?? 1);
      });
      barData = years.map((y) => ({ day: y.toString(), paniers: byYear[y] ?? 0 }));
    }
  }

  const kpis = [
    {
      label: "Total paniers dons",
      value: totalDons.toString(),
      icon: Gift,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      label: "Dons commerçants",
      value: donCommerce.toString(),
      icon: ShoppingBag,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Dons clients",
      value: donClients.toString(),
      icon: Heart,
      iconBg: "bg-pink-100",
      iconColor: "text-pink-500",
    },
  ];

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 font-medium">{k.label}</p>
              <div className={`w-10 h-10 ${k.iconBg} rounded-xl flex items-center justify-center`}>
                <k.icon className={`h-5 w-5 ${k.iconColor}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Period selector + Bar chart */}
      <div className="mb-6">
        <AssoDashboardCharts period={period} barData={barData} barTitle={barTitle} />
      </div>

      {/* Impact social card */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <h3 className="font-bold text-lg">Impact social</h3>
        </div>
        <div className="bg-white/10 rounded-xl p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-purple-300" />
            <span className="text-sm text-white/70">Paniers collectés</span>
          </div>
          <div className="text-4xl font-bold text-white">{totalPaniers}</div>
          <p className="text-xs text-white/50 mt-1">Sur la période sélectionnée</p>
        </div>
      </div>
    </div>
  );
}
