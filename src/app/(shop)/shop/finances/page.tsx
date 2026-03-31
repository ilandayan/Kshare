import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommerceLedgerSummary, getCommerceBalance } from "@/lib/stripe/ledger";
import { FinanceDashboard } from "@/components/shop/finance-dashboard";
import { ShopFinancePeriodFilter } from "./finance-period-filter";

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
      if (period.startsWith("y")) {
        const year = parseInt(period.slice(1), 10);
        if (!isNaN(year)) return new Date(year, 0, 1);
      }
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

function getPeriodEnd(period: string): string | undefined {
  if (period.startsWith("y")) {
    const year = parseInt(period.slice(1), 10);
    if (!isNaN(year)) return new Date(year + 1, 0, 1).toISOString();
  }
  return undefined;
}

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = rawPeriod ?? "week";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, subscription_plan, commission_rate")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) redirect("/connexion");

  const periodStart = getPeriodStart(period);
  const periodEnd = getPeriodEnd(period);

  // Fetch financial data filtered by period
  const [balance, summary] = await Promise.all([
    getCommerceBalance(commerce.id),
    getCommerceLedgerSummary(commerce.id, periodStart.toISOString(), periodEnd),
  ]);

  // Next payout date (next Tuesday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7;
  const nextPayout = new Date(now);
  nextPayout.setDate(now.getDate() + daysUntilTuesday);
  const nextPayoutFormatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(nextPayout);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finances</h1>
          <p className="text-sm text-gray-400 mt-0.5">Suivi de vos revenus et reversements</p>
        </div>
        <ShopFinancePeriodFilter period={period} />
      </div>
      <FinanceDashboard
        balance={balance}
        summary={summary}
        nextPayoutDate={nextPayoutFormatted}
        plan={commerce.subscription_plan ?? "starter"}
        commissionRate={commerce.commission_rate ?? 18}
      />
    </div>
  );
}
