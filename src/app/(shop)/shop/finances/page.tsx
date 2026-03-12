import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommerceLedgerSummary, getCommerceBalance } from "@/lib/stripe/ledger";
import { FinanceDashboard } from "@/components/shop/finance-dashboard";

export default async function FinancesPage() {
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

  // Fetch financial data
  const [balance, summary] = await Promise.all([
    getCommerceBalance(commerce.id),
    getCommerceLedgerSummary(commerce.id),
  ]);

  // Next payout date (next Tuesday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 2=Tue
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7;
  const nextPayout = new Date(now);
  nextPayout.setDate(now.getDate() + daysUntilTuesday);
  const nextPayoutFormatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(nextPayout);

  return (
    <FinanceDashboard
      balance={balance}
      summary={summary}
      nextPayoutDate={nextPayoutFormatted}
      plan={commerce.subscription_plan ?? "starter"}
      commissionRate={commerce.commission_rate ?? 18}
    />
  );
}
