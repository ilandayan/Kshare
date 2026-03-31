import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Gift, CheckCircle, Clock, TrendingUp, Heart } from "lucide-react";
import { AssoReportingPeriodFilter } from "./reporting-period-filter";

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
      // Default: cette semaine
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
}

export default async function ReportingAssoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = rawPeriod ?? "month";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: asso } = await supabase
    .from("associations")
    .select("id, name")
    .eq("profile_id", user.id)
    .single();
  if (!asso) redirect("/connexion");

  const periodStart = getPeriodStart(period);

  let query = supabase
    .from("orders")
    .select("status, quantity, created_at")
    .eq("association_id", asso.id)
    .eq("is_donation", true)
    .gte("created_at", periodStart.toISOString());

  const { data: orders } = await query;

  const total     = orders?.length ?? 0;
  const collected = orders?.filter((o) => o.status === "picked_up").length ?? 0;
  const pending   = orders?.filter((o) => ["created", "paid", "ready_for_pickup"].includes(o.status)).length ?? 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Reporting des dons</h1>
      </div>
      <p className="text-gray-500 mb-8 ml-12">Impact de votre association sur la plateforme Kshare</p>

      {/* Period selector */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 flex items-center gap-4 mb-6">
        <AssoReportingPeriodFilter period={period} />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {[
          { label: "Total réservé",  value: total,     icon: Gift,        color: "bg-purple-50", iconColor: "text-purple-600", valueColor: "text-purple-600" },
          { label: "Collectés",      value: collected, icon: CheckCircle, color: "bg-green-50",  iconColor: "text-green-600",  valueColor: "text-green-600" },
          { label: "En attente",     value: pending,   icon: Clock,       color: "bg-orange-50", iconColor: "text-orange-500", valueColor: "text-orange-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 font-medium">{kpi.label}</p>
              <div className={`w-9 h-9 ${kpi.color} rounded-xl flex items-center justify-center`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
            </div>
            <div className={`text-3xl font-bold ${kpi.valueColor}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Impact card */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Impact sur la période</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-purple-50 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{collected}</div>
            <div className="text-sm text-gray-500">Paniers récupérés</div>
          </div>
          <div className="bg-green-50 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {total > 0 ? Math.round((collected / total) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-500">Taux de collecte</div>
          </div>
        </div>

        {total === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm mt-4">
            Aucune donnée disponible sur cette période.
          </div>
        )}
      </div>
    </div>
  );
}
