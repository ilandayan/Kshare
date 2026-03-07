import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
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
      .select("id, name, email, stripe_customer_id, subscription_status")
      .eq("profile_id", user.id)
      .single();

    if (commerceError || !commerce) {
      return NextResponse.json({ error: "Commerce introuvable" }, { status: 404 });
    }

    const stripe = getStripe();
    let customerId = commerce.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: commerce.email,
        name: commerce.name,
        metadata: {
          commerce_id: commerce.id,
          profile_id: user.id,
        },
      });
      customerId = customer.id;

      const { error: updateError } = await supabase
        .from("commerces")
        .update({ stripe_customer_id: customerId })
        .eq("id", commerce.id);

      if (updateError) {
        console.error("[stripe/subscription/create] Failed to save customer ID:", updateError);
      }
    }

    // Create SetupIntent for SEPA Direct Debit
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["sepa_debit"],
      metadata: {
        commerce_id: commerce.id,
        profile_id: user.id,
      },
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error("[stripe/subscription/create] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
