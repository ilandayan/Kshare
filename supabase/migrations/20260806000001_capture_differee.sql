-- Capture différée du paiement des paniers.
--
-- Jusqu'ici le paiement était capturé à la réservation. Un panier non conforme
-- imposait donc un remboursement, dont Stripe ne restitue pas les frais, et
-- laissait au client la possibilité d'une contestation bancaire — bien plus
-- coûteuse, tant en frais qu'en taux de litiges.
--
-- Désormais la réservation ne fait qu'autoriser le paiement. La capture a lieu
-- le soir, pour les retraits confirmés comme pour les no-shows. Un signalement
-- ouvert suspend la capture jusqu'à décision de l'admin, qui peut valider,
-- annuler sans frais, ou capturer partiellement.

alter table public.orders
  add column if not exists capture_status text not null default 'captured',
  add column if not exists captured_amount numeric,
  add column if not exists captured_at timestamptz,
  add column if not exists capture_reason text,
  add column if not exists capture_error text;

-- `captured` par défaut : les commandes existantes ont toutes été encaissées
-- immédiatement, il n'y a rien à rattraper.
alter table public.orders
  drop constraint if exists orders_capture_status_valide;
alter table public.orders
  add constraint orders_capture_status_valide
  check (capture_status in ('pending', 'captured', 'partially_captured', 'canceled', 'failed'));

comment on column public.orders.capture_status is
  'pending = autorisé, non encaissé ; partially_captured = geste commercial ; canceled = autorisation relâchée sans frais.';
comment on column public.orders.captured_amount is
  'Montant réellement encaissé, frais de service compris. Inférieur au total en cas de capture partielle.';
comment on column public.orders.capture_reason is
  'Motif saisi par l''admin lors d''une capture partielle ou d''une annulation. Repris tel quel dans l''email au commerce.';
comment on column public.orders.capture_error is
  'Dernier échec de capture renvoyé par Stripe, à traiter manuellement : le commerce a livré sans être payé.';

-- Retrouver rapidement les commandes en attente de capture, et celles à traiter.
create index if not exists orders_capture_status_idx
  on public.orders (capture_status)
  where capture_status in ('pending', 'failed');
