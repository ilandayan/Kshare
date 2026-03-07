import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock } from "lucide-react";
import { BASKET_TYPES } from "@/lib/constants";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const STATUS_COLORS: Record<string, string> = {
  created:          "bg-yellow-100 text-yellow-700",
  paid:             "bg-blue-100 text-blue-700",
  ready_for_pickup: "bg-indigo-100 text-indigo-700",
  picked_up:        "bg-green-100 text-green-700",
  no_show:          "bg-red-100 text-red-700",
  refunded:         "bg-gray-100 text-gray-700",
  cancelled_admin:  "bg-red-100 text-red-600",
};

export default async function MesReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: asso } = await supabase
    .from("associations")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!asso) redirect("/connexion");

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      baskets(type, pickup_start, pickup_end, day),
      commerces:baskets(commerces(name, city))
    `)
    .eq("association_id", asso.id)
    .eq("is_donation", true)
    .order("created_at", { ascending: false });

  const pending = orders?.filter((o) =>
    ["created", "paid", "ready_for_pickup"].includes(o.status)
  ).length ?? 0;

  const collected = orders?.filter((o) => o.status === "picked_up").length ?? 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-[#3744C8] rounded-xl flex items-center justify-center">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>
      </div>
      <p className="text-gray-500 mb-8 ml-12">Suivi de vos paniers dons réservés</p>

      {/* KPI mini cards */}
      {orders && orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total réservé", value: orders.length, color: "text-[#3744C8]" },
            { label: "En attente",    value: pending,       color: "text-orange-500" },
            { label: "Collectés",     value: collected,     color: "text-green-600" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-[#e2e5f0] shadow-sm">
              <div className={`text-3xl font-bold ${kpi.color} mb-1`}>{kpi.value}</div>
              <div className="text-sm text-gray-500">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!orders?.length ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-16 text-center">
          <div className="w-16 h-16 bg-[#EEF0F8] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-[#3744C8] opacity-50" />
          </div>
          <p className="text-gray-500 font-medium">Aucune réservation pour le moment</p>
          <p className="text-gray-400 text-sm mt-1">Rendez-vous dans &quot;Paniers disponibles&quot; pour réserver</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const basket = order.baskets as {
              type: string; pickup_start: string; pickup_end: string; day: string;
            } | null;
            const typeConfig = BASKET_TYPES.find((t) => t.value === basket?.type);
            const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
            const statusColor = STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700";

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-[#EEF0F8] rounded-xl flex items-center justify-center text-xl shrink-0">
                    {typeConfig?.emoji ?? "📦"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Panier {typeConfig?.label}</div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {basket?.day === "today" ? "Aujourd'hui" : "Demain"} · {basket?.pickup_start} – {basket?.pickup_end}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">Qté : {order.quantity}</div>
                  </div>
                </div>
                <Badge className={`${statusColor} border-0 text-xs font-medium shrink-0`}>
                  {statusLabel}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
