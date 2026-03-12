"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, emailCompteValide, emailCompteRefuse, emailDemandeComplements } from "@/lib/resend";
import { logAuditEvent } from "@/lib/audit-log";

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

  let accountEmail: string | null = null;
  let accountName: string | null = null;

  if (type === "commerce") {
    const { data: commerce, error } = await supabase
      .from("commerces")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        validated_by: user.id,
      })
      .eq("id", id)
      .select("name, email")
      .single();

    if (error) return { success: false, error: "Erreur lors de la validation." };
    accountEmail = commerce?.email ?? null;
    accountName = commerce?.name ?? null;
  } else {
    const { data: asso, error } = await supabase
      .from("associations")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        validated_by: user.id,
      })
      .eq("id", id)
      .select("name, profile_id")
      .single();

    if (error) return { success: false, error: "Erreur lors de la validation." };
    accountName = asso?.name ?? null;

    // Get email from profile
    if (asso?.profile_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", asso.profile_id)
        .single();
      accountEmail = profile?.email ?? null;
    }
  }

  // Send notification email
  if (accountEmail && accountName) {
    const { subject, html } = emailCompteValide(accountName, type);
    await sendEmail({ to: accountEmail, subject, html });
  }

  logAuditEvent({
    action: "admin.validate_account",
    actor_id: user.id,
    target_id: id,
    metadata: { type, accountName },
  });

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
  let accountEmail: string | null = null;
  let accountName: string | null = null;

  if (type === "commerce") {
    const { data: commerce, error } = await supabase
      .from("commerces")
      .update({ status: "refused" })
      .eq("id", id)
      .select("name, email")
      .single();

    if (error) return { success: false, error: "Erreur lors du refus." };
    accountEmail = commerce?.email ?? null;
    accountName = commerce?.name ?? null;
  } else {
    const { data: asso, error } = await supabase
      .from("associations")
      .update({ status: "refused" })
      .eq("id", id)
      .select("name, profile_id")
      .single();

    if (error) return { success: false, error: "Erreur lors du refus." };
    accountName = asso?.name ?? null;

    if (asso?.profile_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", asso.profile_id)
        .single();
      accountEmail = profile?.email ?? null;
    }
  }

  // Send notification email
  if (accountEmail && accountName) {
    const { subject, html } = emailCompteRefuse(accountName, type);
    await sendEmail({ to: accountEmail, subject, html });
  }

  logAuditEvent({
    action: "admin.reject_account",
    actor_id: ctx.user.id,
    target_id: id,
    metadata: { type, accountName },
  });

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

  let accountEmail: string | null = null;
  let accountName: string | null = null;

  if (type === "commerce") {
    const { data: commerce, error } = await supabase
      .from("commerces")
      .update({ status: "complement_required" })
      .eq("id", id)
      .select("name, email")
      .single();

    if (error) return { success: false, error: "Erreur lors de la mise à jour." };
    accountEmail = commerce?.email ?? null;
    accountName = commerce?.name ?? null;
  } else {
    const { data: asso, error } = await supabase
      .from("associations")
      .update({ status: "complement_required" })
      .eq("id", id)
      .select("name, profile_id")
      .single();

    if (error) return { success: false, error: "Erreur lors de la mise à jour." };
    accountName = asso?.name ?? null;

    if (asso?.profile_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", asso.profile_id)
        .single();
      accountEmail = profile?.email ?? null;
    }
  }

  // Send notification email with complement request
  if (accountEmail && accountName) {
    const { subject, html } = emailDemandeComplements(accountName, type, message);
    await sendEmail({ to: accountEmail, subject, html });
  }

  logAuditEvent({
    action: "admin.request_info",
    actor_id: ctx.user.id,
    target_id: id,
    metadata: { type, accountName },
  });

  revalidatePath("/kshare-admin/comptes");
  revalidatePath(`/kshare-admin/comptes/${id}`);
  return { success: true };
}
