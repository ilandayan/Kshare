-- Migration: Ajout des colonnes de contrat de partenariat pour les commerces
-- Le contrat doit être signé obligatoirement à la 1ère connexion

ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_ip TEXT,
  ADD COLUMN IF NOT EXISTS contract_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT;

-- Index pour vérifier rapidement si le contrat est signé
CREATE INDEX IF NOT EXISTS idx_commerces_contract_signed
  ON public.commerces(contract_signed_at);
