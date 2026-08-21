import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Qui est qui sur un magasin.
 *
 * Trois niveaux. Le **propriétaire** est le responsable du magasin : il signe
 * le contrat, détient l'IBAN, pilote Stripe, gère les comptes de son équipe et
 * voit tous les chiffres. L'**employé** publie des paniers, traite les commandes
 * et scanne les retraits, sans accéder à aucun montant. La **direction** d'une
 * enseigne ne passe pas par ici : elle lit tout un réseau depuis `/groupe`,
 * sans jamais pouvoir agir sur un magasin.
 */
export type RoleMagasin = "proprietaire" | "employe";

/** Les rôles qui donnent accès aux comptes du magasin. */
export function voitLesComptes(role: RoleMagasin | null): boolean {
  return role === "proprietaire";
}

/**
 * Les magasins pour lesquels l'utilisateur courant peut agir.
 *
 * Chercher son magasin par `profile_id` ne trouve que le propriétaire, et
 * laisse l'équipe du soir devant une page vide. La résolution est faite en base
 * par `mes_commerces()`, la même fonction qui sert aux politiques RLS : une
 * seule définition de « mon magasin », donc pas de divergence possible entre
 * ce que l'écran affiche et ce que la base autorise.
 */
export async function mesCommerceIds(
  supabase: SupabaseClient<Database>,
): Promise<string[]> {
  return await appeler(supabase, "mes_commerces");
}

/**
 * Les magasins dont l'utilisateur courant peut consulter les comptes.
 *
 * Le propriétaire, lui seul. Un employé obtient une liste vide, et les écrans
 * financiers n'ont donc rien à lui montrer — ce que le RLS confirme de son
 * côté.
 */
export async function mesCommerceGeresIds(
  supabase: SupabaseClient<Database>,
): Promise<string[]> {
  return await appeler(supabase, "mes_commerces_geres");
}

async function appeler(
  supabase: SupabaseClient<Database>,
  fonction: "mes_commerces" | "mes_commerces_geres",
): Promise<string[]> {
  const { data, error } = await supabase.rpc(fonction);

  if (error) {
    console.error(`[commerce-courant] ${fonction} :`, error.message);
    return [];
  }

  // `RETURNS SETOF uuid` remonte une liste de scalaires ; on la normalise sans
  // rien supposer de la forme exacte renvoyée par PostgREST.
  if (!Array.isArray(data)) return [];
  return data
    .map((v) => (typeof v === "string" ? v : (v as Record<string, string>)?.[fonction]))
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

/**
 * Le rôle de l'utilisateur courant sur son magasin, et lequel.
 *
 * Renvoie `null` s'il n'en exploite aucun — un client, ou une direction
 * d'enseigne qui n'a de droits que sur `/groupe`.
 */
export async function monAccesMagasin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ commerceId: string; role: RoleMagasin } | null> {
  const { data: possede } = await supabase
    .from("commerces")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (possede) return { commerceId: possede.id, role: "proprietaire" };

  const { data: delegue } = await supabase
    .from("commerce_acces")
    .select("commerce_id, role")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!delegue) return null;

  return { commerceId: delegue.commerce_id, role: "employe" };
}
