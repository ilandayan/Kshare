-- Socle du CRM Kshare : prospection, facturation, charges, documents.
--
-- Le CRM vit dans l'application Kshare et lit les mêmes tables que l'espace
-- admin : la synchronisation n'est pas une fonctionnalité, c'est la
-- conséquence d'une base unique.

-- ── Prospection ──────────────────────────────────────────────────
-- La table `prospects` existait, vide et trop pauvre pour accueillir le
-- fichier de démarchage : il portait adresse, région, portable, site et
-- certification, absents du modèle.

alter table public.prospects
  add column if not exists address text,
  add column if not exists region text,
  add column if not exists mobile text,
  add column if not exists website text,
  add column if not exists hashgakha text,
  add column if not exists sources text,
  add column if not exists category text,
  add column if not exists cuisine_type text,
  add column if not exists external_links jsonb,
  add column if not exists next_action_at timestamptz;

comment on column public.prospects.next_action_at is
  'Date de relance prévue. Alimente la file de travail quotidienne du CRM.';

create index if not exists prospects_status_idx on public.prospects (status);
create index if not exists prospects_next_action_idx
  on public.prospects (next_action_at) where next_action_at is not null;
create index if not exists prospects_city_idx on public.prospects (city);

-- Historique des échanges. C'est ce qui distingue un CRM d'une liste : sans
-- trace des appels et des emails, on rappelle un commerce déjà relancé la
-- veille.
create table if not exists public.prospect_activities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  type text not null check (type in ('appel', 'email', 'note', 'rdv', 'statut')),
  direction text check (direction in ('sortant', 'entrant')),
  subject text,
  content text,
  outcome text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists prospect_activities_prospect_idx
  on public.prospect_activities (prospect_id, occurred_at desc);

-- ── Facturation ──────────────────────────────────────────────────
-- La numérotation doit être séquentielle et sans trou : une séquence Postgres,
-- jamais un comptage de lignes, qui reculerait après une suppression.

create sequence if not exists public.invoice_number_seq start 1;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint not null unique default nextval('public.invoice_number_seq'),
  number text not null unique,
  commerce_id uuid references public.commerces(id),
  period_start date not null,
  period_end date not null,
  -- Montants figés à l'émission : une facture émise ne se recalcule jamais,
  -- même si les commandes sous-jacentes changent ensuite.
  amount_ht numeric(10,2) not null default 0,
  vat_rate numeric(5,2) not null default 0,
  vat_amount numeric(10,2) not null default 0,
  amount_ttc numeric(10,2) not null default 0,
  commission_total numeric(10,2) not null default 0,
  orders_count integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'issued', 'canceled')),
  pdf_url text,
  issued_at timestamptz,
  sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_commerce_idx on public.invoices (commerce_id, period_start desc);
create unique index if not exists invoices_periode_unique
  on public.invoices (commerce_id, period_start) where status <> 'canceled';

comment on table public.invoices is
  'Factures de commission émises aux commerces. Conservation légale : 10 ans.';
comment on column public.invoices.number is
  'Numéro légal, séquentiel et sans trou, de la forme KS-AAAA-NNNN.';

-- ── Charges ──────────────────────────────────────────────────────
-- En micro-entreprise les charges ne sont pas déductibles du résultat
-- imposable : cette table sert au pilotage de la marge et de la trésorerie,
-- pas au calcul de l'impôt.

create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null,
  amount numeric(10,2) not null,
  vat_amount numeric(10,2) default 0,
  supplier text,
  incurred_on date not null,
  recurring boolean not null default false,
  receipt_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists charges_date_idx on public.charges (incurred_on desc);
create index if not exists charges_category_idx on public.charges (category);

-- ── Documents ────────────────────────────────────────────────────

create table if not exists public.crm_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  file_url text,
  issued_on date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists crm_documents_category_idx on public.crm_documents (category);

-- ── Accès ────────────────────────────────────────────────────────
-- Données de gestion : réservées à l'admin, comme la table prospects.

alter table public.prospect_activities enable row level security;
alter table public.invoices enable row level security;
alter table public.charges enable row level security;
alter table public.crm_documents enable row level security;

drop policy if exists prospect_activities_admin on public.prospect_activities;
create policy prospect_activities_admin on public.prospect_activities
  for all using (is_admin()) with check (is_admin());

drop policy if exists invoices_admin on public.invoices;
create policy invoices_admin on public.invoices
  for all using (is_admin()) with check (is_admin());

drop policy if exists charges_admin on public.charges;
create policy charges_admin on public.charges
  for all using (is_admin()) with check (is_admin());

drop policy if exists crm_documents_admin on public.crm_documents;
create policy crm_documents_admin on public.crm_documents
  for all using (is_admin()) with check (is_admin());
