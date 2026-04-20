"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return { supabase, user };
}

export async function updateProspectStatus(
  prospectId: string,
  status: "new" | "contacted" | "demo_scheduled" | "converted" | "rejected" | "no_response"
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "contacted" || status === "demo_scheduled") {
    update.contacted_at = new Date().toISOString();
  }
  if (status === "converted") {
    update.converted_at = new Date().toISOString();
  }

  const { error } = await ctx.supabase
    .from("prospects")
    .update(update)
    .eq("id", prospectId);

  if (error) return { success: false, error: "Erreur lors de la mise à jour." };

  revalidatePath("/kshare-admin/prospects");
  return { success: true };
}

export async function updateProspectNotes(
  prospectId: string,
  notes: string
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { error } = await ctx.supabase
    .from("prospects")
    .update({
      admin_notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prospectId);

  if (error) return { success: false, error: "Erreur lors de la sauvegarde." };

  revalidatePath("/kshare-admin/prospects");
  return { success: true };
}

export async function deleteProspect(prospectId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { error } = await ctx.supabase
    .from("prospects")
    .delete()
    .eq("id", prospectId);

  if (error) return { success: false, error: "Erreur lors de la suppression." };

  revalidatePath("/kshare-admin/prospects");
  return { success: true };
}
