"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerLaunch, setLaunchDate } from "@/lib/platform-config";
import { sendEmail, emailLancementCommerce, emailLancementClient, type LaunchPhase } from "@/lib/resend";
import { logAuditEvent } from "@/lib/audit-log";

export type LaunchActionResult =
  | { success: true; sent?: number }
  | { success: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return { user };
}

export async function saveLaunchDate(date: string): Promise<LaunchActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: "Format de date invalide." };
  const res = await setLaunchDate(date);
  if (!res.success) return { success: false, error: res.error ?? "Erreur" };
  revalidatePath("/kshare-admin/lancement");
  return { success: true };
}

export async function lancerPlateforme(): Promise<LaunchActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };
  const res = await triggerLaunch(ctx.user.id);
  if (!res.success) return { success: false, error: res.error ?? "Erreur" };
  logAuditEvent({ action: "admin.platform_launched", actor_id: ctx.user.id });
  revalidatePath("/kshare-admin/lancement");
  return { success: true };
}

export async function envoyerEmailsLancement(
  audience: "commerces" | "clients",
  phase: LaunchPhase
): Promise<LaunchActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const admin = createAdminClient();

  // Charge la launch_date pour personnaliser le mail
  const { data: cfg } = await admin
    .from("platform_config")
    .select("launch_date")
    .eq("id", true)
    .single();

  if (!cfg?.launch_date) {
    return { success: false, error: "Définis d'abord la date de lancement." };
  }

  let sent = 0;

  if (audience === "commerces") {
    const { data: commerces } = await admin
      .from("commerces")
      .select("name, email, representative_first_name")
      .eq("status", "validated")
      .not("email", "ilike", "%@kshare.fr");

    for (const c of commerces ?? []) {
      if (!c.email) continue;
      const { subject, html } = emailLancementCommerce({
        commerceName: c.name,
        responsableFirstName: c.representative_first_name,
        launchDate: cfg.launch_date,
        phase,
      });
      const ok = await sendEmail({ to: c.email, subject, html });
      if (ok) sent++;
    }
  } else {
    const { data: clients } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("role", "client")
      .not("email", "ilike", "%@kshare.fr");

    for (const cl of clients ?? []) {
      if (!cl.email) continue;
      const { subject, html } = emailLancementClient({
        clientName: cl.full_name ?? "",
        launchDate: cfg.launch_date,
        phase,
      });
      const ok = await sendEmail({ to: cl.email, subject, html });
      if (ok) sent++;
    }
  }

  logAuditEvent({
    action: "admin.launch_emails_sent",
    actor_id: ctx.user.id,
    metadata: { audience, phase, sent },
  });

  revalidatePath("/kshare-admin/lancement");
  return { success: true, sent };
}
