import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLancementCommerce, emailLancementClient, type LaunchPhase } from "@/lib/resend";

export const dynamic = "force-dynamic";

/**
 * Cron quotidien qui envoie automatiquement les emails de lancement
 * à J-7, J-1 et J0 selon la launch_date.
 *
 * Schedule recommandé : 0 9 * * * (9h UTC ≈ 10h ou 11h Paris).
 * Idempotent : marque emails_sent_jX dans platform_config pour ne pas renvoyer.
 *
 * Sécurisé par CRON_SECRET.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: cfg } = await admin
    .from("platform_config")
    .select("launch_date, emails_sent_j7, emails_sent_j1, emails_sent_j0")
    .eq("id", true)
    .maybeSingle();

  if (!cfg?.launch_date) {
    return NextResponse.json({ status: "no_launch_date" });
  }

  // Date Paris (YYYY-MM-DD)
  const parisFmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = parisFmt.formatToParts(new Date());
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const parisToday = `${year}-${month}-${day}`;

  // Diff jours
  const launch = new Date(cfg.launch_date + "T00:00:00");
  const today = new Date(parisToday + "T00:00:00");
  const diffDays = Math.round((launch.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Mapping diff → phase
  let phase: LaunchPhase | null = null;
  let alreadySentField: "emails_sent_j7" | "emails_sent_j1" | "emails_sent_j0" | null = null;
  if (diffDays === 7) {
    phase = "j7";
    alreadySentField = "emails_sent_j7";
  } else if (diffDays === 1) {
    phase = "j1";
    alreadySentField = "emails_sent_j1";
  } else if (diffDays === 0) {
    phase = "j0";
    alreadySentField = "emails_sent_j0";
  }

  if (!phase || !alreadySentField) {
    return NextResponse.json({
      status: "no_phase_today",
      diffDays,
      parisToday,
      launch_date: cfg.launch_date,
    });
  }

  if (cfg[alreadySentField]) {
    return NextResponse.json({
      status: "already_sent",
      phase,
      sent_at: cfg[alreadySentField],
    });
  }

  // Envoi aux commerces
  const { data: commerces } = await admin
    .from("commerces")
    .select("name, email, representative_first_name")
    .eq("status", "validated")
    .not("email", "ilike", "%@kshare.fr");

  let commercesSent = 0;
  for (const c of commerces ?? []) {
    if (!c.email) continue;
    const { subject, html } = emailLancementCommerce({
      commerceName: c.name,
      responsableFirstName: c.representative_first_name,
      launchDate: cfg.launch_date,
      phase,
    });
    const ok = await sendEmail({ to: c.email, subject, html });
    if (ok) commercesSent++;
  }

  // Envoi aux clients
  const { data: clients } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("role", "client")
    .not("email", "ilike", "%@kshare.fr");

  let clientsSent = 0;
  for (const cl of clients ?? []) {
    if (!cl.email) continue;
    const { subject, html } = emailLancementClient({
      clientName: cl.full_name ?? "",
      launchDate: cfg.launch_date,
      phase,
    });
    const ok = await sendEmail({ to: cl.email, subject, html });
    if (ok) clientsSent++;
  }

  // Marque comme envoyé (idempotence)
  await admin
    .from("platform_config")
    .update({ [alreadySentField]: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", true);

  // Audit
  await admin.from("audit_logs").insert({
    action: "admin.launch_emails_sent",
    actor_id: null,
    metadata: { source: "auto_cron", phase, commerces: commercesSent, clients: clientsSent },
  });

  return NextResponse.json({
    status: "sent",
    phase,
    commerces: commercesSent,
    clients: clientsSent,
  });
}
