-- Le CRM ne comptait pas les dons dans les ventes. Les deux autres écrans, si.
--
-- `crm_chiffres` filtrait `not is_donation` sur la somme des ventes, alors que
-- le tableau de bord admin (`agregerRecettes`) et le relevé remis au commerçant
-- (`relevesPeriode`) additionnent toutes les commandes encaissées. Trois écrans,
-- deux définitions du même mot.
--
-- C'est le CRM qui avait tort : un don client **est** une vente, le client paie
-- et le commerce est payé. Le panier offert par le commerce, lui, vaut zéro et
-- ne change donc rien à la somme.
--
-- Le compte de paniers continue d'exclure les dons : c'est un nombre d'articles
-- vendus, pas un montant.

CREATE OR REPLACE FUNCTION public.crm_chiffres(p_debut TIMESTAMPTZ, p_fin TIMESTAMPTZ)
RETURNS TABLE (
  mois DATE,
  paniers INTEGER,
  ventes NUMERIC,
  commission NUMERIC,
  commission_rendue NUMERIC,
  frais_service NUMERIC,
  frais_stripe NUMERIC,
  remboursements NUMERIC,
  dons INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  select
    date_trunc('month', o.captured_at)::date,
    count(*) filter (where not o.is_donation)::integer,
    coalesce(sum(coalesce(o.captured_amount, o.total_amount) - o.refunded_amount), 0),
    coalesce(sum(o.commission_amount) filter (where not o.is_donation), 0),
    coalesce(sum(o.commission_refunded) filter (where not o.is_donation), 0),
    coalesce(sum(o.service_fee_amount), 0),
    coalesce(sum(o.stripe_fee_amount), 0),
    coalesce(sum(o.refunded_amount), 0),
    count(*) filter (where o.is_donation)::integer
  from public.orders o
  join public.commerces c on c.id = o.commerce_id and c.is_demo = false
  where o.capture_status in ('captured', 'partially_captured')
    and o.captured_at is not null
    and o.captured_at >= p_debut
    and o.captured_at < p_fin
  group by 1
  order by 1;
$fn$;
