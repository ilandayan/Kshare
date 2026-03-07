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

    // If account is fully configured (charges enabled), update commerce status
    if (account.charges_enabled) {
      await supabase
        .from("commerces")
        .update({ stripe_account_id: commerce.stripe_account_id })
        .eq("id", commerce.id);
    }

    return NextResponse.redirect(new URL("/shop/stripe-connect", baseUrl));
  } catch (error) {
    console.error("[stripe/connect/callback] Error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(new URL("/shop/stripe-connect", baseUrl));
  }
}
