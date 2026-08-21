-- Le commerçant doit pouvoir voir qui est son employé.
--
-- L'écran `/shop/equipe` affichait « — » et aucune adresse : les politiques de
-- `profiles` n'ouvrent au commerce que les profils de ses **clients**, pas
-- celui du compte qu'il vient lui-même de créer. Il ne pouvait donc pas relire
-- l'adresse à laquelle il avait ouvert l'accès, ni vérifier qu'il ne s'était
-- pas trompé de personne.
--
-- Le défaut ne se voyait ni à la compilation, ni aux tests : la requête ne
-- lève pas d'erreur, elle ne renvoie simplement rien.

-- SECURITY DEFINER pour couper court à l'enchaînement de politiques :
-- `profiles` interrogerait `commerce_acces`, qui interroge `commerces`, qui a
-- ses propres règles. La fonction tranche en une lecture.
CREATE OR REPLACE FUNCTION public.mes_employes()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT ca.profile_id
  FROM public.commerce_acces ca
  JOIN public.commerces c ON c.id = ca.commerce_id
  WHERE c.profile_id = auth.uid();
$fn$;

COMMENT ON FUNCTION public.mes_employes IS
  'Profils des comptes employes des magasins dont l''utilisateur est proprietaire';

REVOKE ALL ON FUNCTION public.mes_employes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mes_employes() FROM anon;
GRANT EXECUTE ON FUNCTION public.mes_employes() TO authenticated;

-- Le propriétaire seul : `mes_employes()` part de `commerces.profile_id`, donc
-- un employé ne peut pas lire le profil d'un autre compte du magasin.
CREATE POLICY profiles_select_mes_employes ON public.profiles
  FOR SELECT USING (id IN (SELECT public.mes_employes()));
