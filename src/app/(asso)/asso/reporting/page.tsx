import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, CheckCircle, Clock } from "lucide-react";

export default async function ReportingAssoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: asso } = await supabase.from("associations").select("id, name").eq("profile_id", user.id).single();
  if (!asso) redirect("/connexion");

  const { data: orders } = await supabase
    .from("orders")
    .select("status, quantity")
    .eq("association_id", asso.id)
    .eq("is_donation", true);

  const total = orders?.length ?? 0;
  const collected = orders?.filter((o) => o.status === "picked_up").length ?? 0;
  const pending = orders?.filter((o) => ["paid", "ready_for_pickup"].includes(o.status)).length ?? 0;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-8">Reporting des dons</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total réservé", value: total, icon: Gift },
          { label: "Collecté", value: collected, icon: CheckCircle },
          { label: "En attente", value: pending, icon: Clock },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
