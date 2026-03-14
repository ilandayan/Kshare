-- Fix #5: DEFAULT commission 15% → 18% (plan Starter)
ALTER TABLE public.commerces
  ALTER COLUMN commission_rate SET DEFAULT 18;

ALTER TABLE public.subscriptions
  ALTER COLUMN commission_rate SET DEFAULT 18;

-- Fix commentaire table subscriptions (30€ → plans Starter/Pro)
COMMENT ON TABLE public.subscriptions IS 'Abonnements commerces : Starter (gratuit, 18%) ou Pro (29€/mois, 12%)';

-- Fix #15: Ajouter colonne stripe_fee_amount sur orders (utilisée par le webhook)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_fee_amount NUMERIC(8,2);

