import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  emailRappelPaiement,
  emailSuspensionCompte,
} from "@/lib/resend";

export const dynamic = "force-dynamic";

/**
 * Cron job pour la gestion des impayés d'abonnement Pro :
 *
 * - J+3 : envoi d'un email de rappel (2 jours restants avant suspension)
 * - J+5 : suspension automatique du compte + email de notification
 *
 * Exécuté quotidiennement via Vercel Cron. Sécurisé par CRON_SECRET.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/subscription-reminders] CRON_SECRET non configuré");
    return NextResponse.json(
      { error: "Configuration manquante" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // Find all commerces with a payment failure
  // Note: payment_failed_at column added via migration, cast needed until types are regenerated
  interface CommerceWithPaymentFailed {
    id: string;
    name: string;
    status: string;
    payment_failed_at: string | null;
    profiles: { email: string | null } | null;
  }

  const { data: rawCommerces, error: fetchError } = await supabase
    .from("commerces")
    .select(
      "id, name, status, payment_failed_at, profiles!commerces_profile_id_fkey(email)"
    )
    .not("payment_failed_at", "is", null);

  if (fetchError) {
    console.error("[cron/subscription-reminders] Fetch error:", fetchError);
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    );
  }

  const commerces = (rawCommerces ?? []) as unknown as CommerceWithPaymentFailed[];

  if (commerces.length === 0) {
    return NextResponse.json({ reminders: 0, suspended: 0 });
  }

  let reminders = 0;
  let suspended = 0;

  for (const commerce of commerces) {
    const email = commerce.profiles?.email;
    if (!email) continue;

    const failedAt = new Date(commerce.payment_failed_at as string);
    const daysSinceFailure = Math.floor(
      (now.getTime() - failedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // J+5 : Suspension automatique
    if (daysSinceFailure >= 5 && commerce.status !== "suspended") {
      // Suspend the commerce
      await supabase
        .from("commerces")
        .update({ status: "suspended" })
        .eq("id", commerce.id);

      // Send suspension email
      const { subject, html } = emailSuspensionCompte(commerce.name);
      await sendEmail({ to: email, subject, html });

      suspended++;
      console.info(
        `[cron/subscription-reminders] Suspended commerce ${commerce.id} (${daysSinceFailure} days unpaid)`
      );
    }
    // J+3 : Email de rappel (only if not already suspended)
    else if (
      daysSinceFailure >= 3 &&
      daysSinceFailure < 4 &&
      commerce.status !== "suspended"
    ) {
      const joursRestants = 5 - daysSinceFailure;
      const { subject, html } = emailRappelPaiement(
        commerce.name,
        joursRestants
      );
      await sendEmail({ to: email, subject, html });

      reminders++;
      console.info(
        `[cron/subscription-reminders] Reminder sent to commerce ${commerce.id} (${daysSinceFailure} days unpaid)`
      );
    }
  }

  return NextResponse.json({ reminders, suspended });
}
