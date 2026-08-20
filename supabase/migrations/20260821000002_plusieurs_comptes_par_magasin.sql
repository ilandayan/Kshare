-- Plusieurs comptes pour un même magasin.
--
-- Jusqu'ici un magasin n'avait qu'un compte : `commerces.profile_id`, unique.
-- L'équipe du soir, celle qui compose et publie les paniers, partageait donc
-- l'identifiant du gérant. Une chaîne le refusera, et ce n'est pas tenable non
-- plus pour un commerce isolé.
--
-- `commerce_acces` ajoute des comptes délégués à côté du propriétaire, qui
-- reste `commerces.profile_id`. Ce choix est délibéré : la colonne sert de
-- référence dans une douzaine de politiques et le propriétaire doit rester
-- identifiable — c'est lui qui signe le contrat et perçoit les virements.
--
-- **Les délégués ont des droits d'exploitation, pas de gestion.** Ils publient
-- des paniers, voient et traitent les commandes, consultent les relevés. Ils ne
-- peuvent pas modifier la fiche du commerce, et donc pas toucher à l'IBAN :
-- `commerces_update_own` reste réservée au propriétaire. Un compte d'équipe
-- compromis ne doit pas pouvoir détourner les virements.

CREATE TABLE IF NOT EXISTS public.commerce_acces (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id UUID NOT NULL REFERENCES public.commerces(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'equipe',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT commerce_acces_unique UNIQUE (commerce_id, profile_id),
  CONSTRAINT commerce_acces_role CHECK (role IN ('equipe'))
);

COMMENT ON TABLE public.commerce_acces IS
  'Comptes delegues d''un magasin : exploitation seulement, pas de gestion';

CREATE INDEX IF NOT EXISTS commerce_acces_profil_idx
  ON public.commerce_acces(profile_id);

-- Les magasins pour lesquels l'utilisateur courant peut agir : celui qu'il
-- possède, et ceux auxquels il est délégué.
--
-- SECURITY DEFINER : la fonction lit `commerce_acces`, dont la politique
-- l'appellerait en retour. Sans contournement du RLS, la récursion serait
-- infinie. Elle ne divulgue rien pour autant, ne renvoyant que ce qui concerne
-- `auth.uid()`.
CREATE OR REPLACE FUNCTION public.mes_commerces()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT id FROM public.commerces WHERE profile_id = auth.uid()
  UNION
  SELECT commerce_id FROM public.commerce_acces WHERE profile_id = auth.uid();
$fn$;

COMMENT ON FUNCTION public.mes_commerces IS
  'Magasins que l''utilisateur courant exploite, en proprietaire ou en delegue';

REVOKE ALL ON FUNCTION public.mes_commerces() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mes_commerces() FROM anon;
GRANT EXECUTE ON FUNCTION public.mes_commerces() TO authenticated;

ALTER TABLE public.commerce_acces ENABLE ROW LEVEL SECURITY;

CREATE POLICY commerce_acces_admin ON public.commerce_acces
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Le propriétaire gère les délégations de son magasin ; le délégué voit la
-- sienne, sans pouvoir en créer.
CREATE POLICY commerce_acces_proprietaire ON public.commerce_acces
  FOR ALL
  USING (commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid()))
  WITH CHECK (commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid()));

