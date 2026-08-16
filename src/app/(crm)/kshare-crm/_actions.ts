"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CrmActionResult = { success: true } | { success: false; error: string };

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
export const STATUTS_PROSPECT = [
  "new",
  "contacted",
  "to_call_back",
  "demo_scheduled",
  "converted",
  "rejected",
  "no_response",
  "wrong_number",
  "do_not_contact",
  "closed",
] as const;

export type StatutProspect = (typeof STATUTS_PROSPECT)[number];

/**
 * Change le statut d'un prospect et en garde la trace.
 *
 * Le changement est journalisé comme activité : sans historique, on ne sait
 * plus si un « sans réponse » date d'hier ou de trois mois, et on rappelle au
 * mauvais moment.
 */
export async function changerStatutProspect(
  prospectId: string,
  statut: StatutProspect,
  commentaire?: string,
): Promise<CrmActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };
  if (!STATUTS_PROSPECT.includes(statut)) {
    return { success: false, error: "Statut inconnu." };
  }

  const supabase = createAdminClient();
  const maintenant = new Date().toISOString();

  const champs: Record<string, unknown> = { status: statut, updated_at: maintenant };
  // Un prospect qu'on vient de joindre ne doit plus remonter dans la file du
  // jour : on horodate le contact, et on convertit s'il s'inscrit.
  if (["contacted", "to_call_back", "demo_scheduled", "no_response"].includes(statut)) {
    champs.contacted_at = maintenant;
  }
  if (statut === "converted") champs.converted_at = maintenant;

  const { error } = await supabase.from("prospects").update(champs).eq("id", prospectId);
  if (error) return { success: false, error: "Erreur lors du changement de statut." };

  await supabase.from("prospect_activities").insert({
    prospect_id: prospectId,
    type: "statut",
    content: commentaire?.trim() || `Statut changé en « ${statut} »`,
    outcome: statut,
    created_by: ctx.user.id,
  });

  revalidatePath("/kshare-crm");
  return { success: true };
}

/** Consigne un appel, un email ou une note libre. */
export async function ajouterActivite(
  prospectId: string,
  type: "appel" | "email" | "note" | "rdv",
  contenu: string,
  direction?: "sortant" | "entrant",
): Promise<CrmActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };
  if (!contenu?.trim()) return { success: false, error: "Le contenu est vide." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("prospect_activities").insert({
    prospect_id: prospectId,
    type,
    direction: direction ?? (type === "note" ? null : "sortant"),
    content: contenu.trim(),
    created_by: ctx.user.id,
  });
  if (error) return { success: false, error: "Erreur lors de l'enregistrement." };

  // Un appel ou un email vaut contact : la date sert à trier la file de travail.
  if (type === "appel" || type === "email") {
    await supabase
      .from("prospects")
      .update({ contacted_at: new Date().toISOString() })
      .eq("id", prospectId);
  }

  revalidatePath("/kshare-crm");
  return { success: true };
}

/**
 * Programme une relance. C'est ce qui transforme une liste en file de travail :
 * sans date de prochaine action, on rappelle au hasard.
 */
export async function planifierRelance(
  prospectId: string,
  date: string | null,
): Promise<CrmActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("prospects")
    .update({ next_action_at: date })
    .eq("id", prospectId);
  if (error) return { success: false, error: "Erreur lors de la planification." };

  if (date) {
    await supabase.from("prospect_activities").insert({
      prospect_id: prospectId,
      type: "note",
      content: `Relance programmée au ${new Date(date).toLocaleDateString("fr-FR")}`,
      created_by: ctx.user.id,
    });
  }

  revalidatePath("/kshare-crm");
  return { success: true };
}

/** Met à jour les coordonnées d'un prospect enrichies pendant un appel. */
export async function modifierProspect(
  prospectId: string,
  champs: {
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    admin_notes?: string | null;
  },
): Promise<CrmActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const nettoyes = Object.fromEntries(
    Object.entries(champs).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v]),
  );

  const { error } = await createAdminClient()
    .from("prospects")
    .update({ ...nettoyes, updated_at: new Date().toISOString() })
    .eq("id", prospectId);

  if (error) return { success: false, error: "Erreur lors de l'enregistrement." };

  revalidatePath("/kshare-crm");
  return { success: true };
}
