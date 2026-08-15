import { chiffres } from "@/lib/crm/chiffres";
import { ChiffresClient } from "@/components/crm/chiffres-client";

export const dynamic = "force-dynamic";

export default async function ChiffresPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois } = await searchParams;
  // Douze mois par défaut : assez pour voir une saisonnalité, assez peu pour
  // tenir sur un écran sans faire défiler.
  const nbMois = Math.min(36, Math.max(3, parseInt(mois ?? "12", 10) || 12));

  return <ChiffresClient donnees={await chiffres(nbMois)} nbMois={nbMois} />;
}
