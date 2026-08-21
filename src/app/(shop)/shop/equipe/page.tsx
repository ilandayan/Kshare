import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EquipeClient from "./_client";

export const dynamic = "force-dynamic";

/**
 * Les comptes de l'équipe du magasin.
 *
 * Réservé au propriétaire — celui qui répond du magasin. Un employé ne crée pas
 * d'autres employés : la page le renvoie au tableau de bord plutôt que de lui
 * montrer un écran dont tous les boutons échoueraient.
 */
export default async function EquipePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, name")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!commerce) redirect("/shop/dashboard");

  const { data: acces } = await supabase
    .from("commerce_acces")
    .select("id, profile_id, created_at")
    .eq("commerce_id", commerce.id)
    .order("created_at");

  const { data: profils } = acces?.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in(
          "id",
          acces.map((a) => a.profile_id),
        )
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const employes = (acces ?? []).map((a) => {
    const p = (profils ?? []).find((x) => x.id === a.profile_id);
    return {
      id: a.id,
      nom: p?.full_name ?? null,
      email: p?.email ?? null,
      depuis: a.created_at,
    };
  });

  return <EquipeClient magasin={commerce.name} employes={employes} />;
}
