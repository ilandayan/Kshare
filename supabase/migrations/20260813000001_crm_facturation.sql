-- Facturation des commissions aux commerces.
--
-- Une facture est un document légal : son numéro doit être séquentiel et sans
-- trou, ses montants figés, et l'identité des parties telle qu'elle était au
-- jour de l'émission. Cette migration met le socle posé en 20260812000001 en
-- conformité avec ces trois exigences.

-- ── 1. Le numéro se prend à l'émission, pas à la création ─────────
--
-- Le socle donnait un numéro de séquence par défaut dès l'insertion. Un
-- brouillon abandonné consommait donc un numéro, et la suite des factures
-- émises présentait un trou — exactement ce que l'administration fiscale
-- reproche. Un brouillon n'a désormais ni numéro ni rang : il les reçoit au
-- moment où il devient une facture.

alter table public.invoices alter column sequence_number drop default;
alter table public.invoices alter column sequence_number drop not null;
alter table public.invoices alter column number drop not null;

-- Les contraintes d'unicité posées par le socle portaient sur des colonnes
-- désormais nullables : en Postgres, plusieurs NULL ne se heurtent pas, les
-- brouillons cohabitent donc sans conflit et les factures émises restent
-- uniques.

-- ── 2. Ce que porte une facture ───────────────────────────────────

alter table public.invoices
  -- Le détail figé des lignes. Recalculer une facture émise à partir des
  -- commandes reviendrait à la réécrire : si une commande est remboursée en
  -- avril, la facture de mars ne doit pas changer.
  add column if not exists lines jsonb not null default '[]'::jsonb,
  -- L'identité du commerce au jour de l'émission. Un changement de raison
  -- sociale ne doit pas réécrire les factures passées.
  add column if not exists commerce_snapshot jsonb,
  add column if not exists subscription_amount numeric(10,2) not null default 0,
  add column if not exists commission_rate numeric(5,2),
  add column if not exists plan text,
  add column if not exists sales_total numeric(10,2) not null default 0,
  -- Reste à payer. Vaut zéro dans le cas courant : la commission est prélevée
  -- à la source par Stripe et l'abonnement par SEPA. La facture constate, elle
  -- n'appelle pas de règlement.
  add column if not exists due_amount numeric(10,2) not null default 0,
  add column if not exists canceled_at timestamptz,
  add column if not exists cancel_reason text;

comment on column public.invoices.lines is
  'Lignes figées à l''émission. Une facture émise ne se recalcule jamais.';
comment on column public.invoices.due_amount is
  'Reste à payer. Zéro quand la commission a déjà été prélevée à la source.';

-- ── 3. Émission atomique ──────────────────────────────────────────
--
-- Numéro, rang et date d'émission sont posés dans un seul ordre SQL : deux
-- émissions simultanées ne peuvent pas se voir attribuer le même numéro.

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
  -- `is_admin()` s'appuie sur auth.uid(), nul lorsque l'appel vient du serveur
  -- avec la clé de service. L'espace de gestion appelle par cette voie après
  -- avoir vérifié le rôle : les deux chemins sont donc admis.
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
      number = 'KS-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0'),
      status = 'issued',
      issued_at = now(),
      updated_at = now()
  where id = p_invoice_id
  returning * into v_invoice;

  return v_invoice;
end;
$$;

comment on function public.emettre_facture(uuid) is
  'Attribue numéro et rang à un brouillon et le passe en émis, en une seule transaction.';

-- Une facture émise ne se supprime pas : elle s'annule, et le numéro reste
-- consommé. C'est la règle qui garantit l'absence de trou dans la suite.
create or replace function public.invoices_no_delete_issued()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'draft' then
    raise exception 'Une facture émise ne peut pas être supprimée. Annulez-la.';
  end if;
  return old;
end;
$$;

drop trigger if exists invoices_protect_issued on public.invoices;
create trigger invoices_protect_issued
  before delete on public.invoices
  for each row execute function public.invoices_no_delete_issued();

-- ── 4. Traçabilité des remboursements sur la commande ─────────────
--
-- Un remboursement partiel rend à Stripe une part de la commission, mais rien
-- n'en gardait trace : `commission_amount` restait au montant d'origine et la
-- facture du mois aurait surfacturé le commerce. On enregistre désormais ce
-- qui a été rendu.

alter table public.orders
  add column if not exists refunded_amount numeric(10,2) not null default 0,
  add column if not exists commission_refunded numeric(10,2) not null default 0;

comment on column public.orders.commission_refunded is
  'Part de commission rendue au client lors d''un remboursement. Se déduit de la facturation du mois.';

create index if not exists orders_captured_at_idx
  on public.orders (captured_at) where captured_at is not null;

-- ── 5. Stockage des PDF ───────────────────────────────────────────
--
-- Bucket privé : une facture nomme un commerce et des montants. Le commerce
-- lit les siennes, l'admin lit tout, l'écriture reste au service_role.

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

drop policy if exists "Lecture des factures" on storage.objects;
create policy "Lecture des factures" on storage.objects
  for select
  using (
    bucket_id = 'invoices'
    AND (
      exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
      -- Chemin : {commerce_id}/{numero}.pdf
      OR (storage.foldername(name))[1] in (
        select c.id::text from public.commerces c where c.profile_id = auth.uid()
      )
    )
  );