CREATE POLICY commerce_acces_lecture_propre ON public.commerce_acces
  FOR SELECT USING (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reprise des politiques existantes
--
-- Partout où l'on écrivait « les magasins dont je suis le profil », on écrit
-- désormais « les magasins que j'exploite ». Pour un propriétaire seul, le
-- résultat est identique : la fonction renvoie exactement le même ensemble.
-- ---------------------------------------------------------------------------

-- Le délégué doit voir la fiche de son magasin, sans pouvoir la modifier.
DROP POLICY IF EXISTS commerces_select_public ON public.commerces;
CREATE POLICY commerces_select_public ON public.commerces
  FOR SELECT USING (
    ((status = 'validated'::commerce_status) AND ((NOT is_demo) OR can_see_demo()))
    OR (profile_id = auth.uid())
    OR (id IN (SELECT public.mes_commerces()))
    OR is_admin()
  );

DROP POLICY IF EXISTS baskets_select_published ON public.baskets;
CREATE POLICY baskets_select_published ON public.baskets
  FOR SELECT USING (
    ((status = 'published'::basket_status) AND ((NOT commerce_is_demo(commerce_id)) OR can_see_demo()))
    OR (commerce_id IN (SELECT public.mes_commerces()))
    OR is_admin()
  );

DROP POLICY IF EXISTS baskets_insert_own ON public.baskets;
CREATE POLICY baskets_insert_own ON public.baskets
  FOR INSERT WITH CHECK (commerce_id IN (SELECT public.mes_commerces()));

DROP POLICY IF EXISTS baskets_update_own ON public.baskets;
CREATE POLICY baskets_update_own ON public.baskets
  FOR UPDATE USING (commerce_id IN (SELECT public.mes_commerces()));

DROP POLICY IF EXISTS baskets_delete_own ON public.baskets;
CREATE POLICY baskets_delete_own ON public.baskets
  FOR DELETE USING (commerce_id IN (SELECT public.mes_commerces()));

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT USING (
    (client_id = auth.uid())
    OR (commerce_id IN (SELECT public.mes_commerces()))
    OR (association_id IN (SELECT associations.id FROM public.associations WHERE associations.profile_id = auth.uid()))
    OR is_admin()
  );

DROP POLICY IF EXISTS orders_update_participant ON public.orders;
CREATE POLICY orders_update_participant ON public.orders
  FOR UPDATE
  USING (
    (client_id = auth.uid())
    OR (commerce_id IN (SELECT public.mes_commerces()))
    OR (association_id IN (SELECT associations.id FROM public.associations WHERE associations.profile_id = auth.uid()))
    OR is_admin()
  )
  WITH CHECK (
    (client_id = auth.uid())
    OR (commerce_id IN (SELECT public.mes_commerces()))
    OR (association_id IN (SELECT associations.id FROM public.associations WHERE associations.profile_id = auth.uid()))
    OR is_admin()
  );

DROP POLICY IF EXISTS disputes_select_own ON public.disputes;
CREATE POLICY disputes_select_own ON public.disputes
  FOR SELECT USING ((commerce_id IN (SELECT public.mes_commerces())) OR is_admin());

DROP POLICY IF EXISTS ledger_select_own ON public.ledger_entries;
CREATE POLICY ledger_select_own ON public.ledger_entries
  FOR SELECT USING ((commerce_id IN (SELECT public.mes_commerces())) OR is_admin());

DROP POLICY IF EXISTS payouts_select_own ON public.payouts;
CREATE POLICY payouts_select_own ON public.payouts
  FOR SELECT USING ((commerce_id IN (SELECT public.mes_commerces())) OR is_admin());

DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT USING ((commerce_id IN (SELECT public.mes_commerces())) OR is_admin());

DROP POLICY IF EXISTS tickets_select_own ON public.support_tickets;
CREATE POLICY tickets_select_own ON public.support_tickets
  FOR SELECT USING (
    (client_id = auth.uid())
    OR (commerce_id IN (SELECT public.mes_commerces()))
    OR is_admin()
  );

DROP POLICY IF EXISTS sales_statements_commerce ON public.sales_statements;
CREATE POLICY sales_statements_commerce ON public.sales_statements
  FOR SELECT USING (commerce_id IN (SELECT public.mes_commerces()));

DROP POLICY IF EXISTS profiles_select_commerce_clients ON public.profiles;
CREATE POLICY profiles_select_commerce_clients ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT DISTINCT o.client_id FROM public.orders o
      WHERE o.commerce_id IN (SELECT public.mes_commerces())
    )
  );

DROP POLICY IF EXISTS "commerce cree sa demande" ON public.association_leads;
CREATE POLICY "commerce cree sa demande" ON public.association_leads
  FOR INSERT WITH CHECK (
    (created_by = auth.uid())
    AND (commerce_id IN (SELECT public.mes_commerces()))
  );
