import { createAdminClient } from "@/lib/supabase/admin";
import { ChargesClient, type ChargeRow } from "@/components/crm/charges-client";

export const dynamic = "force-dynamic";

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee } = await searchParams;
  const anneeCourante = new Date().getUTCFullYear();
  const anneeChoisie = Math.min(
    anneeCourante,
    Math.max(2024, parseInt(annee ?? String(anneeCourante), 10) || anneeCourante),
  );

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("charges")
    .select("id, label, category, amount, vat_amount, supplier, incurred_on, recurring, receipt_url, notes")
    .gte("incurred_on", `${anneeChoisie}-01-01`)
    .lt("incurred_on", `${anneeChoisie + 1}-01-01`)
    .order("incurred_on", { ascending: false });

  const annees: number[] = [];
  for (let a = anneeCourante; a >= anneeCourante - 3; a--) annees.push(a);

  return (
    <ChargesClient
      charges={(data ?? []) as ChargeRow[]}
      annee={anneeChoisie}
      annees={annees}
    />
  );
}
