import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Cron quotidien qui ouvre automatiquement la plateforme à 7h00 heure de Paris
 * si la launch_date correspond à aujourd'hui.
 *
 * Stratégie : Vercel cron est en UTC. On schedule à 5h UTC (= 7h Paris l'été,
 * 6h Paris l'hiver). On vérifie ici l'heure réelle de Paris avant d'agir, pour
 * gérer correctement le passage été/hiver.
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

  // Heure / date courante à Paris
  const now = new Date();
  const parisFmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = parisFmt.formatToParts(now);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const parisToday = `${year}-${month}-${day}`;
  const parisHour = parseInt(hourStr, 10);

  const admin = createAdminClient();
  const { data: cfg, error: cfgErr } = await admin
    .from("platform_config")
    .select("launched, launch_date")
    .eq("id", true)
    .maybeSingle();

  if (cfgErr) {
    return NextResponse.json({ error: cfgErr.message }, { status: 500 });
  }

  // Déjà lancé → no-op
  if (cfg?.launched) {
    return NextResponse.json({ status: "already_launched", parisToday, parisHour });
  }

  // Pas encore l'heure (avant 7h Paris) → no-op (cas DST hiver où le cron tourne à 6h)
  if (parisHour < 7) {
    return NextResponse.json({ status: "too_early", parisToday, parisHour });
  }

  // Pas la bonne date → no-op
  if (cfg?.launch_date !== parisToday) {
    return NextResponse.json({
      status: "not_today",
      launch_date: cfg?.launch_date,
      parisToday,
    });
  }

  // Conditions réunies : on lance
  const { error: updateErr } = await admin
    .from("platform_config")
    .upsert({
      id: true,
      launched: true,
      launched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Log audit
  await admin.from("audit_logs").insert({
    action: "admin.platform_launched",
    actor_id: null,
    metadata: { source: "auto_cron", parisToday, parisHour },
  });

  return NextResponse.json({
    status: "launched",
    parisToday,
    parisHour,
    launched_at: new Date().toISOString(),
  });
}
