import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Predefined analytics event names for type safety.
 * Extend this union as new trackable events are added.
 */
export type AnalyticsEvent =
  | "basket_created"
  | "basket_reserved"
  | "order_paid"
  | "order_picked_up"
  | "donation_made"
  | "commerce_registered";

/**
 * Fire-and-forget analytics tracker.
 *
 * Inserts an event row into `analytics_events` via the service-role client
 * (bypasses RLS). Errors are caught silently so callers are never blocked.
 *
 * @param event  - One of the predefined AnalyticsEvent names
 * @param metadata - Arbitrary JSON payload attached to the event
 * @param userId - Optional user id to associate with the event
 *
 * @example
 * ```ts
 * track("basket_created", { basket_id: id, category: "bassari" });
 * ```
 */
export function track(
  event: AnalyticsEvent,
  metadata?: Record<string, unknown>,
  userId?: string
): void {
  // Fire-and-forget: intentionally not awaited
  void insertEvent(event, metadata, userId);
}

async function insertEvent(
  event: AnalyticsEvent,
  metadata?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    await (supabase.from as CallableFunction)("analytics_events").insert({
      event_name: event,
      user_id: userId ?? null,
      metadata: metadata ?? {},
    });
  } catch {
    // Silent failure: analytics must never break application flow.
    // In production, consider forwarding to an error monitoring service.
  }
}
