import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, notifyAdmin } from "@/lib/resend";
import { checkRateLimit, getClientIp, PUBLIC_RATE_LIMIT } from "@/lib/rate-limit";
import { buildProspectWelcomeEmail, buildProspectAdminNotification } from "@/lib/prospects-email";

const VALID_COMMERCE_TYPES = [
  "boucherie",
  "boulangerie",
  "epicerie",
  "supermarche",
  "restaurant",
  "traiteur",
  "autre",
];

const VALID_PLANS = ["undecided", "starter", "pro"];

/**
 * POST /api/prospects
 *
 * Flux :
 * 1. Rate limiting anti-spam
 * 2. Validation
 * 3. Stockage en base (table prospects)
 * 4. Email auto au prospect avec plaquette
 * 5. Notification admin
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`prospects:${ip}`, PUBLIC_RATE_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer dans quelques instants." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      companyName?: string;
      commerceType?: string;
      city?: string;
      postalCode?: string;
      planInterest?: string;
      message?: string;
    };

    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim() || undefined;
    const companyName = body.companyName?.trim();
    const commerceType = body.commerceType?.trim().toLowerCase();
    const city = body.city?.trim();
    const postalCode = body.postalCode?.trim() || undefined;
    const planInterest = body.planInterest?.trim().toLowerCase() || "undecided";
    const message = body.message?.trim() || undefined;

    // ── Validation ──
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Prénom et nom sont requis." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }
    if (!companyName) {
      return NextResponse.json({ error: "Nom du commerce requis." }, { status: 400 });
    }
    if (!commerceType || !VALID_COMMERCE_TYPES.includes(commerceType)) {
      return NextResponse.json({ error: "Type de commerce invalide." }, { status: 400 });
    }
    if (!city) {
      return NextResponse.json({ error: "Ville requise." }, { status: 400 });
    }
    if (!VALID_PLANS.includes(planInterest)) {
      return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
    }

    // ── Stockage ──
    const supabase = createAdminClient();
    const { data: prospect, error: insertError } = await supabase
      .from("prospects")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        company_name: companyName,
        commerce_type: commerceType,
        city,
        postal_code: postalCode,
        plan_interest: planInterest === "undecided" ? "undecided" : planInterest,
        message,
        status: "new",
        source: "site_web",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[prospects] Insert error:", insertError.message);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement. Veuillez réessayer." },
        { status: 500 }
      );
    }

    // ── Email de bienvenue au prospect (plaquette complète) ──
    const welcomeEmail = buildProspectWelcomeEmail({
      firstName,
      companyName,
      commerceType,
    });

    const emailPromise = sendEmail({
      to: email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
    });

    // ── Notification admin ──
    const adminEmail = buildProspectAdminNotification({
      firstName,
      lastName,
      email,
      phone,
      companyName,
      commerceType,
      city,
      postalCode,
      planInterest,
      message,
    });

    const adminPromise = notifyAdmin({
      subject: adminEmail.subject,
      html: adminEmail.html,
      replyTo: email,
    });

    // Non-bloquant
    await Promise.allSettled([emailPromise, adminPromise]);

    return NextResponse.json({
      success: true,
      prospectId: prospect?.id,
    });
  } catch (err) {
    console.error("[prospects] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur serveur. Veuillez réessayer plus tard." },
      { status: 500 }
    );
  }
}
