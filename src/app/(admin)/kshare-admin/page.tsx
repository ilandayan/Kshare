import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingBag, TrendingUp, Gift } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: pendingCommerces }, { count: pendingAssos }, { count: activeBaskets }, { count: totalOrders }] =
    await Promise.all([
      supabase.from("commerces").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("associations").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("baskets").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "paid"),
    ]);

  const kpis = [
    { title: "Comptes en attente", value: (pendingCommerces ?? 0) + (pendingAssos ?? 0), icon: Users, href: "/kshare-admin/comptes", urgent: (pendingCommerces ?? 0) + (pendingAssos ?? 0) > 0 },
    { title: "Paniers publiés", value: activeBaskets ?? 0, icon: ShoppingBag, href: "/kshare-admin/paniers", urgent: false },
    { title: "Commandes payées", value: totalOrders ?? 0, icon: TrendingUp, href: "/kshare-admin/reporting", urgent: false },
    { title: "Commerces validés", value: 0, icon: Gift, href: "/kshare-admin/finance", urgent: false },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Administration Kshare</h1>
        <p className="text-muted-foreground mt-1">Vue globale de la plateforme</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}>
            <Card className={`hover:shadow-md transition-shadow cursor-pointer ${kpi.urgent && kpi.value > 0 ? "border-yellow-400 dark:border-yellow-600" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${kpi.urgent && kpi.value > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
                  {kpi.value}
                </div>
                {kpi.urgent && kpi.value > 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Action requise</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
