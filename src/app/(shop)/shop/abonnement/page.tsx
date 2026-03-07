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
    .select("id, subscription_status")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) redirect("/connexion");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, monthly_price")
    .eq("commerce_id", commerce.id)
    .single();

  return (
    <AbonnementClient
      subscriptionStatus={commerce.subscription_status ?? null}
      subscription={subscription ?? null}
    />
  );
}
