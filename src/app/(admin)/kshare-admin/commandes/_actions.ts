"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import {
  capturerCommande,
  annulerAutorisation,
  type OrderForCapture,
} from "@/lib/stripe/capture";
import { sendEmail, emailPaiementAjuste, emailDecisionSignalement } from "@/lib/resend";
import { logAuditEvent } from "@/lib/audit-log";
import type { Database } from "@/types/database.types";

/** Colonne jsonb : Supabase attend son propre type Json, pas un tableau d'objets. */
type Json = Database["public"]["Tables"]["support_tickets"]["Row"]["messages"];

export type AdminOrderActionResult =
  | { success: true }
  | { success: false; error: string };

const COLONNES_CAPTURE =
  "id, status, capture_status, stripe_payment_intent_id, total_amount, service_fee_amount, commission_amount, commerce_id, client_id, created_at";

/**
 * Répond au client sur son signalement : message dans son fil de discussion,
 * clôture du ticket, et email.
 *
 * Un client sans réponse ne signale plus, il conteste auprès de sa banque. La
 * réponse est donc autant du service que la protection du taux de litiges.
 * Non bloquant : la décision de paiement prime sur la notification.
 */
async function informerClient(
  orderId: string,
  clientId: string | null,
  adminId: string,
  decision: "maintenu" | "partiel" | "annule",
  montantDebite: number,
  montantInitial: number,
  motif?: string,
): Promise<void> {
  const supabase = createAdminClient();
  const maintenant = new Date().toISOString();

  const textes: Record<typeof decision, string> = {
    maintenu:
      "Après vérification, nous n'avons pas pu retenir votre demande. Si vous disposez d'éléments complémentaires, une photo par exemple, répondez ici : nous réexaminerons le dossier.",
    partiel: `Votre signalement a été retenu. Vous n'avez été débité que de ${montantDebite
      .toFixed(2)
      .replace(".", ",")} € au lieu de ${montantInitial.toFixed(2).replace(".", ",")} €.`,
    annule:
      "Votre commande a été annulée et vous n'avez pas été débité. Le montant réservé sur votre moyen de paiement est libéré.",
  };
  const contenu = motif ? `${textes[decision]}\n\nMotif : ${motif}` : textes[decision];

  try {
    // Le fil de discussion est le canal que le client consulte : on y répond,
    // et on clôt le ticket dans la foulée.
    const { data: tickets } = await supabase
      .from("support_tickets")
      .select("id, messages")
      .eq("order_id", orderId)
      .in("status", ["open", "in_progress"]);

    for (const ticket of tickets ?? []) {
      const existants = (ticket.messages ?? []) as Array<Record<string, unknown>>;
      const messages = [
        ...existants,
        {
          role: "admin",
          sender: "admin",
          name: "Équipe Kshare",
          author_id: adminId,
          content: contenu,
          text: contenu,
          created_at: maintenant,
        },
      ] as unknown as Json;

      await supabase
        .from("support_tickets")
        .update({
          messages,
          status: "resolved",
          resolved_at: maintenant,
          resolved_by: adminId,
        })
        .eq("id", ticket.id);
    }
  } catch (error) {
    console.error("[admin/commandes] Réponse au ticket non enregistrée:", error);
  }

  if (!clientId) return;
  try {
    const { data: profil } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", clientId)
      .single();

    if (!profil?.email) return;

    const { subject, html } = emailDecisionSignalement({
      clientName: profil.full_name ?? "",
      decision,
      montantDebite,
      montantInitial,
      motif,
    });
    await sendEmail({ to: profil.email, subject, html });
  } catch (error) {
    console.error("[admin/commandes] Email de décision non envoyé:", error);
  }
}

/**
 * Prévient le commerce d'un paiement réduit ou annulé.
 *
 * Non bloquant : l'échec d'un email ne doit pas empêcher la décision de
 * s'appliquer, mais il est tracé pour pouvoir être rattrapé à la main.
 */
async function previenirCommerce(
  commerceId: string | null,
  montantInitial: number,
  montantVerse: number,
  motif: string,
  dateCommande: string | null,
): Promise<void> {
  if (!commerceId) return;
  try {
    const { data: commerce } = await createAdminClient()
      .from("commerces")
      .select("name, email")
      .eq("id", commerceId)
      .single();

    if (!commerce?.email) return;

    const { subject, html } = emailPaiementAjuste({
      commerceName: commerce.name ?? "",
      montantInitial,
      montantVerse,
      motif,
      dateCommande: dateCommande
        ? new Date(dateCommande).toLocaleDateString("fr-FR")
        : "récente",
    });
    await sendEmail({ to: commerce.email, subject, html });
  } catch (error) {
    console.error("[admin/commandes] Email d'ajustement non envoyé:", error);
  }
}

/**
 * Encaisse une commande laissée en autorisation, en totalité ou en partie.
 *
 * `pourcentage` vaut 100 pour valider intégralement — cas d'un signalement jugé
 * infondé. En dessous, la réduction est supportée par le commerce, conformément
 * à l'article 3 du contrat qui lui impose la fraîcheur et la conformité des
 * produits. La commission suit la même proportion : garder 18 % pleins sur un
 * panier reconnu défectueux donnerait un taux effectif indéfendable.
 */
