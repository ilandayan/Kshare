import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailBienvenue } from "@/lib/resend";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/send-confirmation
 *
 * Generates a Supabase Auth confirmation link and sends a branded
 * welcome email via Resend. Called from the mobile app after signUp().
 *
 * Body: { email: string, name: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Generate a confirmation link via Supabase Admin API
    // generateLink for signup requires a password but we use a dummy one
    // since the user already has an account — we just need the confirmation link
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "signup",
        email,
        password: crypto.randomUUID(),
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://k-share.fr"}/api/auth/callback?next=/`,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[send-confirmation] Failed to generate link:", linkError);
      return NextResponse.json(
        { error: "Impossible de générer le lien de confirmation" },
        { status: 500 }
      );
    }

    // Send branded welcome email via Resend
    const { subject, html } = emailBienvenue({
      name: name || "Utilisateur",
      confirmationLink: linkData.properties.action_link,
    });

    const sent = await sendEmail({ to: email, subject, html });

    if (!sent) {
      return NextResponse.json(
        { error: "Échec de l'envoi de l'email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-confirmation] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
