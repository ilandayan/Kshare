-- Séparation commission / abonnement, et rattrapage des remboursements
-- survenus après l'émission d'une facture.
--
-- Trois défauts de la première version sont corrigés ici :
--   1. commission et abonnement figuraient sur le même document, alors que ce
--      sont deux prestations, deux périodicités et deux modes de règlement ;
--   2. un remboursement postérieur à l'émission n'était rattrapé nulle part —
--      la facture du mois étant figée, l'écart restait perdu ;
--   3. le calcul vivait en TypeScript, ce qui imposait de paginer et rendait
--      impossible de comparer deux colonnes entre elles.

-- ── 1. Deux natures de facture ────────────────────────────────────

alter table public.invoices
  add column if not exists kind text not null default 'commission',
  -- Les commandes couvertes, figées à la création du brouillon. Sans cette
  -- liste, l'émission ne saurait pas quelles commandes marquer comme
  -- facturées, et le rattrapage du mois suivant serait aveugle.
  add column if not exists order_ids uuid[] not null default '{}',
  -- Part du montant qui corrige une période antérieure. Négative lorsqu'un
  -- remboursement est intervenu après l'émission de la facture concernée.
  add column if not exists adjustment_total numeric(10,2) not null default 0,
  -- Le détail commande par commande, figé lui aussi : l'annexe d'une facture
  -- réémise doit être identique à celle de l'original, même si une commande a
  -- été remboursée entre-temps.
  add column if not exists order_detail jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'invoices_kind_check'
  ) then
    alter table public.invoices
      add constraint invoices_kind_check check (kind in ('commission', 'subscription'));
  end if;
end $$;

comment on column public.invoices.kind is
  'Nature de la prestation facturée. Commission et abonnement font deux documents distincts.';

-- Une facture de commission et une facture d'abonnement coexistent sur la même
-- période : l'unicité doit tenir compte de la nature.
drop index if exists public.invoices_periode_unique;
create unique index if not exists invoices_periode_unique
  on public.invoices (commerce_id, period_start, kind) where status <> 'canceled';

-- ── 2. Ce qui a déjà été facturé, commande par commande ───────────
--
-- C'est la mémoire qui permet le rattrapage : en comparant la commission due
-- aujourd'hui à celle déjà portée sur une facture, l'écart se déduit tout seul,
-- qu'il vienne d'un remboursement tardif ou d'une commande oubliée.

alter table public.orders
  add column if not exists commission_invoiced numeric(10,2) not null default 0,
  add column if not exists invoiced_on date;

comment on column public.orders.commission_invoiced is
  'Commission déjà portée sur une facture émise. L''écart avec la commission due alimente la régularisation du mois suivant.';

create index if not exists orders_facturation_idx
  on public.orders (commerce_id, captured_at)
  where capture_status in ('captured', 'partially_captured') and is_donation = false;

-- ── 3. Le calcul, en base ─────────────────────────────────────────
--
-- Écrit en SQL et non en TypeScript : la comparaison entre commission due et
-- commission déjà facturée porte sur deux colonnes, ce que l'API REST ne sait
-- pas exprimer, et l'agrégation évite d'avoir à ramener puis paginer des
-- milliers de commandes.

-- Le détail remonte le brut et le rendu séparément : un remboursement accordé
-- pendant la période était sinon silencieusement absorbé dans la commission
-- nette, et la facture n'en disait rien.

