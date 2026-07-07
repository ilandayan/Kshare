-- Confirmation de réception par le CLIENT (modèle Too Good To Go)
-- Le client confirme lui-même la réception, en magasin devant le commerçant.
-- On rétablit son droit d'UPDATE mais on le limite strictement :
--   - aucun champ financier / identité / QR modifiable (verrou conservé)
--   - un client ne peut QUE faire passer sa commande paid/ready_for_pickup -> picked_up
-- Le commerce et l'association gardent leurs transitions habituelles.

-- ── UPDATE : client + commerce + association + admin ──
DROP POLICY IF EXISTS orders_update_staff ON public.orders;
DROP POLICY IF EXISTS orders_update_participant ON public.orders;
CREATE POLICY orders_update_participant ON public.orders
  FOR UPDATE
  USING (
    client_id = auth.uid()
    OR commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR association_id IN (SELECT id FROM public.associations WHERE profile_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    client_id = auth.uid()
    OR commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR association_id IN (SELECT id FROM public.associations WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

-- ── Trigger : verrou champs sensibles + restriction de statut côté client ──
CREATE OR REPLACE FUNCTION public.orders_lock_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_is_commerce boolean;
  v_is_asso boolean;
BEGIN
  IF current_user IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Champs financiers / identité / QR : verrouillés pour tout compte non admin
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

  v_is_commerce := EXISTS (
    SELECT 1 FROM public.commerces c
    WHERE c.id = OLD.commerce_id AND c.profile_id = auth.uid()
  );
  v_is_asso := OLD.association_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.associations a
    WHERE a.id = OLD.association_id AND a.profile_id = auth.uid()
  );

  -- Le CLIENT (ni commerce ni asso) ne peut que confirmer la réception :
  -- passage paid / ready_for_pickup -> picked_up, rien d'autre.
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT v_is_commerce AND NOT v_is_asso THEN
    IF NOT (OLD.status IN ('paid', 'ready_for_pickup') AND NEW.status = 'picked_up') THEN
      RAISE EXCEPTION 'Vous ne pouvez que confirmer la réception de votre commande' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Le trigger BEFORE UPDATE existe déjà (trg_orders_lock_sensitive_columns),
-- CREATE OR REPLACE ci-dessus suffit à mettre à jour la logique.
