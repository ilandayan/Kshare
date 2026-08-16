-- File d'envoi des emails aux associations.
--
-- Quand un commerçant a désigné une bénéficiaire, les autres associations du
-- rayon ne doivent être prévenues qu'à la fin des deux heures d'exclusivité.
--
-- On ne programme pas l'email chez le prestataire d'envoi : il partirait même
-- si la bénéficiaire avait pris le panier entre-temps, et une association se
-- déplacerait pour rien. On dépose une intention d'envoi, relue au moment où
-- elle part. C'est cette relecture, et non une annulation, qui garantit qu'on
-- n'écrit jamais pour un panier déjà parti — quel que soit le chemin par lequel
-- il a été réservé, application mobile ou espace web.

CREATE TABLE IF NOT EXISTS public.donation_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES public.baskets(id) ON DELETE CASCADE,
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  send_after TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  -- Pourquoi l'envoi n'a pas eu lieu : panier parti, association injoignable…
  skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Une seule intention par panier et par association : republier un panier ne
  -- doit pas écrire deux fois à la même association.
  UNIQUE (basket_id, association_id)
);

COMMENT ON TABLE public.donation_email_queue IS
  'Emails aux associations à envoyer plus tard, relus au moment de l''envoi';

CREATE INDEX IF NOT EXISTS idx_donation_email_queue_a_envoyer
  ON public.donation_email_queue(send_after)
  WHERE sent_at IS NULL AND skipped_reason IS NULL;

ALTER TABLE public.donation_email_queue ENABLE ROW LEVEL SECURITY;

-- Personne n'y touche depuis un navigateur : seuls le cron et les actions
-- serveur, qui passent par la clé de service et ignorent la RLS.
DROP POLICY IF EXISTS "admin lit la file" ON public.donation_email_queue;
CREATE POLICY "admin lit la file" ON public.donation_email_queue
  FOR SELECT TO authenticated
  USING (public.is_admin());
