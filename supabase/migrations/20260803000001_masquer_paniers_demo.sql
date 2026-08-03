-- Masque les commerces et paniers de démonstration au public.
--
-- Cinq commerces de seed (identifiants « c0c0c0c0… ») portent les 23 paniers
-- actuellement publiés. Un vrai client peut donc réserver et payer un panier
-- qui n'existe pas. On les marque `is_demo` et on les réserve aux deux comptes
-- de démonstration.
--
-- `test@k-share.fr` est le compte fourni aux examinateurs Apple et Google :
-- l'omettre ferait rejeter la prochaine mise à jour pour absence de contenu.

alter table public.commerces
  add column if not exists is_demo boolean not null default false;

comment on column public.commerces.is_demo is
  'Commerce de démonstration : visible uniquement des comptes de démo et des admins.';

update public.commerces
   set is_demo = true
 where id::text like 'c0c0c0c0%';

-- Comptes autorisés à voir les données de démonstration.
create or replace function public.can_see_demo()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    (auth.jwt() ->> 'email') in ('client@kshare.fr', 'test@k-share.fr'),
    false
  );
$$;

-- SECURITY DEFINER volontaire : la politique de `baskets` doit connaître le
-- statut du commerce parent même quand celui-ci est masqué par sa propre RLS.
-- Sans ça, un commerce invisible ferait passer ses paniers pour non-démo.
create or replace function public.commerce_is_demo(p_commerce_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select c.is_demo from public.commerces c where c.id = p_commerce_id),
    false
  );
$$;

revoke all on function public.commerce_is_demo(uuid) from public;
grant execute on function public.commerce_is_demo(uuid) to anon, authenticated;

drop policy if exists commerces_select_public on public.commerces;
create policy commerces_select_public on public.commerces
  for select
  using (
    (status = 'validated'::commerce_status and (not is_demo or can_see_demo()))
    or profile_id = auth.uid()
    or is_admin()
  );

drop policy if exists baskets_select_published on public.baskets;
create policy baskets_select_published on public.baskets
  for select
  using (
    (status = 'published'::basket_status
      and (not commerce_is_demo(commerce_id) or can_see_demo()))
    or commerce_id in (
      select c.id from public.commerces c where c.profile_id = auth.uid()
    )
    or is_admin()
  );
