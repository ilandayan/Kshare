-- ============================================================
-- Kshare — Migration : Statut "archived" pour soft-delete
-- ============================================================

-- ── 1. Ajouter 'archived' aux enums commerce/association ─────
ALTER TYPE public.commerce_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE public.association_status ADD VALUE IF NOT EXISTS 'archived';

-- ── 2. Ajouter is_archived sur profiles (pour les clients) ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ── 3. Index pour filtrage rapide ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_archived
  ON public.profiles(is_archived)
  WHERE is_archived = TRUE;

-- ── 4. Commentaires ──────────────────────────────────────────
COMMENT ON COLUMN public.profiles.is_archived IS 'Client archivé (supprimé par admin ou désactivation volontaire)';
COMMENT ON COLUMN public.profiles.archived_at IS 'Date d archivage du compte';
