-- Distingue « compte Stripe créé » de « compte Stripe utilisable ».
--
-- Jusqu'ici, la seule trace de l'onboarding était `stripe_account_id`, qui n'est
-- renseigné qu'au moment où le commerçant démarre lui-même la configuration.
-- La garde de publication s'appuyait dessus, ce qui ne tenait que par accident :
-- dès qu'on crée le compte automatiquement, l'identifiant existe alors que le
-- commerce ne peut ni encaisser ni être viré.
--
-- Ces colonnes reflètent l'état réel renvoyé par Stripe, maintenu par le webhook
-- `account.updated` et par le retour d'onboarding.

alter table public.commerces
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists stripe_details_submitted boolean not null default false,
  add column if not exists stripe_status_updated_at timestamptz;

comment on column public.commerces.stripe_charges_enabled is
  'Stripe autorise l''encaissement. Condition de publication d''un panier payant.';
comment on column public.commerces.stripe_payouts_enabled is
  'Stripe autorise les virements sortants. Condition de reversement hebdomadaire.';
comment on column public.commerces.stripe_details_submitted is
  'Le commerçant a soumis le formulaire d''onboarding, sans garantie qu''il soit validé.';
comment on column public.commerces.stripe_status_updated_at is
  'Dernière synchronisation de ces trois indicateurs avec Stripe.';

-- Les colonnes restent à false : l'état réel sera renseigné au prochain
-- `account.updated` ou au prochain retour d'onboarding. Aucun commerce réel
-- n'a de compte Stripe à ce jour, il n'y a donc rien à rattraper.
