/**
 * Audit logging for security-sensitive events.
 *
 * Logs are stored in the `audit_logs` Supabase table.
 * Events: auth failures, admin actions, payment events, account changes.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "auth.login_failed"
  | "auth.login_success"
  | "admin.validate_account"
  | "admin.reject_account"
  | "admin.suspend_account"
  | "admin.request_info"
  | "admin.delete_user"
  | "admin.refund_order"
  | "payment.checkout_created"
  | "payment.checkout_donation"
  | "payment.subscription_created"
  | "payment.subscription_canceled"
  | "payment.plan_changed"
  | "payment.refund_created"
  | "payment.dispute_created"
  | "payment.payout_created"
  | "payment.payout_failed"
  | "order.confirmed_pickup"
  | "account.email_changed"
  | "account.password_changed"
  | "rate_limit.exceeded";

interface AuditLogParams {
  action: AuditAction;
  actor_id?: string | null;
  target_id?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Non-blocking — errors are silently logged.
 * Uses raw SQL via rpc since audit_logs is not yet in the generated types.
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("audit_logs").insert({
      action: params.action,
      actor_id: params.actor_id ?? null,
      target_id: params.target_id ?? null,
      ip_address: params.ip ?? null,
      metadata: (params.metadata ?? null) as import("@/types/database.types").Json,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[audit] Failed to write audit log:", error.message);
    }
  } catch (err) {
    console.error("[audit] Unexpected error:", err);
  }
}

/**
 * Fire-and-forget audit log (no await needed).
 */
export function logAuditEvent(params: AuditLogParams): void {
  writeAuditLog(params).catch(() => {});
}
