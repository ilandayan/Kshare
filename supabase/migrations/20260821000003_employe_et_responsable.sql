-- Deux niveaux d'accès par magasin, au lieu d'un seul.
--
-- La délégation introduite par 20260821000002 ne connaissait qu'un rôle,
-- « equipe », qui voyait aussi bien les paniers que les relevés et les
-- virements. C'est trop pour qui compose les paniers le soir, et pas assez
-- pour un responsable de magasin.
--
-- Quatre niveaux désormais, du plus large au plus étroit :
--
--   propriétaire  `commerces.profile_id` — signe le contrat, détient l'IBAN,
--                 pilote Stripe et l'abonnement. Un seul par magasin.
--   responsable   exploite et voit l'argent : relevés, virements, litiges,
--                 grand livre. Gère les comptes employés de son magasin.
--   employé       publie des paniers, traite les commandes, scanne les
--                 retraits. Ne voit aucun chiffre financier.
--   direction     `groupe_acces` — lecture seule sur tout un réseau, sans
--                 pouvoir agir sur aucun magasin.
--
-- Aucune délégation n'existe encore en base : le changement de contrainte ne
-- réécrit donc aucune ligne.

ALTER TABLE public.commerce_acces DROP CONSTRAINT IF EXISTS commerce_acces_role;
ALTER TABLE public.commerce_acces
  ADD CONSTRAINT commerce_acces_role CHECK (role IN ('employe', 'responsable'));

ALTER TABLE public.commerce_acces ALTER COLUMN role SET DEFAULT 'employe';

COMMENT ON COLUMN public.commerce_acces.role IS
  'employe : exploitation seule · responsable : exploitation et lecture financiere';

-- `mes_commerces()` garde son sens — les magasins où je peux agir — et couvre
-- donc les deux rôles. Elle est déjà posée par la migration précédente.

-- Les magasins dont je peux consulter les comptes. Le propriétaire et le
-- responsable ; jamais l'employé.
CREATE OR REPLACE FUNCTION public.mes_commerces_geres()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT id FROM public.commerces WHERE profile_id = auth.uid()
  UNION
  SELECT commerce_id FROM public.commerce_acces
  WHERE profile_id = auth.uid() AND role = 'responsable';
$fn$;

COMMENT ON FUNCTION public.mes_commerces_geres IS
  'Magasins dont l''utilisateur courant peut consulter les comptes';

REVOKE ALL ON FUNCTION public.mes_commerces_geres() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mes_commerces_geres() FROM anon;
GRANT EXECUTE ON FUNCTION public.mes_commerces_geres() TO authenticated;

-- ---------------------------------------------------------------------------
-- Ce qui relève de l'argent passe au périmètre restreint
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS ledger_select_own ON public.ledger_entries;
CREATE POLICY ledger_select_own ON public.ledger_entries
  FOR SELECT USING ((commerce_id IN (SELECT public.mes_commerces_geres())) OR is_admin());

DROP POLICY IF EXISTS payouts_select_own ON public.payouts;
CREATE POLICY payouts_select_own ON public.payouts
  FOR SELECT USING ((commerce_id IN (SELECT public.mes_commerces_geres())) OR is_admin());

DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT USING ((commerce_id IN (SELECT public.mes_commerces_geres())) OR is_admin());

DROP POLICY IF EXISTS sales_statements_commerce ON public.sales_statements;
CREATE POLICY sales_statements_commerce ON public.sales_statements
  FOR SELECT USING (commerce_id IN (SELECT public.mes_commerces_geres()));

-- Un litige met en cause de l'argent déjà encaissé et l'arbitrage qui suivra :
-- c'est une affaire de responsable, pas de l'équipe du soir.
DROP POLICY IF EXISTS disputes_select_own ON public.disputes;
CREATE POLICY disputes_select_own ON public.disputes
  FOR SELECT USING ((commerce_id IN (SELECT public.mes_commerces_geres())) OR is_admin());

-- Les paniers, les commandes, les tickets et les clients restent au périmètre
-- large : c'est le travail quotidien, celui pour lequel l'employé a un compte.

-- ---------------------------------------------------------------------------
-- Le responsable gère les comptes employés de son magasin
-- ---------------------------------------------------------------------------

-- Il ne peut créer que des employés : sans cette borne, un responsable se
-- promouvrait lui-même ou nommerait un pair, et le propriétaire perdrait la
-- main sur qui voit ses comptes.
CREATE POLICY commerce_acces_responsable_lit ON public.commerce_acces
  FOR SELECT USING (commerce_id IN (SELECT public.mes_commerces_geres()));

CREATE POLICY commerce_acces_responsable_ajoute ON public.commerce_acces
  FOR INSERT WITH CHECK (
    role = 'employe' AND commerce_id IN (SELECT public.mes_commerces_geres())
  );

CREATE POLICY commerce_acces_responsable_retire ON public.commerce_acces
  FOR DELETE USING (
    role = 'employe' AND commerce_id IN (SELECT public.mes_commerces_geres())
  );
