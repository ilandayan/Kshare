/**
 * Financial ledger service for Kshare marketplace.
 *
 * Double-entry system: each transaction creates one or more ledger entries
 * with debit/credit amounts and a running balance per commerce.
 *
 * Uses idempotency keys to prevent duplicate entries from webhook retries.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type LedgerEntryType = Database["public"]["Enums"]["ledger_entry_type"];

interface CreateLedgerEntryParams {
  commerceId: string;
  orderId?: string | null;
  payoutId?: string | null;
  type: LedgerEntryType;
  debit: number;
  credit: number;
  description: string;
  stripeObjectId?: string | null;
  idempotencyKey: string;
}

/**
 * Create a single ledger entry with running balance.
 * Duplicate idempotency keys are silently ignored.
 */
export async function createLedgerEntry(params: CreateLedgerEntryParams): Promise<void> {
  const supabase = createAdminClient();

  // Get current balance for this commerce
  const currentBalance = await getCommerceBalance(params.commerceId);
  const newBalance = Math.round((currentBalance + params.credit - params.debit) * 100) / 100;

  const { error } = await supabase.from("ledger_entries").insert({
    commerce_id: params.commerceId,
    order_id: params.orderId ?? null,
    payout_id: params.payoutId ?? null,
    type: params.type,
    debit: params.debit,
    credit: params.credit,
    balance_after: newBalance,
    description: params.description,
    stripe_object_id: params.stripeObjectId ?? null,
    idempotency_key: params.idempotencyKey,
  });

  if (error) {
    // Unique constraint violation on idempotency_key → duplicate, safe to ignore
    if (error.code === "23505") return;
    console.error("[ledger] Failed to create entry:", error);
    throw error;
  }
}

/**
 * Create the standard set of ledger entries for a completed payment.
 *
 * Entries:
 * 1. payment (credit) — net amount going to commerce
 * 2. commission (debit) — Kshare commission (informational, already deducted via application_fee)
 * 3. service_fee (debit) — service fee kept by Kshare (informational)
 */
export async function createPaymentLedgerEntries(params: {
  commerceId: string;
  orderId: string;
  totalAmount: number;
  commissionAmount: number;
  serviceFeeAmount: number;
  netAmount: number;
  stripePaymentIntentId: string;
}): Promise<void> {
  const baseKey = `payment:${params.stripePaymentIntentId}`;

  // 1. Credit: net amount to commerce balance
  await createLedgerEntry({
    commerceId: params.commerceId,
    orderId: params.orderId,
    type: "payment",
    debit: 0,
    credit: params.netAmount,
    description: "Paiement commande — net commerçant",
    stripeObjectId: params.stripePaymentIntentId,
    idempotencyKey: `${baseKey}:payment`,
  });

  // 2. Commission (informational — already deducted via application_fee)
  await createLedgerEntry({
    commerceId: params.commerceId,
    orderId: params.orderId,
    type: "commission",
    debit: params.commissionAmount,
    credit: 0,
    description: "Commission Kshare",
    stripeObjectId: params.stripePaymentIntentId,
    idempotencyKey: `${baseKey}:commission`,
  });

  // 3. Service fee (informational — kept by Kshare)
  if (params.serviceFeeAmount > 0) {
    await createLedgerEntry({
      commerceId: params.commerceId,
      orderId: params.orderId,
      type: "service_fee",
      debit: params.serviceFeeAmount,
      credit: 0,
      description: "Frais de service plateforme",
      stripeObjectId: params.stripePaymentIntentId,
      idempotencyKey: `${baseKey}:service_fee`,
    });
  }
}

/**
 * Create refund ledger entries.
 * Debits the commerce balance for the net refund amount.
 */
export async function createRefundLedgerEntries(params: {
  commerceId: string;
  orderId: string;
  refundAmount: number;
  commissionRefund: number;
  stripeRefundId: string;
}): Promise<void> {
  const baseKey = `refund:${params.stripeRefundId}`;
  const netRefund = Math.round((params.refundAmount - params.commissionRefund) * 100) / 100;

  // Debit: remove net amount from commerce balance
  await createLedgerEntry({
    commerceId: params.commerceId,
    orderId: params.orderId,
    type: "refund",
    debit: netRefund,
    credit: 0,
    description: "Remboursement commande",
    stripeObjectId: params.stripeRefundId,
    idempotencyKey: `${baseKey}:refund`,
  });
}

/**
 * Get current balance for a commerce (sum of credits minus debits).
 */
export async function getCommerceBalance(commerceId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("credit, debit")
    .eq("commerce_id", commerceId);

  if (error || !data) return 0;

  const entries = data as Array<{ credit: number; debit: number }>;
  const balance = entries.reduce((sum, e) => sum + (Number(e.credit) - Number(e.debit)), 0);
  return Math.round(balance * 100) / 100;
}

/**
 * Get ledger summary for a commerce over a period.
 */
export async function getCommerceLedgerSummary(
  commerceId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalSales: number;
  totalCommissions: number;
  totalServiceFees: number;
  totalRefunds: number;
  totalPayouts: number;
  netBalance: number;
}> {
  const supabase = createAdminClient();

  let query = supabase
    .from("ledger_entries")
    .select("type, debit, credit")
    .eq("commerce_id", commerceId);

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data, error } = await query;

  if (error || !data) {
    return { totalSales: 0, totalCommissions: 0, totalServiceFees: 0, totalRefunds: 0, totalPayouts: 0, netBalance: 0 };
  }

  const entries = data as Array<{ type: LedgerEntryType; debit: number; credit: number }>;

  let totalSales = 0;
  let totalCommissions = 0;
  let totalServiceFees = 0;
  let totalRefunds = 0;
  let totalPayouts = 0;

  for (const entry of entries) {
    switch (entry.type) {
      case "payment":
        totalSales += Number(entry.credit);
        break;
      case "commission":
        totalCommissions += Number(entry.debit);
        break;
      case "service_fee":
        totalServiceFees += Number(entry.debit);
        break;
      case "refund":
        totalRefunds += Number(entry.debit);
        break;
      case "payout":
        totalPayouts += Number(entry.debit);
        break;
    }
  }

  const netBalance = Math.round((totalSales - totalCommissions - totalServiceFees - totalRefunds - totalPayouts) * 100) / 100;

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    totalCommissions: Math.round(totalCommissions * 100) / 100,
    totalServiceFees: Math.round(totalServiceFees * 100) / 100,
    totalRefunds: Math.round(totalRefunds * 100) / 100,
    totalPayouts: Math.round(totalPayouts * 100) / 100,
    netBalance,
  };
}
