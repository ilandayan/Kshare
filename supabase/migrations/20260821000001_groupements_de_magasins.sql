-- Les enseignes à plusieurs magasins.
--
-- Chez Hypercacher, chaque magasin est une société distincte, avec son SIREN,
-- son compte Stripe et sa comptabilité. Le groupement ne les fusionne donc pas :
-- il les coiffe. Chaque magasin garde son compte, publie ses paniers, reçoit son
-- relevé et sa facture ; le groupe n'ajoute qu'une vue consolidée et une règle
-- de commission commune.
--
-- C'est pourquoi `commerces.profile_id` reste UNIQUE : le directeur réseau n'est
-- rattaché à aucun magasin, il est rattaché au groupe. Sans quoi il aurait fallu
-- casser cette contrainte et rouvrir toutes les politiques RLS qui s'appuient
-- dessus.

CREATE TABLE IF NOT EXISTS public.groupes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           TEXT NOT NULL,
  siren         TEXT,
  contact_nom   TEXT,
  contact_email TEXT,

  -- Grille de commission, du palier le plus bas au plus haut. Un palier
  -- s'applique dès que le chiffre d'affaires consolidé atteint son seuil : on
  -- retient donc le plus haut seuil atteint. La borne profite au commerce —
  -- 15 000 EUR pile donnent bien 12 %, et non 14 %.
  paliers       JSONB NOT NULL DEFAULT
    '[{"seuil": 0, "taux": 18}, {"seuil": 3000, "taux": 16}, {"seuil": 6000, "taux": 14}, {"seuil": 15000, "taux": 12}]'::jsonb,

  -- Taux en vigueur, recopié sur chaque magasin membre. NULL tant qu'aucun mois
  -- n'a été clos : le groupe démarre alors au taux de base.
  taux_courant  INTEGER,

  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT groupes_taux_plausible CHECK (taux_courant IS NULL OR taux_courant BETWEEN 0 AND 100)
);

COMMENT ON TABLE public.groupes IS
  'Enseigne regroupant plusieurs magasins sous une grille de commission commune';

ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS groupe_id UUID REFERENCES public.groupes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS commerces_groupe_idx ON public.commerces(groupe_id)
  WHERE groupe_id IS NOT NULL;

-- Qui accède à l'espace groupe. Table distincte plutôt qu'une colonne sur
-- `groupes` : une centrale a rarement un seul interlocuteur, et il faut pouvoir
-- retirer un accès sans toucher au groupe.
CREATE TABLE IF NOT EXISTS public.groupe_acces (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  groupe_id  UUID NOT NULL REFERENCES public.groupes(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'directeur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT groupe_acces_unique UNIQUE (groupe_id, profile_id),
  CONSTRAINT groupe_acces_role CHECK (role IN ('directeur'))
);

-- Trace de ce qui a été appliqué, et pourquoi. Le jour où une facture sera
-- contestée, c'est cette table qui répondra.
CREATE TABLE IF NOT EXISTS public.groupe_taux_historique (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  groupe_id      UUID NOT NULL REFERENCES public.groupes(id) ON DELETE CASCADE,
  -- Mois observé, au format AAAA-MM. Le taux qui en découle vaut pour le suivant.
  periode        TEXT NOT NULL,
  ca_consolide   NUMERIC(12,2) NOT NULL,
  taux           INTEGER NOT NULL,
  taux_precedent INTEGER,
  magasins       INTEGER NOT NULL,
  applique_le    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT groupe_taux_periode_unique UNIQUE (groupe_id, periode)
);

-- Le récapitulatif remis à la centrale. Les relevés et factures restent émis
-- par magasin : ce document ne les remplace pas, il les résume.
CREATE TABLE IF NOT EXISTS public.groupe_recaps (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference        TEXT NOT NULL UNIQUE,
  groupe_id        UUID NOT NULL REFERENCES public.groupes(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  ca_total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  magasins         JSONB NOT NULL DEFAULT '[]'::jsonb,
  taux_applique    INTEGER,
  taux_suivant     INTEGER,
  status           TEXT NOT NULL DEFAULT 'issued',
  pdf_url          TEXT,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT groupe_recaps_periode_unique UNIQUE (groupe_id, period_start)
);

-- ---------------------------------------------------------------------------
-- Accès
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER : la fonction lit `groupe_acces`, dont la politique appelle
-- cette même fonction. Sans le contournement de RLS, la récursion serait infinie.
CREATE OR REPLACE FUNCTION public.groupes_diriges()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT groupe_id FROM public.groupe_acces WHERE profile_id = auth.uid();
$fn$;

-- `anon` est explicitement exclu : sans session la fonction ne renverrait rien,
-- mais une fonction SECURITY DEFINER n'a pas a etre joignable sans etre connecte.
REVOKE ALL ON FUNCTION public.groupes_diriges() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.groupes_diriges() FROM anon;
GRANT EXECUTE ON FUNCTION public.groupes_diriges() TO authenticated;

ALTER TABLE public.groupes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groupe_acces           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groupe_taux_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groupe_recaps          ENABLE ROW LEVEL SECURITY;

CREATE POLICY groupes_admin ON public.groupes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY groupes_lecture_directeur ON public.groupes
  FOR SELECT USING (id IN (SELECT public.groupes_diriges()));

CREATE POLICY groupe_acces_admin ON public.groupe_acces
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY groupe_acces_lecture_propre ON public.groupe_acces
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY groupe_taux_admin ON public.groupe_taux_historique
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY groupe_taux_lecture_directeur ON public.groupe_taux_historique
  FOR SELECT USING (groupe_id IN (SELECT public.groupes_diriges()));

CREATE POLICY groupe_recaps_admin ON public.groupe_recaps
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY groupe_recaps_lecture_directeur ON public.groupe_recaps
  FOR SELECT USING (groupe_id IN (SELECT public.groupes_diriges()));

-- Le directeur voit les magasins de son enseigne, leurs commandes et leurs
-- relevés. Rien de plus : aucune politique d'écriture ne lui est ouverte, la
-- publication et la facturation restant l'affaire de chaque magasin.
CREATE POLICY commerces_lecture_groupe ON public.commerces
  FOR SELECT USING (groupe_id IN (SELECT public.groupes_diriges()));

CREATE POLICY orders_lecture_groupe ON public.orders
  FOR SELECT USING (
    commerce_id IN (
      SELECT c.id FROM public.commerces c
      WHERE c.groupe_id IN (SELECT public.groupes_diriges())
    )
  );

CREATE POLICY sales_statements_lecture_groupe ON public.sales_statements
  FOR SELECT USING (
    commerce_id IN (
      SELECT c.id FROM public.commerces c
      WHERE c.groupe_id IN (SELECT public.groupes_diriges())
    )
  );
