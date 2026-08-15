-- Dons : passer du découpage départemental à un rayon de 50 km, et laisser le
-- commerçant désigner une association bénéficiaire.
--
-- Jusqu'ici un panier don n'était proposé qu'aux associations dont le
-- département correspondait au préfixe du code postal du commerce. Un commerce
-- de Levallois (92) restait donc invisible pour une association du 75 située à
-- trois kilomètres, tandis qu'une association de Meaux, à cinquante, le voyait.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Coordonnées des associations
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.associations
  ADD COLUMN IF NOT EXISTS latitude   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.associations.latitude IS
  'Latitude, obtenue en géocodant l''adresse saisie (API Adresse de data.gouv.fr)';
COMMENT ON COLUMN public.associations.geocoded_at IS
  'Date du dernier géocodage réussi ; NULL = adresse jamais résolue';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Distance
-- ─────────────────────────────────────────────────────────────────────────────

-- Haversine plutôt que PostGIS ou earthdistance : aucune extension à activer,
-- et à l'échelle de quelques milliers de commerces la différence de vitesse ne
-- se mesure pas. Renvoie NULL si l'un des deux points est inconnu, ce qui fait
-- échouer proprement les comparaisons plutôt que de renvoyer 0.
CREATE OR REPLACE FUNCTION public.distance_km(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN NULL
    ELSE 6371 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians(lon2 - lon1) / 2), 2)
    ))
  END;
$$;

COMMENT ON FUNCTION public.distance_km IS
  'Distance orthodromique en kilomètres entre deux points ; NULL si un point manque';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Association bénéficiaire choisie par le commerçant
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS preferred_association_id UUID
    REFERENCES public.associations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.commerces.preferred_association_id IS
  'Association prioritaire pour les dons du commerce ; NULL = toutes celles du rayon';

-- L'exclusivité est figée sur le panier au moment de sa publication, et non lue
-- sur le commerce à chaque affichage : un commerçant qui change d'avis le
-- lendemain ne doit pas réécrire l'exclusivité de paniers déjà en ligne.
ALTER TABLE public.baskets
  ADD COLUMN IF NOT EXISTS exclusive_association_id UUID
    REFERENCES public.associations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exclusive_until TIMESTAMPTZ;

COMMENT ON COLUMN public.baskets.exclusive_until IS
  'Fin de la priorité accordée à exclusive_association_id ; ensuite le panier s''ouvre à tout le rayon';

CREATE OR REPLACE FUNCTION public.figer_exclusivite_don()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_association UUID;
BEGIN
  IF NOT NEW.is_donation OR NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;

  -- Déjà figée : on ne prolonge pas une exclusivité à chaque modification du
  -- panier, sinon une simple correction de description la relancerait.
  IF NEW.exclusive_until IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT preferred_association_id INTO v_association
  FROM public.commerces WHERE id = NEW.commerce_id;

  IF v_association IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.exclusive_association_id := v_association;
  -- Deux heures, pas davantage. Une exclusivité définitive perdrait le panier
  -- si l'association ne venait pas — l'inverse du but recherché.
  NEW.exclusive_until := now() + INTERVAL '2 hours';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_figer_exclusivite_don ON public.baskets;
CREATE TRIGGER trg_figer_exclusivite_don
  BEFORE INSERT OR UPDATE OF status, is_donation ON public.baskets
  FOR EACH ROW EXECUTE FUNCTION public.figer_exclusivite_don();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Les dons visibles par une association
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.dons_disponibles(p_rayon_km DOUBLE PRECISION DEFAULT 50)
RETURNS TABLE (
  id UUID,
  type TEXT,
  description TEXT,
  quantity_total INTEGER,
  quantity_reserved INTEGER,
  pickup_start TEXT,
  pickup_end TEXT,
  day TEXT,
  commerce_name TEXT,
  commerce_address TEXT,
  commerce_city TEXT,
  commerce_postal_code TEXT,
  commerce_type TEXT,
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
    b.pickup_start::TEXT,
    b.pickup_end::TEXT,
    b.day::TEXT,
    c.name,
    c.address,
    c.city,
    c.postal_code,
    c.commerce_type,
    public.distance_km(moi.latitude, moi.longitude, c.latitude, c.longitude),
    (b.exclusive_association_id = moi.id AND b.exclusive_until > now())
  FROM public.baskets b
  JOIN public.commerces c ON c.id = b.commerce_id
  CROSS JOIN moi
  WHERE b.is_donation
    AND b.status = 'published'
    AND b.quantity_total - b.quantity_reserved >= 1
    -- Le rayon. Un commerce sans coordonnées reste invisible : mieux vaut ne
    -- rien proposer qu'envoyer une association à l'autre bout de la région.
    AND public.distance_km(moi.latitude, moi.longitude, c.latitude, c.longitude) <= p_rayon_km
    -- L'exclusivité écarte les autres, jamais son bénéficiaire.
    AND (
      b.exclusive_until IS NULL
      OR b.exclusive_until <= now()
      OR b.exclusive_association_id = moi.id
    )
  ORDER BY
    (b.exclusive_association_id = moi.id AND b.exclusive_until > now()) DESC,
    b.pickup_start ASC;
$$;

COMMENT ON FUNCTION public.dons_disponibles IS
  'Paniers dons visibles par l''association appelante : dans le rayon, et hors exclusivité accordée à une autre';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Associations signalées par les commerçants, pas encore inscrites
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.association_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Seul champ exigé. Un commerçant qui connaît le nom d'une association et
  -- rien d'autre doit pouvoir nous le transmettre : c'est déjà de quoi la
  -- retrouver, et exiger davantage revient à ne rien recevoir.
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  commerce_id UUID REFERENCES public.commerces(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'registered', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_at TIMESTAMPTZ
);

COMMENT ON TABLE public.association_leads IS
  'Associations signalées par un commerçant et à contacter ; ne crée aucun compte';

CREATE INDEX IF NOT EXISTS idx_association_leads_status
  ON public.association_leads(status, created_at DESC);

ALTER TABLE public.association_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commerce cree sa demande" ON public.association_leads;
CREATE POLICY "commerce cree sa demande" ON public.association_leads
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.commerces c
      WHERE c.id = commerce_id AND c.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "commerce relit ses demandes" ON public.association_leads;
CREATE POLICY "commerce relit ses demandes" ON public.association_leads
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "admin gere les demandes" ON public.association_leads;
CREATE POLICY "admin gere les demandes" ON public.association_leads
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Ce que le commerçant a le droit de voir des associations
-- ─────────────────────────────────────────────────────────────────────────────

-- Pour choisir une bénéficiaire il lui faut une liste ; il n'a en revanche
-- aucune raison de connaître les coordonnées, l'email ou le représentant d'une
-- association. Cette vue n'expose que de quoi la reconnaître.
CREATE OR REPLACE VIEW public.associations_publiques
WITH (security_invoker = false) AS
  SELECT a.id, a.name, a.city, a.department
  FROM public.associations a
  WHERE a.status = 'validated';

COMMENT ON VIEW public.associations_publiques IS
  'Nom et ville des associations validées, pour le choix d''une bénéficiaire côté commerçant';

REVOKE ALL ON public.associations_publiques FROM anon;
GRANT SELECT ON public.associations_publiques TO authenticated;
