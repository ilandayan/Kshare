import { createAdminClient } from "@/lib/supabase/admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface SendNotificationParams {
  profileId: string;
  title: string;
  body: string;
  type: string;
  orderId?: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification via the Supabase Edge Function.
 * Fire-and-forget: errors are logged but do not throw.
 */
export async function sendPushNotification(params: SendNotificationParams): Promise<void> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/send-push-notification`;

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        profileId: params.profileId,
        title: params.title,
        body: params.body,
        type: params.type,
        orderId: params.orderId,
        data: params.data,
      }),
    });
  } catch (error) {
    // Fire and forget — don't break the main flow
    console.error("[notifications] Failed to send push:", error);
  }
}

/** Notification templates for order status changes */
export const ORDER_NOTIFICATIONS = {
  paid: (commerceName: string) => ({
    title: "Commande confirmee !",
    body: `Votre panier chez ${commerceName} est reserve. Presentez votre code au retrait.`,
    type: "order_paid",
  }),
  ready_for_pickup: (commerceName: string) => ({
    title: "Panier pret a retirer !",
    body: `Votre panier chez ${commerceName} est pret. Rendez-vous au magasin.`,
    type: "order_ready",
  }),
  picked_up: (commerceName: string) => ({
    title: "Retrait confirme",
    body: `Merci d'avoir recupere votre panier chez ${commerceName}. Bon appetit !`,
    type: "order_picked_up",
  }),
  no_show: (commerceName: string) => ({
    title: "Panier non retire",
    body: `Vous n'avez pas recupere votre panier chez ${commerceName}. Contactez le support si besoin.`,
    type: "order_no_show",
  }),
} as const;

/**
 * Send order status notification to the client.
 * Resolves the commerce name and sends the appropriate message.
 */
export async function notifyOrderStatusChange(
  orderId: string,
  clientId: string,
  status: keyof typeof ORDER_NOTIFICATIONS,
  commerceName: string
): Promise<void> {
  const template = ORDER_NOTIFICATIONS[status];
  if (!template) return;

  const notification = template(commerceName);

  await sendPushNotification({
    profileId: clientId,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    orderId,
  });
}
