import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Euro, Clock } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  offered: "Offert",
  unpaid: "Impayé",
  cancellation_requested: "Résiliation demandée",
};

const SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  offered: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  unpaid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancellation_requested: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default async function FinancePage() {
  const supabase = await createClient();

  const [{ data: subscriptions }, { data: pendingOrders }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, commerces(name, city, email)")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, commerce_id, net_amount, created_at, commerces(name)")
      .eq("status", "picked_up")
      .eq("is_donation", false)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const activeSubscriptions = subscriptions?.filter((s) =>
    ["active", "offered"].includes(s.status)
  ) ?? [];

  const monthlyRevenue = activeSubscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.monthly_price, 0);

  // Agréger les reversements en attente par commerce
  type ReversementEntry = {
    commerceId: string;
    commerceName: string;
    totalAmount: number;
    orderCount: number;
    lastOrderDate: string;
  };

  const reversementMap = new Map<string, ReversementEntry>();

  for (const order of pendingOrders ?? []) {
    const entry = reversementMap.get(order.commerce_id);
    const commerce = order.commerces as { name: string } | null;
    if (entry) {
      entry.totalAmount += order.net_amount ?? 0;
      entry.orderCount += 1;
      if (order.created_at > entry.lastOrderDate) {
        entry.lastOrderDate = order.created_at;
      }
    } else {
      reversementMap.set(order.commerce_id, {
        commerceId: order.commerce_id,
        commerceName: commerce?.name ?? "Commerce inconnu",
        totalAmount: order.net_amount ?? 0,
        orderCount: 1,
        lastOrderDate: order.created_at,
      });
    }
  }

  const reversements = [...reversementMap.values()].sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  const totalPendingAmount = reversements.reduce((sum, r) => sum + r.totalAmount, 0);

  const kpis = [
    {
      label: "Abonnements actifs",
      value: activeSubscriptions.length.toString(),
      sub: "Commerçants abonnés",
      icon: CreditCard,
      color: "text-blue-500",
    },
    {
      label: "Revenus abonnements",
      value: `${monthlyRevenue.toFixed(2)} €`,
      sub: `Starter ${SUBSCRIPTION_PLANS.starter.monthlyPrice} € / Pro ${SUBSCRIPTION_PLANS.pro.monthlyPrice} €`,
      icon: Euro,
      color: "text-green-500",
    },
    {
      label: "Reversements en attente",
      value: `${totalPendingAmount.toFixed(2)} €`,
      sub: `${reversements.length} commerce(s)`,
      icon: Clock,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Gestion financière</h1>
        <p className="text-muted-foreground mt-1">Abonnements et reversements commerçants</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
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

      {/* Abonnements commerçants */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Abonnements commerçants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!subscriptions?.length ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Aucun abonnement</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Commerce</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Ville</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Mensualité</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Prochaine échéance</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Depuis le</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => {
                    const commerce = sub.commerces as { name: string; city: string; email: string } | null;
                    return (
                      <tr
                        key={sub.id}
                        className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-foreground">
                          {commerce?.name ?? "—"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{commerce?.city ?? "—"}</td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-xs ${SUBSCRIPTION_STATUS_COLORS[sub.status] ?? ""}`}
                            variant="outline"
                          >
                            {SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {sub.monthly_price === 0 ? "Offert" : `${sub.monthly_price} €`}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {sub.current_period_end
                            ? new Date(sub.current_period_end).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(sub.created_at).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reversements en attente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reversements en attente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {reversements.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              Aucun reversement en attente
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Commerce</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Montant net (€)</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Commandes</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Dernière vente</th>
                  </tr>
                </thead>
                <tbody>
                  {reversements.map((r) => (
                    <tr
                      key={r.commerceId}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">{r.commerceName}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                        {r.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{r.orderCount}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(r.lastOrderDate).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
