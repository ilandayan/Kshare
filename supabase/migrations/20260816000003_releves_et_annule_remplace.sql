-- Relevés de ventes, et correction des documents déjà émis.
--
-- Deux manques que les commerces auraient fini par signaler eux-mêmes :
--
-- 1. **Aucun justificatif de leurs ventes.** Kshare leur facture une
--    commission, mais rien ne récapitule ce qu'ils ont vendu. Leur comptable
--    réclamera ce document dès le premier bilan, et leurs seules pièces sont
--    aujourd'hui un tableau de bord et des virements.
-- 2. **Aucun moyen de corriger.** Une facture émise est figée, à dessein — mais
--    une erreur constatée après coup n'avait alors aucune issue.

-- ── Relevés de ventes ────────────────────────────────────────────
--
-- Ce n'est pas une facture : le commerce est le vendeur, Kshare ne fait que
-- constater ce qui a transité. Pas de numérotation légale continue, donc, mais
-- la même discipline de gel : un relevé envoyé ne se recalcule pas.

create table if not exists public.sales_statements (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  commerce_id uuid not null references public.commerces(id),
  period_start date not null,
  period_end date not null,
  -- Prix de vente encaissé, remboursements déduits. C'est le chiffre
  -- d'affaires que le commerce doit déclarer : la commission en est une
  -- charge, pas une réduction.
  sales_total numeric(10,2) not null default 0,
  commission_total numeric(10,2) not null default 0,
  service_fees_total numeric(10,2) not null default 0,
  refunds_total numeric(10,2) not null default 0,
  net_total numeric(10,2) not null default 0,
  orders_count integer not null default 0,
  donations_count integer not null default 0,
  -- Détail figé, commande par commande.
  lines jsonb not null default '[]'::jsonb,
  commerce_snapshot jsonb,
  status text not null default 'issued' check (status in ('issued', 'canceled')),
  -- Chaînage des corrections : un relevé qui en remplace un autre le désigne.
  replaces_id uuid references public.sales_statements(id),
  cancel_reason text,
  canceled_at timestamptz,
  pdf_url text,
  issued_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sales_statements_commerce_idx
  on public.sales_statements (commerce_id, period_start desc);
create unique index if not exists sales_statements_periode_unique
  on public.sales_statements (commerce_id, period_start) where status <> 'canceled';

comment on table public.sales_statements is
  'Relevé mensuel des ventes d''un commerce. Justificatif de son chiffre d''affaires, la commission en étant une charge.';

alter table public.sales_statements enable row level security;

-- Le commerce lit les siens, l'admin lit tout. C'est son document.
drop policy if exists sales_statements_admin on public.sales_statements;
create policy sales_statements_admin on public.sales_statements
  for all using (is_admin()) with check (is_admin());

drop policy if exists sales_statements_commerce on public.sales_statements;
create policy sales_statements_commerce on public.sales_statements
  for select using (
    commerce_id in (select c.id from public.commerces c where c.profile_id = auth.uid())
  );

-- ── Annule et remplace ───────────────────────────────────────────
--
-- Une facture émise ne se modifie pas : elle s'annule, et un nouveau document
-- la remplace en la désignant. Le numéro d'origine reste consommé, la suite
-- reste sans trou, et la piste d'audit est lisible dans les deux sens.

alter table public.invoices
  add column if not exists replaces_id uuid references public.invoices(id);

comment on column public.invoices.replaces_id is
  'Facture que celle-ci annule et remplace. Le PDF porte la mention et le numéro d''origine.';

create index if not exists invoices_replaces_idx on public.invoices (replaces_id)
  where replaces_id is not null;

/**
 * Annule une facture et prépare son remplaçant.
 *
 * En une transaction : l'original passe en annulé, ses commandes redeviennent
 * facturables, et un brouillon reprend son contenu en la désignant. Le
 * remplaçant recevra son propre numéro à l'émission.
 */
create or replace function public.remplacer_facture(p_invoice_id uuid, p_motif text)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origine public.invoices;
  v_remplacante public.invoices;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if coalesce(trim(p_motif), '') = '' then
    raise exception 'Un motif est obligatoire';
  end if;

  select * into v_origine from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Facture introuvable';
  end if;
  if v_origine.status <> 'issued' then
    raise exception 'Seule une facture émise peut être remplacée';
  end if;

  -- Les commandes redeviennent facturables : sans cela le remplaçant
  -- naîtrait vide, le recalcul les croyant déjà réglées.
  if v_origine.kind = 'commission' and array_length(v_origine.order_ids, 1) > 0 then
    update public.orders o
    set commission_invoiced = 0, invoiced_on = null
    where o.id = any(v_origine.order_ids);
  end if;

  update public.invoices
  set status = 'canceled',
      canceled_at = now(),
      cancel_reason = trim(p_motif),
      updated_at = now()
  where id = p_invoice_id;

  insert into public.invoices (
    kind, commerce_id, period_start, period_end,
    amount_ht, vat_rate, vat_amount, amount_ttc,
    commission_total, subscription_amount, adjustment_total, commission_rate, plan,
    sales_total, orders_count, due_amount,
    lines, order_detail, order_ids, commerce_snapshot,
    status, replaces_id, notes
  )
  values (
    v_origine.kind, v_origine.commerce_id, v_origine.period_start, v_origine.period_end,
    v_origine.amount_ht, v_origine.vat_rate, v_origine.vat_amount, v_origine.amount_ttc,
    v_origine.commission_total, v_origine.subscription_amount, v_origine.adjustment_total,
    v_origine.commission_rate, v_origine.plan,
    v_origine.sales_total, v_origine.orders_count, v_origine.due_amount,
    v_origine.lines, v_origine.order_detail, v_origine.order_ids, v_origine.commerce_snapshot,
    'draft', p_invoice_id, trim(p_motif)
  )
  returning * into v_remplacante;

  return v_remplacante;
end;
$$;

comment on function public.remplacer_facture(uuid, text) is
  'Annule une facture émise et crée le brouillon qui la remplace, en la désignant.';

/** Même mécanique pour un relevé de ventes. */
create or replace function public.remplacer_releve(p_statement_id uuid, p_motif text)
returns public.sales_statements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origine public.sales_statements;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if coalesce(trim(p_motif), '') = '' then
    raise exception 'Un motif est obligatoire';
  end if;

  select * into v_origine from public.sales_statements where id = p_statement_id for update;
  if not found then
    raise exception 'Relevé introuvable';
  end if;
  if v_origine.status <> 'issued' then
    raise exception 'Ce relevé est déjà annulé';
  end if;

  update public.sales_statements
  set status = 'canceled',
      canceled_at = now(),
      cancel_reason = trim(p_motif)
  where id = p_statement_id;

  return v_origine;
end;
$$;

comment on function public.remplacer_releve(uuid, text) is
  'Annule un relevé émis. Le remplaçant est recalculé puis inséré par l''application.';
