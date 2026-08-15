-- Socle des onglets Clients, Chiffres et Documents.
--
-- Les agrégats vivent en base pour la même raison que la facturation : une
-- somme calculée en SQL ne bute pas sur la limite de mille lignes de l'API
-- REST, et n'oblige pas à ramener chaque commande pour l'additionner ensuite.

-- ── Clients ──────────────────────────────────────────────────────
--
-- Ce qu'un commerce a réellement rapporté, et depuis quand il ne vend plus.
-- La date de dernière vente est la donnée qui déclenche un appel : un commerce
-- inscrit qui n'a rien vendu depuis six semaines est en train de partir.

create or replace function public.crm_clients()
returns table (
  commerce_id uuid,
  paniers integer,
  ventes numeric,
  commission numeric,
  premiere_vente timestamptz,
  derniere_vente timestamptz,
  paniers_30j integer,
  ventes_30j numeric,
  commission_30j numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.commerce_id,
    count(*)::integer,
    coalesce(sum(coalesce(o.captured_amount, o.total_amount) - o.refunded_amount), 0),
    coalesce(sum(o.commission_amount - o.commission_refunded), 0),
    min(o.captured_at),
    max(o.captured_at),
    count(*) filter (where o.captured_at >= now() - interval '30 days')::integer,
    coalesce(
      sum(coalesce(o.captured_amount, o.total_amount) - o.refunded_amount)
        filter (where o.captured_at >= now() - interval '30 days'),
      0
    ),
    coalesce(
      sum(o.commission_amount - o.commission_refunded)
        filter (where o.captured_at >= now() - interval '30 days'),
      0
    )
  from public.orders o
  where o.capture_status in ('captured', 'partially_captured')
    and o.is_donation = false
    and o.captured_at is not null
  group by o.commerce_id;
$$;

comment on function public.crm_clients() is
  'Volume et commission par commerce, avec la date de dernière vente.';

-- ── Chiffres ─────────────────────────────────────────────────────
--
-- Une ligne par mois. Les frais Stripe sont à la charge de Kshare : ils ne se
-- déduisent pas de la commission du commerce, mais bien de la marge. Les
-- confondre donnait une rentabilité surestimée d'environ un point et demi.

create or replace function public.crm_chiffres(p_debut timestamptz, p_fin timestamptz)
returns table (
  mois date,
  paniers integer,
  ventes numeric,
  commission numeric,
  commission_rendue numeric,
  frais_service numeric,
  frais_stripe numeric,
  remboursements numeric,
  dons integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    date_trunc('month', o.captured_at)::date,
    count(*) filter (where not o.is_donation)::integer,
    coalesce(sum(coalesce(o.captured_amount, o.total_amount) - o.refunded_amount)
      filter (where not o.is_donation), 0),
    coalesce(sum(o.commission_amount) filter (where not o.is_donation), 0),
    coalesce(sum(o.commission_refunded) filter (where not o.is_donation), 0),
    coalesce(sum(o.service_fee_amount), 0),
    -- Non récupérables : les services de paiement sont exonérés de TVA.
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
$$;

comment on function public.crm_chiffres(timestamptz, timestamptz) is
  'Recettes et frais mois par mois. Les frais Stripe pèsent sur la marge, pas sur la commission.';

-- ── Documents ────────────────────────────────────────────────────
--
-- La table existait depuis le socle du CRM, sans nulle part où déposer les
-- fichiers. Bucket privé : on y range des documents d'entreprise.

alter table public.crm_documents
  add column if not exists file_size integer,
  add column if not exists mime_type text,
  add column if not exists uploaded_by uuid references auth.users(id);

comment on column public.crm_documents.file_url is
  'Chemin dans le bucket crm-documents. Jamais une URL publique : le contenu est privé.';

insert into storage.buckets (id, name, public)
values ('crm-documents', 'crm-documents', false)
on conflict (id) do nothing;

-- Réservé à l'admin, dans les deux sens : ces documents ne concernent aucun
-- commerce, ils appartiennent à la gestion de l'entreprise.
drop policy if exists "Documents de gestion" on storage.objects;
create policy "Documents de gestion" on storage.objects
  for all
  using (
    bucket_id = 'crm-documents'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    bucket_id = 'crm-documents'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create index if not exists crm_documents_date_idx on public.crm_documents (issued_on desc nulls last);
