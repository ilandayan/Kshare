import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/lib/constants";
import {
  sendEmail,
  emailPaiementEchoue,
  emailConfirmationCommande,
  emailNouvelleCommandeCommerce,
} from "@/lib/resend";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function generatePickupCode(): string {
  // 12-char hex token = 6 bytes = 281 trillion combinations (vs 900K for 6 digits)
  return randomBytes(6).toString("hex").toUpperCase();
}

function computeDonationExpiresAt(
  pickupEnd: string,
  day: string
): string {
  // Build expiration timestamp based on pickup_end + day
  const now = new Date();
  const targetDate =
    day === "tomorrow"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [hours, minutes] = pickupEnd.split(":").map(Number);
  targetDate.setHours(hours, minutes, 0, 0);

  return targetDate.toISOString();
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = createAdminClient();

  const {
    basketId,
    quantity,
    profileId,
    commerceId,
    basketAmount,
    commissionAmount,
    serviceFeeAmount,
    isDonation,
    // Legacy fallback for old metadata format
    totalAmount: legacyTotalAmount,
  } = session.metadata ?? {};

  if (!basketId || !quantity || !profileId || !commerceId) {
    console.error("[webhook] Missing metadata in checkout.session.completed", session.id);
    return;
  }

  const isClientDonation = isDonation === "true";
  const quantityNum = parseInt(quantity, 10);
  if (!Number.isFinite(quantityNum) || quantityNum < 1 || quantityNum > 999) {
    console.error("[webhook] Invalid quantity in metadata:", quantity, session.id);
    return;
  }
  // basketAmount = price of baskets only (without service fee)
  const basketAmountNum = parseInt(basketAmount ?? legacyTotalAmount ?? "0", 10) / 100;
  const commissionAmountNum = parseInt(commissionAmount ?? "0", 10) / 100;
  const serviceFeeAmountNum = parseInt(serviceFeeAmount ?? "0", 10) / 100;

  if (!Number.isFinite(basketAmountNum) || basketAmountNum < 0 || basketAmountNum > 99999) {
    console.error("[webhook] Invalid basketAmount in metadata:", basketAmount, session.id);
    return;
  }
  if (!Number.isFinite(commissionAmountNum) || commissionAmountNum < 0) {
    console.error("[webhook] Invalid commissionAmount in metadata:", commissionAmount, session.id);
    return;
  }

  // Fetch basket info for pickup times + type + commerce name
  const { data: basket, error: basketError } = await supabase
    .from("baskets")
    .select("sold_price, pickup_start, pickup_end, day, type, commerces(name)")
    .eq("id", basketId)
    .single();

  if (basketError || !basket) {
    console.error("[webhook] Basket not found:", basketId);
    return;
  }

  // Fetch client profile for email
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", profileId)
    .single();

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  const netAmountNum =
    Math.round((basketAmountNum - commissionAmountNum) * 100) / 100;

  if (isClientDonation) {
    // Don client: order en attente d'une association
    const donationExpiresAt = computeDonationExpiresAt(
      basket.pickup_end,
      basket.day
    );

    const { error: orderError } = await supabase.from("orders").insert({
      basket_id: basketId,
      client_id: profileId,
      commerce_id: commerceId,
      total_amount: basketAmountNum,
      unit_price: basketAmountNum / quantityNum,
      quantity: quantityNum,
      commission_amount: 0,
      net_amount: basketAmountNum,
      service_fee_amount: serviceFeeAmountNum,
      stripe_payment_intent_id: paymentIntentId,
      status: "pending_association",
      qr_code_token: null,
      is_donation: true,
      capture_status: "pending",
      pickup_start: basket.pickup_start,
      pickup_end: basket.pickup_end,
      pickup_date: basket.day,
      donation_expires_at: donationExpiresAt,
    });

    if (orderError) {
      console.error("[webhook] Failed to create donation order:", orderError);
      return;
    }

    // Atomically increment quantity_reserved
    await supabase.rpc("reserve_basket_quantity", {
      p_basket_id: basketId,
      p_quantity: quantityNum,
    });
  } else {
    // Achat classique
    const pickupCode = generatePickupCode();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        basket_id: basketId,
        client_id: profileId,
        commerce_id: commerceId,
        total_amount: basketAmountNum,
        unit_price: basket.sold_price,
        quantity: quantityNum,
        commission_amount: commissionAmountNum,
        net_amount: netAmountNum,
        service_fee_amount: serviceFeeAmountNum,
        stripe_payment_intent_id: paymentIntentId,
        status: "paid",
        qr_code_token: pickupCode,
        is_donation: false,
        capture_status: "pending",
        pickup_start: basket.pickup_start,
        pickup_end: basket.pickup_end,
        pickup_date: basket.day,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("[webhook] Failed to create order:", orderError);
      return;
    }

    // Aucune écriture comptable ici : cet événement se déclenche à
    // l'autorisation, pas à l'encaissement. Le grand livre est alimenté au
    // moment de la capture, avec le montant réellement prélevé.

    // Fetch real Stripe fee from the charge's balance_transaction
    if (order && paymentIntentId) {
      try {
        const stripe = getStripe();
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge.balance_transaction"],
        });
        const charge = pi.latest_charge as Stripe.Charge | null;
        const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
        if (bt) {
          const stripeFee = bt.fee / 100; // cents → EUR
          await supabase
            .from("orders")
            .update({ stripe_fee_amount: stripeFee })
            .eq("id", order.id);
        }
      } catch (feeErr) {
        // Non-blocking: log but don't fail the webhook
        console.error("[webhook] Failed to fetch Stripe fee:", feeErr);
      }
    }

    // Atomically increment quantity_sold
    await supabase.rpc("increment_basket_sold", {
      p_basket_id: basketId,
      p_quantity: quantityNum,
    });

    // Send confirmation email to client (non-blocking)
    if (clientProfile?.email && order) {
      try {
        const commerceName = (basket as unknown as { commerces: { name: string } | null }).commerces?.name ?? "le commerce";
        const { subject, html } = emailConfirmationCommande({
          clientName: clientProfile.full_name ?? "Client",
          commerceName,
          basketType: (basket as unknown as { type: string }).type ?? "mix",
          quantity: quantityNum,
          totalAmount: basketAmountNum,
          serviceFeeAmount: serviceFeeAmountNum,
          pickupDate: basket.day ?? new Date().toISOString().split("T")[0],
          pickupStart: basket.pickup_start ?? "",
          pickupEnd: basket.pickup_end ?? "",
          orderId: order.id,
        });
        await sendEmail({ to: clientProfile.email, subject, html });
      } catch (emailErr) {
        console.error("[webhook] Failed to send confirmation email:", emailErr);
      }
    }

    // Et au commerçant. Sans cet email il ne découvrait la vente qu'en ouvrant
    // son tableau de bord, et un client pouvait se présenter devant une porte
    // pour un panier que personne n'avait préparé.
    if (order) {
      await previenirCommerceVente(supabase, {
        commerceId,
        basket,
        quantity: quantityNum,
        montantNet: netAmountNum,
        codeRetrait: pickupCode,
      });
    }
  }
}

