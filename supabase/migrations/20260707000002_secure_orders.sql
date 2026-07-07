-- Sécurité orders : commandes forgeables + auto-confirmation retrait
-- 1. Bloquer l'INSERT client (les commandes payées passent par l'Edge Function
--    service_role ; les dons passent par la RPC reserve_donation SECURITY DEFINER)
-- 2. Retirer le client de la policy UPDATE (il ne peut plus poser picked_up)
-- 3. Trigger verrouillant les champs financiers/identité sur UPDATE

-- ── 1. Plus aucun INSERT côté client ──
DROP POLICY IF EXISTS orders_insert_client ON public.orders;

-- ── 2. UPDATE réservé au commerce / association / admin ──
DROP POLICY IF EXISTS orders_update_commerce ON public.orders;
CREATE POLICY orders_update_staff ON public.orders
  FOR UPDATE
  USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR association_id IN (SELECT id FROM public.associations WHERE profile_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR association_id IN (SELECT id FROM public.associations WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

-- ── 3. Verrou sur les champs sensibles ──
-- Même le commerce (qui peut légitimement passer une commande en picked_up) ne
-- doit jamais pouvoir modifier montants, QR, identités ou statut de payout.
CREATE OR REPLACE FUNCTION public.orders_lock_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.total_amount           IS DISTINCT FROM OLD.total_amount
     OR NEW.unit_price          IS DISTINCT FROM OLD.unit_price
     OR NEW.commission_amount   IS DISTINCT FROM OLD.commission_amount
     OR NEW.net_amount          IS DISTINCT FROM OLD.net_amount
     OR NEW.service_fee_amount  IS DISTINCT FROM OLD.service_fee_amount
     OR NEW.stripe_fee_amount   IS DISTINCT FROM OLD.stripe_fee_amount
     OR NEW.qr_code             IS DISTINCT FROM OLD.qr_code
     OR NEW.qr_code_token       IS DISTINCT FROM OLD.qr_code_token
     OR NEW.basket_id           IS DISTINCT FROM OLD.basket_id
     OR NEW.client_id           IS DISTINCT FROM OLD.client_id
     OR NEW.commerce_id         IS DISTINCT FROM OLD.commerce_id
     OR NEW.association_id      IS DISTINCT FROM OLD.association_id
     OR NEW.is_donation         IS DISTINCT FROM OLD.is_donation
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.stripe_charge_id    IS DISTINCT FROM OLD.stripe_charge_id
     OR NEW.payout_status       IS DISTINCT FROM OLD.payout_status
     OR NEW.payout_date         IS DISTINCT FROM OLD.payout_date
  THEN
    RAISE EXCEPTION 'Modification de champs protégés de la commande interdite' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_lock_sensitive_columns ON public.orders;
CREATE TRIGGER trg_orders_lock_sensitive_columns
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_lock_sensitive_columns();
