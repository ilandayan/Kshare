import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  emailLancementCommerce,
  emailLancementClient,
  emailLancementAssociation,
  type LaunchPhase,
} from "@/lib/resend";

export const dynamic = "force-dynamic";

/**
 * Cron quotidien envois automatiques des emails de lancement.
 *
 * Schedule Vercel : tourne à 5h, 6h, 8h, 9h UTC.
 * Logique interne (heure Paris) :
 *   - 7h Paris → commerces uniquement
 *   - 10h Paris → clients + associations
 * Idempotent : marque emails_sent_jX_commerces / _users dans platform_config.
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
    .select(
      "launch_date, emails_sent_j7_commerces, emails_sent_j1_commerces, emails_sent_j0_commerces, emails_sent_j7_users, emails_sent_j1_users, emails_sent_j0_users"
    )
    .eq("id", true)
    .maybeSingle();

  if (!cfg?.launch_date) return NextResponse.json({ status: "no_launch_date" });

  // Heure / date Paris
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const parisToday = `${year}-${month}-${day}`;

  // Diff jours
  const launch = new Date(cfg.launch_date + "T00:00:00");
  const today = new Date(parisToday + "T00:00:00");
  const diffDays = Math.round((launch.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let phase: LaunchPhase | null = null;
  if (diffDays === 7) phase = "j7";
  else if (diffDays === 1) phase = "j1";
  else if (diffDays === 0) phase = "j0";
  if (!phase) {
    return NextResponse.json({ status: "no_phase_today", diffDays, parisToday });
  }

  // Choix de l'audience selon l'heure Paris
  let audience: "commerces" | "users" | null = null;
  if (hour === 7) audience = "commerces";
  else if (hour === 10) audience = "users";
  if (!audience) {
    return NextResponse.json({ status: "out_of_window", hour, parisToday });
  }

  const sentField = `emails_sent_${phase}_${audience}` as const;
  if (cfg[sentField]) {
    return NextResponse.json({ status: "already_sent", phase, audience, sent_at: cfg[sentField] });
  }

  // Envoi
  if (audience === "commerces") {
    const { data: commerces } = await admin
      .from("commerces")
      .select("name, email, representative_first_name")
      .eq("status", "validated")
      .not("email", "ilike", "%@kshare.fr");

    let sent = 0;
    for (const c of commerces ?? []) {
      if (!c.email) continue;
      const { subject, html } = emailLancementCommerce({
        commerceName: c.name,
        responsableFirstName: c.representative_first_name,
        launchDate: cfg.launch_date,
        phase,
      });
      if (await sendEmail({ to: c.email, subject, html })) sent++;
    }

    await admin
      .from("platform_config")
      .update({ [sentField]: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", true);

    await admin.from("audit_logs").insert({
      action: "admin.launch_emails_sent",
      actor_id: null,
      metadata: { source: "auto_cron", phase, audience, sent },
    });

    return NextResponse.json({ status: "sent", phase, audience, sent });
  }

  // audience === "users" → clients + associations
  const [{ data: clients }, { data: assos }] = await Promise.all([
    admin
      .from("profiles")
      .select("email, full_name")
      .eq("role", "client")
      .not("email", "ilike", "%@kshare.fr"),
    admin
      .from("associations")
      .select("name, email, representative_first_name")
      .eq("status", "validated")
      .not("email", "ilike", "%@kshare.fr"),
  ]);

  let clientsSent = 0;
  for (const cl of clients ?? []) {
    if (!cl.email) continue;
    const { subject, html } = emailLancementClient({
      clientName: cl.full_name ?? "",
      launchDate: cfg.launch_date,
      phase,
    });
    if (await sendEmail({ to: cl.email, subject, html })) clientsSent++;
  }

  let assosSent = 0;
  for (const a of assos ?? []) {
    if (!a.email) continue;
    const { subject, html } = emailLancementAssociation({
      assoName: a.name,
      responsableFirstName: a.representative_first_name,
      launchDate: cfg.launch_date,
      phase,
    });
    if (await sendEmail({ to: a.email, subject, html })) assosSent++;
  }

  await admin
    .from("platform_config")
    .update({ [sentField]: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", true);

  await admin.from("audit_logs").insert({
    action: "admin.launch_emails_sent",
    actor_id: null,
    metadata: { source: "auto_cron", phase, audience, clients: clientsSent, associations: assosSent },
  });

  return NextResponse.json({
    status: "sent",
    phase,
    audience,
    clients: clientsSent,
    associations: assosSent,
  });
}