/**
 * Envoie au commerçant l'avis de vente. Ne lève jamais : un email en échec ne
 * doit pas faire échouer le webhook, sans quoi Stripe le rejouerait et la
 * commande serait créée deux fois.
 */
async function previenirCommerceVente(
  supabase: SupabaseClient,
  params: {
    commerceId: string;
    basket: { type?: string | null; day?: string | null; pickup_start?: string | null; pickup_end?: string | null };
    quantity: number;
    montantNet: number;
    codeRetrait: string;
  },
): Promise<void> {
  try {
    const { data: commerce } = await supabase
      .from("commerces")
      .select("name, email")
      .eq("id", params.commerceId)
      .single();

    if (!commerce?.email) return;

    const { subject, html } = emailNouvelleCommandeCommerce({
      commerceName: commerce.name,
      basketType: params.basket.type ?? "mix",
      quantity: params.quantity,
      montantNet: params.montantNet,
      pickupDay: params.basket.day ?? "",
      pickupStart: params.basket.pickup_start ?? "",
      pickupEnd: params.basket.pickup_end ?? "",
      codeRetrait: params.codeRetrait,
    });

    await sendEmail({ to: commerce.email, subject, html });
  } catch (err) {
    console.error("[webhook] Failed to notify commerce of sale:", err);
  }
}

