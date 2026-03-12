import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { checkRateLimit, getClientIp, AUTH_RATE_LIMIT } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting — 30 requests/minute per IP
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`connect-onboard:${ip}`, AUTH_RATE_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer dans quelques instants." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(new URL("/connexion", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
    }

    // Vérifier le rôle commerce
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "commerce") {
      return NextResponse.json({ error: "Accès réservé aux commerçants" }, { status: 403 });
    }

    const { data: commerce, error: commerceError } = await supabase
      .from("commerces")
      .select("id, email, stripe_account_id")
      .eq("profile_id", user.id)
      .single();

    if (commerceError || !commerce) {
      return NextResponse.json({ error: "Commerce introuvable" }, { status: 404 });
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    let accountId = commerce.stripe_account_id;

    // Create Express account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email: commerce.email,
        settings: {
          payouts: {
            schedule: {
              interval: "weekly",
              weekly_anchor: "tuesday",
            },
          },
        },
      });

      accountId = account.id;

      const { error: updateError } = await supabase
        .from("commerces")
        .update({ stripe_account_id: accountId })
        .eq("id", commerce.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Erreur lors de la mise à jour du compte Stripe" },
          { status: 500 }
        );
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${baseUrl}/api/stripe/connect/onboard`,
      return_url: `${baseUrl}/api/stripe/connect/callback`,
    });

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    console.error("[stripe/connect/onboard] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
