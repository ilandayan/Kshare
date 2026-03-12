import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Gift, CheckCircle, Clock, TrendingUp, Heart } from "lucide-react";

export default async function ReportingAssoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: asso } = await supabase
    .from("associations")
    .select("id, name")
    .eq("profile_id", user.id)
    .single();
  if (!asso) redirect("/connexion");

  const { data: orders } = await supabase
    .from("orders")
    .select("status, quantity, created_at")
    .eq("association_id", asso.id)
    .eq("is_donation", true);

  const total     = orders?.length ?? 0;
  const collected = orders?.filter((o) => o.status === "picked_up").length ?? 0;
  const pending   = orders?.filter((o) => ["created", "paid", "ready_for_pickup"].includes(o.status)).length ?? 0;

  // Last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCollected = orders?.filter(
    (o) => o.status === "picked_up" && new Date(o.created_at) >= thirtyDaysAgo
  ).length ?? 0;

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
          <h2 className="text-lg font-bold text-gray-900">Impact — 30 derniers jours</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-purple-50 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{recentCollected}</div>
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
            Aucune donnée disponible. Commencez à réserver des paniers pour voir votre impact.
          </div>
        )}
      </div>
    </div>
  );
}
