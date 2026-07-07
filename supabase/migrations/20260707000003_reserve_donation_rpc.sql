-- Réservation de don asso : atomique + sécurisée
-- Remplace l'INSERT client + UPDATE non atomique de quantity_reserved par une
-- RPC transactionnelle. Le verrou FOR UPDATE sur le panier sérialise les
-- réservations concurrentes (fix race condition « dernier panier réservé 2x »).
CREATE OR REPLACE FUNCTION public.reserve_donation(
  p_basket_id uuid,
  p_quantity integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_asso_id   uuid;
  v_basket    public.baskets%ROWTYPE;
  v_available integer;
  v_order_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantité invalide';
  END IF;

  -- L'appelant doit être une association
  SELECT a.id INTO v_asso_id
  FROM public.associations a
  WHERE a.profile_id = v_uid;
  IF v_asso_id IS NULL THEN
    RAISE EXCEPTION 'Accès réservé aux associations' USING ERRCODE = '42501';
  END IF;

  -- Verrou du panier pour sérialiser les réservations concurrentes
  SELECT * INTO v_basket
  FROM public.baskets
  WHERE id = p_basket_id
    AND is_donation = true
    AND status = 'published'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Panier introuvable ou indisponible';
  END IF;

  v_available := v_basket.quantity_total
               - COALESCE(v_basket.quantity_reserved, 0)
               - COALESCE(v_basket.quantity_sold, 0);
  IF p_quantity > v_available THEN
    RAISE EXCEPTION 'Quantité insuffisante — % disponible(s)', v_available;
  END IF;

  UPDATE public.baskets
  SET quantity_reserved = COALESCE(quantity_reserved, 0) + p_quantity
  WHERE id = p_basket_id;

  INSERT INTO public.orders (
    basket_id, commerce_id, client_id, association_id, is_donation,
    unit_price, total_amount, commission_amount, net_amount, service_fee_amount,
    pickup_date, pickup_start, pickup_end, status, quantity
  ) VALUES (
    v_basket.id, v_basket.commerce_id, v_uid, v_asso_id, true,
    0, 0, 0, 0, 0,
    CASE WHEN v_basket.day = 'today' THEN CURRENT_DATE ELSE CURRENT_DATE + 1 END,
    v_basket.pickup_start, v_basket.pickup_end, 'created', p_quantity
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_donation(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.reserve_donation(uuid, integer) TO authenticated;
