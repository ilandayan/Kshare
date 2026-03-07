import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(new URL("/connexion", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
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
