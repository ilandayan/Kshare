"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LeadActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return { user };
}

/** Statuts autorisés, alignés sur la contrainte de la table. */
export const STATUTS_LEAD = ["new", "contacted", "registered", "rejected"] as const;
export type StatutLead = (typeof STATUTS_LEAD)[number];

/**
 * Fait avancer une association recommandée par un commerçant.
 *
 * `handled_at` se pose dès qu'on sort de « transmise » : sans cette date, on ne
 * distingue plus une recommandation d'hier d'une recommandation de trois mois
 * oublié de rappeler.
 */
export async function changerStatutLead(
  leadId: string,
  statut: StatutLead,
  notes?: string,
): Promise<LeadActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };
  if (!STATUTS_LEAD.includes(statut)) return { success: false, error: "Statut inconnu." };

  const supabase = createAdminClient();
  const maj: Record<string, unknown> = {
    status: statut,
    handled_at: statut === "new" ? null : new Date().toISOString(),
  };
  if (notes !== undefined) maj.notes = notes.trim() || null;

  const { error } = await supabase.from("association_leads").update(maj).eq("id", leadId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/kshare-crm/associations");
  return { success: true };
}

/**
 * Géocode une association déjà inscrite dont l'adresse n'a jamais été résolue.
 *
 * Sans coordonnées, une association ne voit aucun panier : le rayon de 50 km se
 * calcule contre `NULL` et la comparaison échoue. C'est le rattrapage manuel de
 * ce que fait l'inscription.
 */
export async function geocoderAssociation(
  associationId: string,
): Promise<LeadActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { data: asso } = await supabase
    .from("associations")
    .select("id, address, city")
    .eq("id", associationId)
    .single();

  if (!asso) return { success: false, error: "Association introuvable." };

  const { geocoderAdresse } = await import("@/lib/geocode");
  try {
    const coords = await geocoderAdresse(asso.address, null, asso.city);
    const { error } = await supabase
      .from("associations")
      .update({
        latitude: coords.latitude,
        longitude: coords.longitude,
        geocoded_at: new Date().toISOString(),
      })
      .eq("id", associationId);

    if (error) return { success: false, error: error.message };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Géocodage impossible.",
    };
  }

  revalidatePath("/kshare-crm/associations");
  return { success: true };
}
