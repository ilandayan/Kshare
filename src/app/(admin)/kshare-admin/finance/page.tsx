import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CreditCard, Receipt, Banknote, Clock } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { ReconcileButton } from "./reconcile-button";
import { FinancePeriodFilter } from "./finance-period-filter";

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
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
}

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

type OrderRow = {
  total_amount: number;
  commission_amount: number;
  service_fee_amount: number;
  stripe_fee_amount: number | null;
  is_donation: boolean;
};

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = rawPeriod ?? "month";
  const periodStart = getPeriodStart(period);
  const periodISO = periodStart.toISOString();

  const supabase = await createClient();

  const [{ data: subscriptions }, { data: paidOrders }, { data: pendingOrders }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, commerces(name, city, email)")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("total_amount, commission_amount, service_fee_amount, stripe_fee_amount, is_donation" as string)
      .in("status", ["paid", "ready_for_pickup", "picked_up"])
      .gte("created_at", periodISO) as unknown as { data: OrderRow[] | null; error: unknown },
    supabase
      .from("orders")
      .select("id, commerce_id, net_amount, created_at, commerces(name)")
      .eq("status", "picked_up")
      .eq("is_donation", false)
      .gte("created_at", periodISO)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const orders = (paidOrders ?? []) as OrderRow[];

  // ── KPI calculations ──
  const totalCommissions = orders
    .filter((o) => !o.is_donation)
    .reduce((sum, o) => sum + (o.commission_amount ?? 0), 0);

  const totalServiceFees = orders.reduce(
    (sum, o) => sum + (o.service_fee_amount ?? 0),
    0
  );

  const totalStripeFees = orders.reduce(
    (sum, o) => sum + (o.stripe_fee_amount ?? 0),
    0
  );

  const ordersWithoutFee = orders.filter(
    (o) => !o.is_donation && (!o.stripe_fee_amount || o.stripe_fee_amount === 0) && o.total_amount > 0
  ).length;

  const activeSubscriptions =
    subscriptions?.filter((s) => ["active", "offered"].includes(s.status)) ?? [];

  const monthlyRevenue = activeSubscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.monthly_price, 0);

  // ── Bilan ──
  const totalRevenus = totalCommissions + monthlyRevenue + totalServiceFees;
  const resultatNet = totalRevenus - totalStripeFees;

  // ── Reversements en attente ──
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
      label: "Commissions",
      value: `${totalCommissions.toFixed(2)} €`,
      sub: "18% Starter / 12% Pro",
      icon: BarChart3,
      color: "text-violet-500",
      bgColor: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      label: "Abonnements",
      value: `${monthlyRevenue.toFixed(2)} €/mois`,
      sub: `${activeSubscriptions.length} abonné(s) actif(s)`,
      icon: CreditCard,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Frais de service",
      value: `${totalServiceFees.toFixed(2)} €`,
      sub: "0.79€ + 1.5% par commande",
      icon: Receipt,
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    },
    {
      label: "Frais Stripe réels",
      value: `${totalStripeFees.toFixed(2)} €`,
      sub: ordersWithoutFee > 0
        ? `${ordersWithoutFee} commande(s) sans frais réconciliés`
        : "Tous les frais sont réconciliés",
      icon: Banknote,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/30",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion financière</h1>
          <p className="text-muted-foreground mt-1">
            Vue scindée : commissions, abonnements, frais de service et frais Stripe
          </p>
        </div>
        <FinancePeriodFilter period={period} />
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={kpi.bgColor}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bilan Kshare */}
      <Card className="mb-8 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardHeader>
          <CardTitle className="text-base text-emerald-800 dark:text-emerald-200">
            Bilan Kshare
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total revenus</span>
            <span className="text-sm font-semibold text-foreground">
              {totalRevenus.toFixed(2)} €
            </span>
          </div>
          <div className="flex items-center justify-between pl-4">
            <span className="text-sm text-muted-foreground">
              Commissions
            </span>
            <span className="text-sm text-foreground">
              {totalCommissions.toFixed(2)} €
            </span>
          </div>
          <div className="flex items-center justify-between pl-4">
            <span className="text-sm text-muted-foreground">
              Abonnements
            </span>
            <span className="text-sm text-foreground">
              {monthlyRevenue.toFixed(2)} €/mois
            </span>
          </div>
          <div className="flex items-center justify-between pl-4">
            <span className="text-sm text-muted-foreground">
              Frais de service
            </span>
            <span className="text-sm text-foreground">
              {totalServiceFees.toFixed(2)} €
            </span>
          </div>
          <div className="border-t border-emerald-200 dark:border-emerald-800 my-2" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-600 dark:text-red-400">
              Charges Stripe
            </span>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              −{totalStripeFees.toFixed(2)} €
            </span>
          </div>
          <div className="border-t border-emerald-200 dark:border-emerald-800 my-2" />
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-emerald-800 dark:text-emerald-200">
              Résultat net
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {resultatNet.toFixed(2)} €
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Reconcile button */}
      {ordersWithoutFee > 0 && (
        <div className="mb-8">
          <ReconcileButton ordersWithoutFee={ordersWithoutFee} />
        </div>
      )}

      {/* Reversements en attente */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Reversements en attente</CardTitle>
          <div className="flex items-center gap-2 text-sm text-orange-500">
            <Clock className="h-4 w-4" />
            {totalPendingAmount.toFixed(2)} €
          </div>
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

      {/* Abonnements commerçants */}
      <Card>
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
    </div>
  );
}
