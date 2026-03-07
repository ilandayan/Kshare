import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, calculateCommission } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

interface CheckoutRequestBody {
  basketId: string;
  quantity: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    let body: CheckoutRequestBody;
    try {
      body = (await request.json()) as CheckoutRequestBody;
    } catch {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const { basketId, quantity } = body;

    if (!basketId || typeof basketId !== "string") {
      return NextResponse.json({ error: "basketId requis" }, { status: 400 });
    }
    if (!quantity || typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json({ error: "quantity invalide" }, { status: 400 });
    }

    // Fetch basket with commerce
    const { data: basket, error: basketError } = await supabase
      .from("baskets")
      .select(
        "id, sold_price, type, description, commerce_id, quantity_total, quantity_sold, quantity_reserved, status, pickup_start, pickup_end, pickup_date:day, commerces(id, name, stripe_account_id, commission_rate, email)"
      )
      .eq("id", basketId)
      .single();

    if (basketError || !basket) {
      return NextResponse.json({ error: "Panier introuvable" }, { status: 404 });
    }

    if (basket.status !== "published") {
      return NextResponse.json({ error: "Ce panier n'est plus disponible" }, { status: 400 });
    }

    const availableQty =
      basket.quantity_total - basket.quantity_sold - basket.quantity_reserved;
    if (quantity > availableQty) {
      return NextResponse.json(
        { error: `Quantité insuffisante — ${availableQty} disponible(s)` },
        { status: 400 }
      );
    }

    const commerce = basket.commerces as {
      id: string;
      name: string;
      stripe_account_id: string | null;
      commission_rate: number;
      email: string;
    } | null;

    if (!commerce) {
      return NextResponse.json({ error: "Commerce introuvable" }, { status: 404 });
    }

    if (!commerce.stripe_account_id) {
      return NextResponse.json(
        { error: "Ce commerce n'a pas encore configuré son compte de paiement" },
        { status: 400 }
      );
    }

    const totalAmount = basket.sold_price * quantity;
    const { commission } = calculateCommission(totalAmount, commerce.commission_rate);
    const commissionInCents = Math.round(commission * 100);
    const totalInCents = Math.round(totalAmount * 100);

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const basketTypeLabels: Record<string, string> = {
      bassari: "Panier Bassari",
      halavi: "Panier Halavi",
      parve: "Panier Parvé",
      shabbat: "Panier Shabbat",
      mix: "Panier Mix",
    };
    const basketLabel = basketTypeLabels[basket.type] ?? "Panier";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${basketLabel} — ${commerce.name}`,
              description: basket.description ?? undefined,
            },
            unit_amount: Math.round(basket.sold_price * 100),
          },
          quantity,
        },
      ],
      payment_intent_data: {
        application_fee_amount: commissionInCents,
        transfer_data: {
          destination: commerce.stripe_account_id,
        },
      },
      mode: "payment",
      metadata: {
        basketId,
        quantity: String(quantity),
        profileId: user.id,
        commerceId: commerce.id,
        totalAmount: String(totalInCents),
        commissionAmount: String(commissionInCents),
      },
      success_url: `${baseUrl}/shop/paniers/orders?success=1`,
      cancel_url: `${baseUrl}/shop/paniers`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/checkout] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
