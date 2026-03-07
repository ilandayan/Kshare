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
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: commerce, error: commerceError } = await supabase
      .from("commerces")
      .select("stripe_account_id")
      .eq("profile_id", user.id)
      .single();

    if (commerceError || !commerce) {
      return NextResponse.json({ error: "Commerce introuvable" }, { status: 404 });
    }

    if (!commerce.stripe_account_id) {
      return NextResponse.json(
        { error: "Aucun compte Stripe Connect associé" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const loginLink = await stripe.accounts.createLoginLink(
      commerce.stripe_account_id
    );

    return NextResponse.redirect(loginLink.url);
  } catch (error) {
    console.error("[stripe/connect/dashboard-link] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
