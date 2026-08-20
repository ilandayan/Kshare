import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Les magasins pour lesquels l'utilisateur courant peut agir.
 *
 * Un magasin a un propriétaire — `commerces.profile_id`, celui qui signe le
 * contrat et perçoit les virements — et, depuis la migration
 * 20260821000002, d'éventuels comptes délégués pour l'équipe. Chercher son
 * magasin par `profile_id` ne trouve donc plus que le premier cas, et laisse
 * l'équipe du soir devant une page vide.
 *
 * La résolution est faite en base par `mes_commerces()`, la même fonction qui
 * sert aux politiques RLS. Une seule définition de « mon magasin » : si l'accès
 * est refusé par le RLS, il l'est aussi ici, et inversement.
 */
export async function mesCommerceIds(
  supabase: SupabaseClient<Database>,
): Promise<string[]> {
  const { data, error } = await supabase.rpc("mes_commerces");

  if (error) {
    console.error("[commerce-courant] mes_commerces :", error.message);
    return [];
  }

  // `RETURNS SETOF uuid` remonte une liste de scalaires ; on la normalise sans
  // rien supposer de la forme exacte renvoyée par PostgREST.
  if (!Array.isArray(data)) return [];
  return data
    .map((v) => (typeof v === "string" ? v : (v as { mes_commerces?: string })?.mes_commerces))
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}
