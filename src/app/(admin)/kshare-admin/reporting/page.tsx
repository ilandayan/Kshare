import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Euro, TrendingUp, Gift } from "lucide-react";
import { COMMISSION_RATE_DEFAULT } from "@/lib/constants";

export default async function ReportingPage() {
  const supabase = await createClient();

  // Statistiques globales des commandes
  const [{ data: orders }, { data: donationOrders }, { data: topCommerces }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total_amount, commission_amount, net_amount, commerce_id, status")
      .neq("is_donation", true),
    supabase
      .from("orders")
      .select("id, commerce_id")
      .eq("is_donation", true),
    supabase
      .from("commerces")
      .select("id, name, city")
      .eq("status", "validated")
      .limit(20),
  ]);

  // Agréger les stats par commerce
  type CommerceStats = {
    name: string;
    city: string;
    orderCount: number;
    totalRevenue: number;
    totalCommission: number;
  };

  const commerceMap = new Map<string, CommerceStats>();

  for (const c of topCommerces ?? []) {
    commerceMap.set(c.id, {
      name: c.name,
      city: c.city,
      orderCount: 0,
      totalRevenue: 0,
      totalCommission: 0,
    });
  }

  for (const order of orders ?? []) {
    const entry = commerceMap.get(order.commerce_id);
    if (entry) {
      entry.orderCount += 1;
      entry.totalRevenue += order.total_amount ?? 0;
      entry.totalCommission += order.commission_amount ?? 0;
    }
  }

  const sortedCommerces = [...commerceMap.entries()]
    .map(([, stats]) => stats)
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 20);

  const totalOrders = orders?.length ?? 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;
  const totalCommissions = orders?.reduce((sum, o) => sum + (o.commission_amount ?? 0), 0) ?? 0;
  const totalDonations = donationOrders?.length ?? 0;

  const kpis = [
    {
      label: "Paniers vendus",
      value: totalOrders.toString(),
      sub: "Commandes payées totales",
      icon: ShoppingBag,
      color: "text-blue-500",
    },
    {
      label: "CA plateforme",
      value: `${totalRevenue.toFixed(2)} €`,
      sub: "Cumul des ventes",
      icon: Euro,
      color: "text-green-500",
    },
    {
      label: "Commissions générées",
      value: `${totalCommissions.toFixed(2)} €`,
      sub: `Taux moyen ${COMMISSION_RATE_DEFAULT}%`,
      icon: TrendingUp,
      color: "text-purple-500",
    },
    {
      label: "Paniers dons distribués",
      value: totalDonations.toString(),
      sub: "Via les associations",
      icon: Gift,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Reporting global</h1>
        <p className="text-muted-foreground mt-1">Vue d&apos;ensemble des performances de la plateforme</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tableau des commerces les plus actifs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 20 commerces par activité</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedCommerces.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">#</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Commerce</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Ville</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Paniers</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">CA (€)</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Commission (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCommerces.map((c, idx) => (
                    <tr
                      key={`${c.name}-${idx}`}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-muted-foreground font-medium">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.city}</td>
                      <td className="py-3 px-4 text-right font-semibold">{c.orderCount}</td>
                      <td className="py-3 px-4 text-right">{c.totalRevenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-purple-600 dark:text-purple-400 font-medium">
                        {c.totalCommission.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note sur les graphiques */}
      <p className="text-xs text-muted-foreground mt-6 text-center">
        Les graphiques d&apos;évolution temporelle seront disponibles dans une prochaine version.
      </p>
    </div>
  );
}