export async function adminValiderPaiement(
  orderId: string,
  pourcentage = 100,
  motif?: string,
): Promise<AdminOrderActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  if (pourcentage <= 0 || pourcentage > 100) {
    return { success: false, error: "Le pourcentage doit être compris entre 1 et 100." };
  }
  const partiel = pourcentage < 100;
  if (partiel && !motif?.trim()) {
    return { success: false, error: "Un motif est obligatoire pour un paiement partiel." };
  }

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select(COLONNES_CAPTURE)
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Commande introuvable." };

  const resultat = await capturerCommande(
    order as unknown as OrderForCapture,
    pourcentage / 100,
    motif?.trim(),
  );
  if (!resultat.success) return { success: false, error: resultat.error };

  logAuditEvent({
    action: "admin.order_captured",
    actor_id: ctx.user.id,
    target_id: orderId,
    metadata: { pourcentage, montant: resultat.capturedAmount, motif: motif ?? null },
  });

  // Montants vus par le client : le prix du panier majoré des frais de service.
  const paye = Number(order.total_amount ?? 0) + Number(order.service_fee_amount ?? 0);
  const payeApres = Math.round(paye * (pourcentage / 100) * 100) / 100;

  if (partiel) {
    const netCommerce =
      Number(order.total_amount ?? 0) - Number(order.commission_amount ?? 0);
    await previenirCommerce(
      order.commerce_id,
      netCommerce,
      Math.round(netCommerce * (pourcentage / 100) * 100) / 100,
      motif!.trim(),
      order.created_at,
    );
  }

  // Le client est informé dans les deux cas : un signalement écarté sans réponse
  // se transforme en contestation bancaire.
  await informerClient(
    orderId,
    order.client_id,
    ctx.user.id,
    partiel ? "partiel" : "maintenu",
    payeApres,
    paye,
    motif?.trim(),
  );

  revalidatePath("/kshare-admin/commandes");
  return { success: true };
}

/**
 * Relâche l'autorisation d'une commande signalée : le client n'est jamais
 * débité et aucun frais Stripe n'est dû, contrairement à un remboursement.
 */
export async function adminAnnulerPaiement(
  orderId: string,
  motif: string,
): Promise<AdminOrderActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };
  if (!motif?.trim()) return { success: false, error: "Un motif est obligatoire." };

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select(COLONNES_CAPTURE)
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Commande introuvable." };

  const resultat = await annulerAutorisation(
    order as unknown as OrderForCapture,
    motif.trim(),
  );
  if (!resultat.success) return { success: false, error: resultat.error };

  await supabase.from("orders").update({ status: "cancelled_admin" }).eq("id", orderId);

  logAuditEvent({
    action: "admin.order_authorization_canceled",
    actor_id: ctx.user.id,
    target_id: orderId,
    metadata: { motif: motif.trim() },
  });

  const netCommerce =
    Number(order.total_amount ?? 0) - Number(order.commission_amount ?? 0);
  await previenirCommerce(order.commerce_id, netCommerce, 0, motif.trim(), order.created_at);

  const paye = Number(order.total_amount ?? 0) + Number(order.service_fee_amount ?? 0);
  await informerClient(orderId, order.client_id, ctx.user.id, "annule", 0, paye, motif.trim());

  revalidatePath("/kshare-admin/commandes");
  return { success: true };
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return { user };
}

/** Admin: mark order as refunded */
export async function adminRembourserCommande(
  orderId: string
): Promise<AdminOrderActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorise." };

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, stripe_payment_intent_id, total_amount")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Commande introuvable." };

  if (["refunded", "cancelled_admin"].includes(order.status)) {
    return { success: false, error: "Cette commande est deja remboursee ou annulee." };
  }

  // Attempt Stripe refund if payment intent exists
  if (order.stripe_payment_intent_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2026-02-25.clover",
      });
      await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
      });
    } catch (err) {
      console.error("[admin] Stripe refund error:", err);
      return {
        success: false,
        error: "Echec du remboursement Stripe. Veuillez réessayer ou traiter manuellement.",
      };
    }
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", orderId);

  if (error) return { success: false, error: "Erreur lors du remboursement." };

  revalidatePath("/kshare-admin/commandes");
  return { success: true };
}

/** Admin: cancel order */
export async function adminAnnulerCommande(
  orderId: string
): Promise<AdminOrderActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorise." };

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, basket_id, quantity, capture_status")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Commande introuvable." };

  if (["refunded", "cancelled_admin", "picked_up"].includes(order.status)) {
    return { success: false, error: "Cette commande ne peut pas etre annulee." };
  }

  // Cette action ne touche pas à Stripe : sur un paiement encore autorisé, elle
  // laisserait les fonds bloqués sur la carte du client. Il faut alors passer
  // par adminAnnulerPaiement, qui relâche réellement l'autorisation.
  if (order.capture_status === "pending") {
    return {
      success: false,
      error: "Paiement encore autorisé : utilisez « Annuler le paiement » pour relâcher les fonds.",
    };
  }

  // Restore basket quantity
  if (order.basket_id) {
    const { data: basket } = await supabase
      .from("baskets")
      .select("quantity_sold")
      .eq("id", order.basket_id)
      .single();

    if (basket) {
      await supabase
        .from("baskets")
        .update({
          quantity_sold: Math.max(0, (basket.quantity_sold ?? 0) - (order.quantity ?? 1)),
        })
        .eq("id", order.basket_id);
    }
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled_admin" })
    .eq("id", orderId);

  if (error) return { success: false, error: "Erreur lors de l'annulation." };

  revalidatePath("/kshare-admin/commandes");
  return { success: true };
}

/** Admin: change order status */
export async function adminChangerStatutCommande(
  orderId: string,
  newStatus: string
): Promise<AdminOrderActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorise." };

  const validStatuses = [
    "created",
    "paid",
    "ready_for_pickup",
    "picked_up",
    "no_show",
    "refunded",
    "cancelled_admin",
  ];

  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: "Statut invalide." };
  }

  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "picked_up") {
    updateData.picked_up_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (error) return { success: false, error: "Erreur lors du changement de statut." };

  revalidatePath("/kshare-admin/commandes");
  return { success: true };
}
