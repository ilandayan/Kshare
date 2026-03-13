-- Migration: Ajout des colonnes de charte d'engagement pour les associations
-- La charte doit être signée obligatoirement à la 1ère connexion

ALTER TABLE public.associations
  ADD COLUMN IF NOT EXISTS charter_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS charter_ip TEXT,
  ADD COLUMN IF NOT EXISTS charter_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS charter_pdf_url TEXT;

CREATE INDEX IF NOT EXISTS idx_associations_charter_signed
  ON public.associations(charter_signed_at);
