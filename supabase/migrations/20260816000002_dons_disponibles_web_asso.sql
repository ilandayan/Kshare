-- L'espace web des associations affiche la cacherout du commerce et retranche
-- `quantity_sold` du restant. La fonction doit donc les remonter, sinon la
-- carte annoncerait plus de paniers qu'il n'en reste réellement.
DROP FUNCTION IF EXISTS public.dons_disponibles(DOUBLE PRECISION);

CREATE FUNCTION public.dons_disponibles(p_rayon_km DOUBLE PRECISION DEFAULT 50)
RETURNS TABLE (
  id UUID,
  type TEXT,
  description TEXT,
  quantity_total INTEGER,
  quantity_reserved INTEGER,
  quantity_sold INTEGER,
  pickup_start TEXT,
  pickup_end TEXT,
  day TEXT,
  commerce_name TEXT,
  commerce_address TEXT,
  commerce_city TEXT,
  commerce_postal_code TEXT,
  commerce_type TEXT,
  commerce_hashgakha TEXT,
  distance_km DOUBLE PRECISION,
  exclusif BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH moi AS (
    SELECT a.id, a.latitude, a.longitude
    FROM public.associations a
    WHERE a.profile_id = auth.uid() AND a.status = 'validated'
  )
  SELECT
    b.id,
    b.type::TEXT,
    b.description,
    b.quantity_total,
    b.quantity_reserved,
    COALESCE(b.quantity_sold, 0),
    b.pickup_start::TEXT,
    b.pickup_end::TEXT,
    b.day::TEXT,
    c.name,
    c.address,
    c.city,
    c.postal_code,
    c.commerce_type,
    c.hashgakha,
    public.distance_km(moi.latitude, moi.longitude, c.latitude, c.longitude),
    -- COALESCE : sans exclusivité, la comparaison vaut NULL et non false, et la
    -- colonne annoncée booléenne mentirait.
    COALESCE(b.exclusive_association_id = moi.id AND b.exclusive_until > now(), false)
  FROM public.baskets b
  JOIN public.commerces c ON c.id = b.commerce_id
  CROSS JOIN moi
  WHERE b.is_donation
    AND b.status = 'published'
    AND b.quantity_total - b.quantity_reserved - COALESCE(b.quantity_sold, 0) >= 1
    -- Un commerce sans coordonnées reste invisible : mieux vaut ne rien
    -- proposer qu'envoyer une association à l'autre bout de la région.
    AND public.distance_km(moi.latitude, moi.longitude, c.latitude, c.longitude) <= p_rayon_km
    -- L'exclusivité écarte les autres, jamais son bénéficiaire.
    AND (
      b.exclusive_until IS NULL
      OR b.exclusive_until <= now()
      OR b.exclusive_association_id = moi.id
    )
  ORDER BY
    COALESCE(b.exclusive_association_id = moi.id AND b.exclusive_until > now(), false) DESC,
    b.pickup_start ASC;
$$;

COMMENT ON FUNCTION public.dons_disponibles IS
  'Paniers dons visibles par l''association appelante : dans le rayon, et hors exclusivité accordée à une autre';
