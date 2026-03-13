import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BASKET_TYPES_BY_COMMERCE } from "@/lib/constants";
import { NouveauPanierForm } from "./NouveauPanierForm";

export default async function NouveauPanierPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("commerce_type")
    .eq("profile_id", user.id)
    .single();

  const commerceType = commerce?.commerce_type ?? null;
  const allowedTypes = commerceType
    ? BASKET_TYPES_BY_COMMERCE[commerceType] ?? null
    : null;

  return <NouveauPanierForm allowedTypes={allowedTypes} />;
}
