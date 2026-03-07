import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { BASKET_TYPES } from "@/lib/constants";

export default async function MesReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: asso } = await supabase.from("associations").select("id").eq("profile_id", user.id).single();
  if (!asso) redirect("/connexion");

  const { data: orders } = await supabase
    .from("orders")
    .select("*, baskets(type, pickup_start, pickup_end, day), commerces(name, city)")
    .eq("association_id", asso.id)
    .eq("is_donation", true)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-8">Mes réservations</h1>
      {!orders?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <Calendar className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>Aucune réservation pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const basket = order.baskets as { type: string; pickup_start: string; pickup_end: string; day: string } | null;
            const commerce = order.commerces as { name: string; city: string } | null;
            const typeConfig = BASKET_TYPES.find((t) => t.value === basket?.type);
            return (
              <div key={order.id} className="p-4 border border-border rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{typeConfig?.emoji}</span>
                  <div>
                    <div className="font-semibold text-foreground">{commerce?.name} — {commerce?.city}</div>
                    <div className="text-sm text-muted-foreground">
                      {basket?.day === "today" ? "Aujourd'hui" : "Demain"} · {basket?.pickup_start} – {basket?.pickup_end}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Qté : {order.quantity}</div>
                  </div>
                </div>
                <Badge variant={order.status === "picked_up" ? "default" : "secondary"} className="text-xs capitalize">
                  {order.status}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