/**
 * Handle payment_intent.succeeded — confirms orders created by the mobile app.
 * The mobile flow creates an order with status "created" + a PaymentIntent.
 * When Stripe confirms payment, we move the order to "paid", update basket
 * quantities (reserved → sold), and create ledger entries.
 */
/**
 * Confirme une commande mobile dès que le paiement est autorisé.
 *
 * Avec la capture différée, `payment_intent.succeeded` ne survient plus qu'au
 * moment de l'encaissement, le soir. C'est donc
 * `payment_intent.amount_capturable_updated`, émis dès l'autorisation, qui
 * confirme la commande — sans quoi elle resterait en « created » toute la
 * journée, invisible du cron de capture, et le client sans panier réservé.
 *
 * Les deux événements y mènent : la fonction est idempotente, elle ressort si
 * la commande est déjà confirmée.
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const supabase = createAdminClient();

  const { source, basket_id, user_id, quantity, basket_amount, service_fee_amount } =
    paymentIntent.metadata ?? {};

  // Only handle mobile-created PaymentIntents (Checkout sessions have their own handler)
  if (source !== "mobile") return;

  if (!basket_id || !user_id) {
    console.error("[webhook] Missing metadata in payment_intent.succeeded", paymentIntent.id);
    return;
  }

  const quantityNum = parseInt(quantity ?? "1", 10);
  if (!Number.isFinite(quantityNum) || quantityNum < 1 || quantityNum > 999) {
    console.error("[webhook] Invalid quantity in PI metadata:", quantity, paymentIntent.id);
    return;
  }
  const basketAmountNum = parseInt(basket_amount ?? "0", 10) / 100;
  const serviceFeeAmountNum = parseInt(service_fee_amount ?? "0", 10) / 100;

  if (!Number.isFinite(basketAmountNum) || basketAmountNum < 0 || basketAmountNum > 99999) {
    console.error("[webhook] Invalid basket_amount in PI metadata:", basket_amount, paymentIntent.id);
    return;
  }

  // Find the existing order created by the Edge Function
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, quantity")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .single();

  if (orderError || !order) {
    console.error("[webhook] Order not found for PaymentIntent:", paymentIntent.id);
    return;
  }

  // Only confirm orders that are still in "created" status
  if (order.status !== "created") {
    console.info("[webhook] Order already processed:", order.id, order.status);
    return;
  }

  // Update order to "paid"
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id);

  if (updateError) {
    console.error("[webhook] Failed to confirm order:", order.id, updateError);
    return;
  }

  // Atomically move quantities from reserved → sold
  await supabase.rpc("confirm_basket_sold", {
    p_basket_id: basket_id,
    p_quantity: quantityNum,
  });

  // Pas d'écriture comptable ici non plus : la capture s'en charge, avec le
  // montant réellement encaissé, qu'un geste commercial peut avoir réduit.

  // Fetch real Stripe fee
  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntent.id, {
      expand: ["latest_charge.balance_transaction"],
    });
    const charge = pi.latest_charge as Stripe.Charge | null;
    const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
    if (bt) {
      const stripeFee = bt.fee / 100;
      await supabase
        .from("orders")
        .update({ stripe_fee_amount: stripeFee })
        .eq("id", order.id);
    }
  } catch (feeErr) {
    console.error("[webhook] Failed to fetch Stripe fee (mobile):", feeErr);
  }

  // Send confirmation email to client (non-blocking)
  if (user_id) {
    try {
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user_id)
        .single();

      const { data: basket } = await supabase
        .from("baskets")
        .select("type, pickup_start, pickup_end, day, commerces(name)")
        .eq("id", basket_id)
        .single();

      if (clientProfile?.email && basket) {
        const commerceName = (basket as unknown as { commerces: { name: string } | null }).commerces?.name ?? "le commerce";
        const { subject, html } = emailConfirmationCommande({
          clientName: clientProfile.full_name ?? "Client",
          commerceName,
          basketType: (basket as unknown as { type: string }).type ?? "mix",
          quantity: quantityNum,
          totalAmount: basketAmountNum,
          serviceFeeAmount: serviceFeeAmountNum,
          pickupDate: basket.day ?? new Date().toISOString().split("T")[0],
          pickupStart: basket.pickup_start ?? "",
          pickupEnd: basket.pickup_end ?? "",
          orderId: order.id,
        });
        await sendEmail({ to: clientProfile.email, subject, html });
      }
    } catch (emailErr) {
      console.error("[webhook] Failed to send confirmation email (mobile):", emailErr);
    }
  }

  // Et au commerçant. C'est ce chemin-là qu'empruntent les commandes de
  // l'application mobile, donc la quasi-totalité des ventes réelles.
  const { data: detail } = await supabase
    .from("orders")
    .select("commerce_id, net_amount, qr_code_token, is_donation, baskets(type, day, pickup_start, pickup_end)")
    .eq("id", order.id)
    .single();

  // Jamais sur un don. Le paiement d'un don n'est encaissé que si une
  // association confirme la récupération sur place ; sinon l'autorisation est
  // relâchée. Annoncer au commerçant un montant qu'il ne percevra peut-être
  // pas serait faux. Ce chemin ne traite déjà que les commandes en « created »,
  // et un don naît en « pending_association » — mais la garantie ne doit pas
  // tenir au seul enchaînement des statuts.
  if (detail?.commerce_id && !detail.is_donation) {
    const panier = (detail as unknown as {
      baskets: { type: string; day: string; pickup_start: string; pickup_end: string } | null;
    }).baskets;

    await previenirCommerceVente(supabase, {
      commerceId: detail.commerce_id,
      basket: panier ?? {},
      quantity: quantityNum,
      montantNet: detail.net_amount ?? 0,
      codeRetrait: detail.qr_code_token ?? "",
    });
  }

  console.info("[webhook] Mobile order confirmed:", order.id);
}

async function handleSubscriptionCreatedOrUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createAdminClient();

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Fetch commerce with current state BEFORE any updates
  // (needed to distinguish admin-suspend from auto-suspend for non-payment)
  const { data: commerce, error: commerceError } = await supabase
    .from("commerces")
    .select("id, status, subscription_status")
    .eq("stripe_customer_id", customerId)
    .single();

  if (commerceError || !commerce) {
    console.error("[webhook] Commerce not found for customer:", customerId);
    return;
  }

  const previousStatus = commerce.status;
  const previousSubscriptionStatus = commerce.subscription_status;

  const statusMap: Record<string, "active" | "offered" | "unpaid" | "cancellation_requested"> = {
    active: "active",
    trialing: "offered",
    past_due: "unpaid",
    unpaid: "unpaid",
    canceled: "cancellation_requested",
    incomplete: "unpaid",
    incomplete_expired: "unpaid",
    paused: "unpaid",
  };

  const mappedStatus = statusMap[subscription.status] ?? "unpaid";

  const firstItem = subscription.items.data[0];
  const periodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;

  // Determine plan from subscription metadata
  const plan = (subscription.metadata?.plan ?? "pro") as SubscriptionPlanId;
  const planConfig = SUBSCRIPTION_PLANS[plan] ?? SUBSCRIPTION_PLANS.pro;

  // Upsert subscription record
  const { error: upsertError } = await supabase.from("subscriptions").upsert(
    {
      commerce_id: commerce.id,
      stripe_subscription_id: subscription.id,
      status: mappedStatus,
      plan,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      monthly_price: planConfig.monthlyPrice,
      commission_rate: planConfig.commissionRate,
    },
    { onConflict: "commerce_id" }
  );

  if (upsertError) {
    console.error("[webhook] Failed to upsert subscription:", upsertError);
  }

  // Update commerce subscription_status + plan + commission_rate
  await supabase
    .from("commerces")
    .update({
      subscription_status: mappedStatus,
      subscription_plan: plan,
      commission_rate: planConfig.commissionRate,
    })
    .eq("id", commerce.id);

  // When subscription becomes unpaid, record the failure date (suspension handled by cron at J+5)
  if (mappedStatus === "unpaid" && previousSubscriptionStatus !== "unpaid") {
    await supabase
      .from("commerces")
      .update({ payment_failed_at: new Date().toISOString() })
      .eq("id", commerce.id);
  }

  // Auto-restore commerce when subscription becomes active again
  // ONLY if the suspension was caused by non-payment (previous subscription_status was "unpaid")
  // This prevents restoring commerces suspended manually by admin for other reasons
  if (
    (mappedStatus === "active" || mappedStatus === "offered") &&
    previousSubscriptionStatus === "unpaid"
  ) {
    const updates: Record<string, unknown> = { payment_failed_at: null };
    if (previousStatus === "suspended") {
      updates.status = "validated";
    }
    await supabase
      .from("commerces")
      .update(updates)
      .eq("id", commerce.id);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createAdminClient();

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const { data: commerce, error: commerceError } = await supabase
    .from("commerces")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (commerceError || !commerce) {
    console.error("[webhook] Commerce not found for customer:", customerId);
    return;
  }

  // Mark subscription as cancelled — no automatic downgrade to Starter
  await supabase
    .from("subscriptions")
    .update({
      status: "cancellation_requested",
      canceled_at: new Date().toISOString(),
      stripe_subscription_id: null,
    })
    .eq("commerce_id", commerce.id);

  await supabase
    .from("commerces")
    .update({
      subscription_status: "cancellation_requested",
    })
    .eq("id", commerce.id);
}

/**
 * Handle invoice.payment_failed — notify commerce when subscription payment fails.
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  // Only handle subscription invoices
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(invoice as any).subscription) return;

  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer as { id: string } | null)?.id;

  if (!customerId) {
    console.error("[webhook] No customer on failed invoice:", invoice.id);
    return;
  }

  const supabase = createAdminClient();

  // Find the commerce and their profile email
  const { data: commerce, error: commerceError } = await supabase
    .from("commerces")
    .select("id, name, payment_failed_at, profiles!commerces_profile_id_fkey(email)")
    .eq("stripe_customer_id", customerId)
    .single();

  if (commerceError || !commerce) {
    console.error("[webhook] Commerce not found for customer:", customerId);
    return;
  }

  // Record payment_failed_at if not already set
  if (!commerce.payment_failed_at) {
    await supabase
      .from("commerces")
      .update({ payment_failed_at: new Date().toISOString() })
      .eq("id", commerce.id);
  }

  const profile = commerce.profiles as { email: string | null } | null;
  const email = profile?.email;

  if (!email) {
    console.error("[webhook] No email for commerce:", commerce.id);
    return;
  }

  // Format amount from invoice
  const amount = invoice.amount_due
    ? `${(invoice.amount_due / 100).toFixed(2).replace(".", ",")} €`
    : "29,00 €";

  const { subject, html } = emailPaiementEchoue(commerce.name, amount);
  const sent = await sendEmail({ to: email, subject, html });

  if (sent) {
    console.info("[webhook] Payment failure email sent to:", email, "commerce:", commerce.id);
  } else {
    console.error("[webhook] Failed to send payment failure email to:", email);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret non configuré" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Signature Stripe manquante" },
      { status: 400 }
    );
  }

  // Read raw body — do NOT use request.json()
  const rawBody = await request.arrayBuffer();
  const body = Buffer.from(rawBody);

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Signature invalide" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "payment_intent.amount_capturable_updated":
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      // `account.updated` est traité par /api/stripe/webhook/connect, seul
      // endpoint abonné aux événements des comptes connectés. Le handler qui
      // existait ici réécrivait `stripe_account_id` avec sa propre valeur :
      // il ne faisait rien, tout en laissant croire que le cas était couvert.

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionCreatedOrUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      default:
        // Ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[webhook] Error handling event ${event.type}:`, error);
    return NextResponse.json(
      { error: "Erreur lors du traitement de l'événement" },
      { status: 500 }
    );
  }
}
