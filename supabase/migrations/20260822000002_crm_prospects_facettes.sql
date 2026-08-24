-- Les valeurs proposées aux filtres de prospection, comptées en base.
--
-- Ramener les lignes pour les compter en mémoire buterait sur la limite de
-- mille résultats de PostgREST — le fichier en compte 1055 — et un filtre qui
-- oublie une valeur est pire que pas de filtre. Le même piège avait déjà faussé
-- les compteurs de statuts.
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
  -- La categorie cachere de l'etablissement : bassari, halavi ou mix. Elle dit
  -- quels paniers il pourrait publier, c'est donc un axe de prospection.
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
  order by 1, 3 desc;
$fn$;

REVOKE ALL ON FUNCTION public.crm_prospects_facettes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.crm_prospects_facettes() FROM anon;
GRANT EXECUTE ON FUNCTION public.crm_prospects_facettes() TO authenticated;
