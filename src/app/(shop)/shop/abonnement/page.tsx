import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AbonnementClient from "./AbonnementClient";

export default async function AbonnementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, subscription_status, subscription_plan, last_plan_change_at")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) redirect("/connexion");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, monthly_price, plan, pending_plan, pending_plan_effective_at")
    .eq("commerce_id", commerce.id)
    .single();

  // Can change plan: no change in the last 12 months
  let canChangePlan = true;
  let nextChangeDate: string | null = null;

  if (commerce.last_plan_change_at) {
    const lastChange = new Date(commerce.last_plan_change_at);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (lastChange > oneYearAgo) {
      canChangePlan = false;
      const nextAllowed = new Date(lastChange);
      nextAllowed.setFullYear(nextAllowed.getFullYear() + 1);
      nextChangeDate = new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(nextAllowed);
    }
  }

  return (
    <AbonnementClient
      subscriptionStatus={commerce.subscription_status ?? null}
      subscription={subscription ?? null}
      currentPlan={commerce.subscription_plan ?? null}
      canChangePlan={canChangePlan}
      nextChangeDate={nextChangeDate}
    />
  );
}
