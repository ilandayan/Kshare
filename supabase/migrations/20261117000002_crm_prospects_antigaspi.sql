-- Présence des prospects sur les applis anti-gaspi concurrentes.
--
-- L'ancien CRM (Cowork/Kshare/outreach/crm.py, sur le fichier
-- « commerces casher france V5.xlsx ») avait un filtre TGTG / Phénix. Il
-- cherchait les mots « tgtg » et « phenix » dans la colonne Notes. L'import
-- dans l'espace admin a versé ces notes dans prospect_activities, en texte
-- libre : l'information est restée, le filtre a disparu.
--
-- On en fait un vrai champ. NULL veut dire « pas encore vérifié », ce qui
-- n'est pas la même chose que « sur aucune » : l'ancien filtre confondait les
-- deux, et rangeait 1 040 fiches jamais vérifiées parmi les commerces libres.

alter table public.prospects
  add column if not exists antigaspi text
  constraint prospects_antigaspi_check
    check (antigaspi in ('tgtg', 'phenix', 'tgtg_phenix', 'aucune'));

comment on column public.prospects.antigaspi is
  'Applis anti-gaspi du commerce : tgtg, phenix, tgtg_phenix, aucune. NULL = non vérifié.';

-- Les treize fiches marquées dans V5, rapprochées une à une par nom et code
-- postal (une correspondance exacte chacune).
update public.prospects set antigaspi = 'tgtg' where id in (
  '19d1bfa2-0e78-4171-b1d5-1ec6ff91c7d3', -- Bekef Traiteur & Nos Chabbat, 92300
  'a45b90f4-fad3-4423-b357-8c2efdd40029', -- Kosher Place, 78170
  '733e830c-573c-4202-a77b-fb4825b97e6b', -- Le XXV Levallois, 92300
  '4f9ea12c-0430-46a0-aa17-62ee83c820b8', -- Le XXV Levallois Perret, 92300
  '116cb91d-f02e-4506-b2bc-c24db57583ab', -- Le XXV Neuilly, 92200
  'eaa19c98-a3e9-41cf-a70d-a30f1b054bf1', -- Le XXV Saint-Honoré, 75008
  '98c5b311-0f0b-4e04-9230-91957036898f', -- THE RESERVE, 92300
  'ffe74207-0b46-47cb-8284-abdf4d2a0de9', -- The Reserve Paris 16, 75016
  'c2b2c3f5-ca83-4952-88dd-743b9567c5bd', -- The Reserve Boulogne, 92100
  'cf31cef2-3680-4dc5-a035-7c310cfa7f0a', -- Falafel Gégé K, 75013
  '39ebe897-e578-4b36-baeb-c2814b40c1f9'  -- Sheli Pâtisserie, 94160
) and antigaspi is null;

update public.prospects set antigaspi = 'phenix' where id in (
  'a3e1db1a-beb7-4030-83d5-83c4775ca108', -- Douieb, 75009
  '7efd65cd-bb64-4abd-8f22-bdfa1f69f2e8'  -- Temptation 94, 94220
) and antigaspi is null;

-- La facette s'ajoute à celles du CRM. Les droits sont reposés à l'identique
-- de 20261117000001 : la fonction ne sert qu'au client service du CRM.
CREATE OR REPLACE FUNCTION public.crm_prospects_facettes()
RETURNS TABLE (facette TEXT, valeur TEXT, nombre INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  select 'type'::text, commerce_type, count(*)::integer
  from public.prospects
  where commerce_type is not null and commerce_type <> ''
  group by commerce_type
  union all
  select 'region'::text, region, count(*)::integer
  from public.prospects
  where region is not null and region <> ''
  group by region
  union all
  select 'cuisine'::text, cuisine_type, count(*)::integer
  from public.prospects
  where cuisine_type is not null and cuisine_type <> ''
  group by cuisine_type
  union all
  select 'ville'::text, city, count(*)::integer
  from public.prospects
  where city is not null and city <> ''
  group by city
  union all
  select 'cacherout'::text, hashgakha, count(*)::integer
  from public.prospects
  where hashgakha is not null and hashgakha <> ''
  group by hashgakha
  union all
  -- 'inconnu' pour les fiches jamais vérifiées, compté comme les autres.
  select 'antigaspi'::text, coalesce(antigaspi, 'inconnu'), count(*)::integer
  from public.prospects
  group by coalesce(antigaspi, 'inconnu')
  order by 1, 3 desc;
$fn$;

revoke all on function public.crm_prospects_facettes() from public, anon, authenticated;
grant execute on function public.crm_prospects_facettes() to service_role;
