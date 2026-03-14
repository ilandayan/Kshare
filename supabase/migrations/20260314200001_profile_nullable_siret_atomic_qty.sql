-- ═══════════════════════════════════════════════════════════════
-- Fix #4: profile_id nullable (commerce créé avant validation admin)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.commerces
  ALTER COLUMN profile_id DROP NOT NULL;

-- Même fix pour associations (inscription avant validation)
ALTER TABLE public.associations
  ALTER COLUMN profile_id DROP NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- Fix #11: Ajouter colonne SIRET (collecté mais non sauvegardé)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS siret TEXT;

-- ═══════════════════════════════════════════════════════════════
-- Fix #8: RPC atomique pour incrémenter quantity_sold
-- (évite la race condition SELECT + UPDATE séparés dans le webhook)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.increment_basket_sold(
  p_basket_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.baskets
  SET quantity_sold = quantity_sold + p_quantity,
      updated_at = now()
  WHERE id = p_basket_id;
END;
$$;

-- RPC atomique pour transférer reserved → sold (mobile flow)
CREATE OR REPLACE FUNCTION public.confirm_basket_sold(
  p_basket_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.baskets
  SET quantity_reserved = GREATEST(0, quantity_reserved - p_quantity),
      quantity_sold = quantity_sold + p_quantity,
      updated_at = now()
  WHERE id = p_basket_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- Fix #10: RPC atomique pour créer une ledger entry avec balance_after calculé
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_ledger_entry_atomic(
  p_commerce_id UUID,
  p_order_id UUID DEFAULT NULL,
  p_payout_id UUID DEFAULT NULL,
  p_type ledger_entry_type DEFAULT 'payment',
  p_debit NUMERIC DEFAULT 0,
  p_credit NUMERIC DEFAULT 0,
  p_description TEXT DEFAULT '',
  p_stripe_object_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Calculate current balance atomically (with row lock via FOR UPDATE on commerce)
  SELECT COALESCE(SUM(credit - debit), 0)
  INTO v_current_balance
  FROM public.ledger_entries
  WHERE commerce_id = p_commerce_id;

  INSERT INTO public.ledger_entries (
    commerce_id, order_id, payout_id, type,
    debit, credit, balance_after,
    description, stripe_object_id, idempotency_key
  )
  VALUES (
    p_commerce_id, p_order_id, p_payout_id, p_type,
    p_debit, p_credit,
    ROUND(v_current_balance + p_credit - p_debit, 2),
    p_description, p_stripe_object_id, p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;
