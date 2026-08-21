import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EquipeClient from "./_client";

export const dynamic = "force-dynamic";

/**
 * Le compte de l'équipe du magasin.
 *
 * Réservé au propriétaire — celui qui répond du magasin. Un employé ne gère pas
 * son propre accès : la page le renvoie au tableau de bord plutôt que de lui
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

  // Un seul compte par magasin, garanti par la contrainte d'unicité posée sur
  // `commerce_id` : `maybeSingle` ne peut donc pas échouer sur plusieurs lignes.
  const { data: acces } = await supabase
    .from("commerce_acces")
    .select("id, profile_id, created_at")
    .eq("commerce_id", commerce.id)
    .maybeSingle();

  const { data: profil } = acces
    ? await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", acces.profile_id)
        .maybeSingle()
    : { data: null };

  const employe = acces
    ? {
        id: acces.id,
        nom: profil?.full_name ?? null,
        email: profil?.email ?? null,
        depuis: acces.created_at,
      }
    : null;

  return <EquipeClient magasin={commerce.name} employe={employe} />;
}
