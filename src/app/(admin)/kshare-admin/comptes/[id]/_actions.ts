"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AccountActionResult =
  | { success: true }
  | { success: false; error: string };

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
  return { supabase, user };
}

export async function validerCompte(
  id: string,
  type: "commerce" | "association"
): Promise<AccountActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase, user } = ctx;

  if (type === "commerce") {
    const { error } = await supabase
      .from("commerces")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        validated_by: user.id,
      })
      .eq("id", id);

    if (error) return { success: false, error: "Erreur lors de la validation." };
  } else {
    const { error } = await supabase
      .from("associations")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        validated_by: user.id,
      })
      .eq("id", id);

    if (error) return { success: false, error: "Erreur lors de la validation." };
  }

  revalidatePath("/kshare-admin/comptes");
  revalidatePath(`/kshare-admin/comptes/${id}`);
  return { success: true };
}

export async function refuserCompte(
  id: string,
  type: "commerce" | "association"
): Promise<AccountActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;

  if (type === "commerce") {
    const { error } = await supabase
      .from("commerces")
      .update({ status: "refused" })
      .eq("id", id);

    if (error) return { success: false, error: "Erreur lors du refus." };
  } else {
    const { error } = await supabase
      .from("associations")
      .update({ status: "refused" })
      .eq("id", id);

    if (error) return { success: false, error: "Erreur lors du refus." };
  }

  revalidatePath("/kshare-admin/comptes");
  revalidatePath(`/kshare-admin/comptes/${id}`);
  return { success: true };
}

export async function demanderComplements(
  id: string,
  type: "commerce" | "association",
  message: string
): Promise<AccountActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  if (!message.trim()) return { success: false, error: "Le message est requis." };

  const { supabase } = ctx;

  if (type === "commerce") {
    const { error } = await supabase
      .from("commerces")
      .update({ status: "complement_required" })
      .eq("id", id);

    if (error) return { success: false, error: "Erreur lors de la mise à jour." };
  } else {
    const { error } = await supabase
      .from("associations")
      .update({ status: "complement_required" })
      .eq("id", id);

    if (error) return { success: false, error: "Erreur lors de la mise à jour." };
  }

  // TODO: envoyer le message par email via Supabase Edge Function ou autre
  // Pour l'instant on log le message
  console.info(`[COMPLÉMENT] ID: ${id} Type: ${type} Message: ${message}`);

  revalidatePath("/kshare-admin/comptes");
  revalidatePath(`/kshare-admin/comptes/${id}`);
  return { success: true };
}
