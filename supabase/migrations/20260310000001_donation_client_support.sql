-- ============================================================
-- Kshare — Migration : Support dons clients
-- Ajout statuts pending_association/expired + colonnes manquantes
-- ============================================================

-- ── 1. Ajouter les nouveaux statuts à l'enum order_status ──
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_association';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'expired';

-- ── 2. Ajouter les colonnes manquantes à orders ────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC(8,2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS donation_expires_at TIMESTAMPTZ;

-- ── 3. Index pour les dons en attente d'association ────────
CREATE INDEX IF NOT EXISTS idx_orders_pending_donation
  ON public.orders(status, is_donation, donation_expires_at)
  WHERE status = 'pending_association' AND is_donation = TRUE;

-- ── 4. Commentaires ────────────────────────────────────────
COMMENT ON COLUMN public.orders.service_fee_amount IS 'Frais de service plateforme facturés au client (1.5% + 0.50€)';
COMMENT ON COLUMN public.orders.donation_expires_at IS 'Date/heure d expiration du don client (fin créneau retrait)';