create or replace function public.facturation_detail(
  p_debut timestamptz,
  p_fin timestamptz,
  p_commerce uuid default null
)
returns table (
  commerce_id uuid,
  order_id uuid,
  captured_at timestamptz,
  vente numeric,
  vente_brute numeric,
  rembourse numeric,
  commission_brute numeric,
  commission_rendue numeric,
  commission_facturee numeric,
  delta numeric,
  remboursement_integral boolean,
  est_regularisation boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.commerce_id,
    o.id,
    o.captured_at,
    coalesce(o.captured_amount, o.total_amount) - o.refunded_amount,
    coalesce(o.captured_amount, o.total_amount),
    o.refunded_amount,
    o.commission_amount,
    o.commission_refunded,
    o.commission_invoiced,
    (o.commission_amount - o.commission_refunded) - o.commission_invoiced,
    o.refunded_amount >= coalesce(o.captured_amount, o.total_amount),
    o.captured_at < p_debut
  from public.orders o
  join public.commerces c on c.id = o.commerce_id and c.is_demo = false
  where o.capture_status in ('captured', 'partially_captured')
    and o.is_donation = false
    and o.captured_at is not null
    and (p_commerce is null or o.commerce_id = p_commerce)
    and (
      -- Les commandes du mois, pas encore portées sur une facture.
      (o.captured_at >= p_debut and o.captured_at < p_fin and o.invoiced_on is null)
      -- Les commandes antérieures dont la commission due a bougé depuis :
      -- remboursement tardif, ou commande jamais facturée.
      or (
        o.captured_at < p_debut
        and (o.commission_amount - o.commission_refunded) <> o.commission_invoiced
      )
    )
  order by o.captured_at;
$$;

comment on function public.facturation_detail(timestamptz, timestamptz, uuid) is
  'Commandes à facturer sur la période, brut et rendu séparés, régularisations comprises.';

-- Trois blocs distincts : la période, les remboursements de la période, et les
-- corrections des périodes déjà facturées. Les confondre revenait à présenter
-- une commission amputée sans en donner la raison.

create or replace function public.facturation_recap(p_debut timestamptz, p_fin timestamptz)
returns table (
  commerce_id uuid,
  paniers integer,
  ventes_brutes numeric,
  commission_brute numeric,
  remb_periode_base numeric,
  remb_periode_montant numeric,
  remb_periode_commandes integer,
  remise_base numeric,
  remise_montant numeric,
  remise_commandes integer,
  reprise_base numeric,
  reprise_montant numeric,
  reprise_commandes integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.commerce_id,
    count(*) filter (where not d.est_regularisation)::integer,
    coalesce(sum(d.vente_brute) filter (where not d.est_regularisation), 0),
    coalesce(sum(d.commission_brute) filter (where not d.est_regularisation), 0),
    coalesce(sum(d.rembourse) filter (where not d.est_regularisation), 0),
    coalesce(-sum(d.commission_rendue) filter (where not d.est_regularisation), 0),
    count(*) filter (where not d.est_regularisation and d.rembourse > 0)::integer,
    -- L'assiette se déduit de la commission rendue plutôt que du cumul
    -- remboursé : un second remboursement partiel sur une commande déjà
    -- corrigée compterait sinon deux fois la première part.
    coalesce(
      sum(-d.delta * d.vente_brute / nullif(d.commission_brute, 0))
        filter (where d.est_regularisation and d.delta < 0),
      0
    ),
    coalesce(sum(d.delta) filter (where d.est_regularisation and d.delta < 0), 0),
    count(*) filter (where d.est_regularisation and d.delta < 0)::integer,
    coalesce(sum(d.vente_brute) filter (where d.est_regularisation and d.delta > 0), 0),
    coalesce(sum(d.delta) filter (where d.est_regularisation and d.delta > 0), 0),
    count(*) filter (where d.est_regularisation and d.delta > 0)::integer
  from public.facturation_detail(p_debut, p_fin, null) d
  group by d.commerce_id;
$$;

comment on function public.facturation_recap(timestamptz, timestamptz) is
  'Agrégat par commerce : période, remboursements de la période, corrections antérieures.';

-- ── 4. L'émission marque les commandes couvertes ──────────────────
--
-- Sans ce marquage, la même commande reviendrait sur la facture du mois
-- suivant, et un remboursement tardif ne trouverait aucun point de comparaison.

create or replace function public.emettre_facture(p_invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
  v_seq bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Facture introuvable';
  end if;
  if v_invoice.status <> 'draft' then
    raise exception 'Seul un brouillon peut être émis';
  end if;
  if v_invoice.commerce_snapshot is null then
    raise exception 'Identité du commerce manquante : facture non émissible';
  end if;

  v_seq := nextval('public.invoice_number_seq');

  update public.invoices
  set sequence_number = v_seq,
      -- Une seule série pour les deux natures : la suite reste continue, ce que
      -- deux séries parallèles rendraient plus fragile à vérifier.
      number = 'KS-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0'),
      status = 'issued',
      issued_at = now(),
      updated_at = now()
  where id = p_invoice_id
  returning * into v_invoice;

  if v_invoice.kind = 'commission' and array_length(v_invoice.order_ids, 1) > 0 then
    update public.orders o
    set commission_invoiced = o.commission_amount - o.commission_refunded,
        invoiced_on = current_date
    where o.id = any(v_invoice.order_ids);
  end if;

  return v_invoice;
end;
$$;

-- L'annulation rend les commandes facturables à nouveau : sans cela, une
-- facture annulée par erreur emporterait sa recette avec elle.
create or replace function public.annuler_facture(p_invoice_id uuid, p_motif text)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if coalesce(trim(p_motif), '') = '' then
    raise exception 'Un motif d''annulation est obligatoire';
  end if;

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Facture introuvable';
  end if;
  if v_invoice.status <> 'issued' then
    raise exception 'Seule une facture émise peut être annulée';
  end if;

  if v_invoice.kind = 'commission' and array_length(v_invoice.order_ids, 1) > 0 then
    update public.orders o
    set commission_invoiced = 0,
        invoiced_on = null
    where o.id = any(v_invoice.order_ids);
  end if;

  update public.invoices
  set status = 'canceled',
      canceled_at = now(),
      cancel_reason = trim(p_motif),
      updated_at = now()
  where id = p_invoice_id
  returning * into v_invoice;

  return v_invoice;
end;
$$;
