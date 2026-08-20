import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DonsClient } from "@/components/shop/dons-client";
import { mesCommerceIds } from "@/lib/commerce-courant";

export const dynamic = "force-dynamic";

export default async function DonsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?role=commerce");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, name, preferred_association_id")
    .in("id", await mesCommerceIds(supabase))
    .single();

  if (!commerce) redirect("/inscription-commercant");

  // La vue ne livre que le nom et la ville : le commerçant n'a aucune raison de
  // connaître l'email, l'adresse ou le représentant d'une association.
  const { data: associations } = await supabase
    .from("associations_publiques")
    .select("id, name, city")
    .order("name");

  const { data: demandes } = await supabase
    .from("association_leads")
    .select("id, name, status, created_at")
    .eq("commerce_id", commerce.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Dons & associations</h1>
      <p className="text-sm text-muted-foreground mb-6">
        À qui vont les paniers que vous offrez, et ceux que vos clients offrent
        depuis votre boutique.
      </p>

      <DonsClient
        associations={(associations ?? [])
          // Postgres déclare toutes les colonnes d'une vue nullables, quoi qu'en
          // dise la table dessous. On écarte plutôt que de mentir au typage.
          .filter((a): a is { id: string; name: string; city: string | null } =>
            Boolean(a.id && a.name),
          )}
        associationChoisie={commerce.preferred_association_id}
        demandes={demandes ?? []}
      />
    </div>
  );
}
