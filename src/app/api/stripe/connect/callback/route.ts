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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (userError || !user) {
      return NextResponse.redirect(new URL("/connexion", baseUrl));
    }

    const { data: commerce, error: commerceError } = await supabase
      .from("commerces")
      .select("id, stripe_account_id")
      .eq("profile_id", user.id)
      .single();

    if (commerceError || !commerce || !commerce.stripe_account_id) {
      return NextResponse.redirect(new URL("/shop/stripe-connect", baseUrl));
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(commerce.stripe_account_id);

    // Le webhook `account.updated` reste la source de vérité, mais il peut
    // arriver après ce retour d'onboarding : on synchronise ici pour que le
    // commerçant voie son statut à jour dès la redirection, sans rafraîchir.
    await supabase
      .from("commerces")
      .update({
        stripe_charges_enabled: account.charges_enabled === true,
        stripe_payouts_enabled: account.payouts_enabled === true,
        stripe_details_submitted: account.details_submitted === true,
        stripe_status_updated_at: new Date().toISOString(),
      })
      .eq("id", commerce.id);

    return NextResponse.redirect(new URL("/shop/stripe-connect", baseUrl));
  } catch (error) {
    console.error("[stripe/connect/callback] Error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(new URL("/shop/stripe-connect", baseUrl));
  }
}
