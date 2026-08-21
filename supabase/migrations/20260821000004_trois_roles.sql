-- Trois rôles, et non quatre.
--
-- La migration précédente distinguait un « responsable » du propriétaire. C'est
-- une distinction de trop : le propriétaire du compte Kshare **est** le
-- responsable du magasin. Celui qui signe le contrat, détient l'IBAN et pilote
-- Stripe est aussi celui qui suit ses ventes et ses virements.
--
-- Le modèle retenu :
--
--   propriétaire  `commerces.profile_id` — responsable du magasin. Contrat,
--                 IBAN, Stripe, abonnement, comptes de son équipe, et tous les
--                 chiffres. Un seul par magasin.
--   employé       `commerce_acces` — publie des paniers, traite les commandes,
--                 scanne les retraits. Aucun chiffre financier.
--   direction     `groupe_acces` — lecture seule sur tout un réseau, sans
--                 pouvoir agir sur aucun magasin.
--
-- Aucune délégation n'existe en base : rien à réécrire.

ALTER TABLE public.commerce_acces DROP CONSTRAINT IF EXISTS commerce_acces_role;
ALTER TABLE public.commerce_acces
  ADD CONSTRAINT commerce_acces_role CHECK (role IN ('employe'));

COMMENT ON COLUMN public.commerce_acces.role IS
  'employe : exploitation seule, aucun acces aux chiffres du magasin';

-- La fonction subsiste, réduite au propriétaire. On aurait pu la supprimer et
-- réécrire les politiques avec `profile_id = auth.uid()`, mais la garder nomme
-- l'intention là où elle est lue : « les magasins dont je vois les comptes ».
-- Le jour où un second rôle financier apparaîtrait, un seul endroit changerait.
CREATE OR REPLACE FUNCTION public.mes_commerces_geres()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT id FROM public.commerces WHERE profile_id = auth.uid();
$fn$;

COMMENT ON FUNCTION public.mes_commerces_geres IS
  'Magasins dont l''utilisateur courant voit les comptes : le proprietaire, lui seul';

-- Les employés ne gèrent pas les comptes : seul le propriétaire le fait, ce que
-- couvre déjà `commerce_acces_proprietaire`.
DROP POLICY IF EXISTS commerce_acces_responsable_lit ON public.commerce_acces;
DROP POLICY IF EXISTS commerce_acces_responsable_ajoute ON public.commerce_acces;
DROP POLICY IF EXISTS commerce_acces_responsable_retire ON public.commerce_acces;
