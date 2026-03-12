import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase admin client
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn();
const mockFrom = vi.fn().mockReturnValue({
  insert: mockInsert,
  select: vi.fn().mockReturnValue({
    eq: mockSelect,
  }),
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

// Import after mocks
import {
  createLedgerEntry,
  createPaymentLedgerEntries,
  createRefundLedgerEntries,
  getCommerceBalance,
} from "@/lib/stripe/ledger";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: empty ledger (balance = 0)
  mockSelect.mockResolvedValue({ data: [], error: null });
});

describe("createLedgerEntry", () => {
  it("inserts a ledger entry with correct fields", async () => {
    await createLedgerEntry({
      commerceId: "com-1",
      orderId: "ord-1",
      type: "payment",
      debit: 0,
      credit: 50,
      description: "Test payment",
      stripeObjectId: "pi_123",
      idempotencyKey: "test-key-1",
    });

    expect(mockFrom).toHaveBeenCalledWith("ledger_entries");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        commerce_id: "com-1",
        order_id: "ord-1",
        type: "payment",
        debit: 0,
        credit: 50,
        balance_after: 50, // 0 + 50 - 0
        description: "Test payment",
        stripe_object_id: "pi_123",
        idempotency_key: "test-key-1",
      })
    );
  });

  it("silently ignores duplicate idempotency key (23505)", async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } });

    // Should not throw
    await expect(
      createLedgerEntry({
        commerceId: "com-1",
        type: "payment",
        debit: 0,
        credit: 10,
        description: "Duplicate",
        idempotencyKey: "dup-key",
      })
    ).resolves.not.toThrow();
  });

  it("throws on non-duplicate DB errors", async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: "42P01", message: "table not found" } });

    await expect(
      createLedgerEntry({
        commerceId: "com-1",
        type: "payment",
        debit: 0,
        credit: 10,
        description: "Error test",
        idempotencyKey: "err-key",
      })
    ).rejects.toThrow();
  });
});

describe("createPaymentLedgerEntries", () => {
  it("creates 3 entries: payment credit, commission debit, service fee debit", async () => {
    await createPaymentLedgerEntries({
      commerceId: "com-1",
      orderId: "ord-1",
      totalAmount: 10,
      commissionAmount: 1.8,
      serviceFeeAmount: 0.94,
      netAmount: 8.2,
      stripePaymentIntentId: "pi_abc",
    });

    // Should have called insert 3 times (payment, commission, service_fee)
    expect(mockInsert).toHaveBeenCalledTimes(3);

    // First call: payment credit
    expect(mockInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "payment",
        credit: 8.2,
        debit: 0,
        idempotency_key: "payment:pi_abc:payment",
      })
    );

    // Second call: commission debit
    expect(mockInsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "commission",
        debit: 1.8,
        credit: 0,
        idempotency_key: "payment:pi_abc:commission",
      })
    );

    // Third call: service_fee debit
    expect(mockInsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: "service_fee",
        debit: 0.94,
        credit: 0,
        idempotency_key: "payment:pi_abc:service_fee",
      })
    );
  });

  it("skips service fee entry when amount is 0", async () => {
    await createPaymentLedgerEntries({
      commerceId: "com-1",
      orderId: "ord-1",
      totalAmount: 10,
      commissionAmount: 0,
      serviceFeeAmount: 0,
      netAmount: 10,
      stripePaymentIntentId: "pi_no_fee",
    });

    // Only 2 entries: payment + commission (service fee skipped)
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });
});

describe("createRefundLedgerEntries", () => {
  it("creates a refund debit entry", async () => {
    await createRefundLedgerEntries({
      commerceId: "com-1",
      orderId: "ord-1",
      refundAmount: 10,
      commissionRefund: 1.8,
      stripeRefundId: "re_xyz",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "refund",
        debit: 8.2, // 10 - 1.8 = net refund
        credit: 0,
        idempotency_key: "refund:re_xyz:refund",
      })
    );
  });
});

describe("getCommerceBalance", () => {
  it("returns 0 for empty ledger", async () => {
    mockSelect.mockResolvedValueOnce({ data: [], error: null });
    const balance = await getCommerceBalance("com-1");
    expect(balance).toBe(0);
  });

  it("sums credits minus debits", async () => {
    mockSelect.mockResolvedValueOnce({
      data: [
        { credit: 100, debit: 0 },
        { credit: 0, debit: 18 },
        { credit: 0, debit: 0.94 },
      ],
      error: null,
    });
    const balance = await getCommerceBalance("com-1");
    expect(balance).toBe(81.06); // 100 - 18 - 0.94
  });

  it("returns 0 on DB error", async () => {
    mockSelect.mockResolvedValueOnce({ data: null, error: { message: "error" } });
    const balance = await getCommerceBalance("com-1");
    expect(balance).toBe(0);
  });
});
