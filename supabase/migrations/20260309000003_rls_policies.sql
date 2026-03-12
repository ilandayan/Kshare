-- ============================================================
-- Kshare — Migration 003 : Row Level Security (RLS)
-- ============================================================

-- ── Activer RLS sur toutes les tables ───────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ── Helper : vérifier le rôle d'un utilisateur ──────────────

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role(auth.uid()) = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ════════════════════════════════════════════════════════════
-- PROFILES
-- ════════════════════════════════════════════════════════════

-- Tout le monde peut voir les profils (lecture publique pour noms, etc.)
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (true);

-- Chaque utilisateur peut modifier son propre profil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- L'insertion est gérée par le trigger (pas d'insert direct)
CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin peut tout modifier
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- COMMERCES
-- ════════════════════════════════════════════════════════════

-- Les commerces validés sont visibles publiquement
CREATE POLICY "commerces_select_public"
  ON public.commerces FOR SELECT
  USING (status = 'validated' OR profile_id = auth.uid() OR public.is_admin());

-- Un commerce peut modifier ses propres données
CREATE POLICY "commerces_update_own"
  ON public.commerces FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Inscription = insert avec son propre profile_id
CREATE POLICY "commerces_insert_own"
  ON public.commerces FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Admin peut tout faire
CREATE POLICY "commerces_admin_all"
  ON public.commerces FOR ALL
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- ASSOCIATIONS
-- ════════════════════════════════════════════════════════════

-- Les associations validées sont visibles
CREATE POLICY "associations_select_public"
  ON public.associations FOR SELECT
  USING (status = 'validated' OR profile_id = auth.uid() OR public.is_admin());

-- Une association peut modifier ses propres données
CREATE POLICY "associations_update_own"
  ON public.associations FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Inscription
CREATE POLICY "associations_insert_own"
  ON public.associations FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Admin
CREATE POLICY "associations_admin_all"
  ON public.associations FOR ALL
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- BASKETS
-- ════════════════════════════════════════════════════════════

-- Les paniers publiés sont visibles par tous (marketplace)
CREATE POLICY "baskets_select_published"
  ON public.baskets FOR SELECT
  USING (
    status = 'published'
    OR commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

-- Le commerce propriétaire peut insérer/modifier ses paniers
CREATE POLICY "baskets_insert_own"
  ON public.baskets FOR INSERT
  WITH CHECK (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
  );

CREATE POLICY "baskets_update_own"
  ON public.baskets FOR UPDATE
  USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
  );

CREATE POLICY "baskets_delete_own"
  ON public.baskets FOR DELETE
  USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
  );

-- Admin
CREATE POLICY "baskets_admin_all"
  ON public.baskets FOR ALL
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- ORDERS
-- ════════════════════════════════════════════════════════════

-- Un client voit ses propres commandes
-- Un commerce voit les commandes de ses paniers
-- Une association voit ses réservations de dons
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (
    client_id = auth.uid()
    OR commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR association_id IN (SELECT id FROM public.associations WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

-- Les commandes sont créées par le système (webhook Stripe) ou les associations (dons)
CREATE POLICY "orders_insert_client"
  ON public.orders FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    OR public.is_admin()
  );

-- Le commerce peut mettre à jour le statut (prêt retrait, no show)
CREATE POLICY "orders_update_commerce"
  ON public.orders FOR UPDATE
  USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR client_id = auth.uid()
    OR association_id IN (SELECT id FROM public.associations WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

-- Admin
CREATE POLICY "orders_admin_all"
  ON public.orders FOR ALL
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS
-- ════════════════════════════════════════════════════════════

-- Un commerce voit son propre abonnement
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

-- Admin gère les abonnements
CREATE POLICY "subscriptions_admin_all"
  ON public.subscriptions FOR ALL
  USING (public.is_admin());

-- Les webhooks Stripe (via service_role) gèrent insert/update

-- ════════════════════════════════════════════════════════════
-- SUPPORT_TICKETS
-- ════════════════════════════════════════════════════════════

-- Tout le monde peut créer un ticket (formulaire contact)
CREATE POLICY "tickets_insert_all"
  ON public.support_tickets FOR INSERT
  WITH CHECK (true);

-- Un utilisateur voit ses propres tickets
CREATE POLICY "tickets_select_own"
  ON public.support_tickets FOR SELECT
  USING (
    client_id = auth.uid()
    OR commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

-- Seul l'admin peut modifier les tickets
CREATE POLICY "tickets_update_admin"
  ON public.support_tickets FOR UPDATE
  USING (public.is_admin());

-- Admin
CREATE POLICY "tickets_admin_all"
  ON public.support_tickets FOR ALL
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- RATINGS
-- ════════════════════════════════════════════════════════════

-- Les notes sont visibles publiquement
CREATE POLICY "ratings_select_public"
  ON public.ratings FOR SELECT
  USING (true);

-- Un client peut noter (après retrait)
CREATE POLICY "ratings_insert_client"
  ON public.ratings FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Admin
CREATE POLICY "ratings_admin_all"
  ON public.ratings FOR ALL
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- FAVORITES
-- ════════════════════════════════════════════════════════════

-- Un client voit ses propres favoris
CREATE POLICY "favorites_select_own"
  ON public.favorites FOR SELECT
  USING (client_id = auth.uid());

-- Un client peut ajouter/supprimer ses favoris
CREATE POLICY "favorites_insert_own"
  ON public.favorites FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "favorites_delete_own"
  ON public.favorites FOR DELETE
  USING (client_id = auth.uid());

-- Admin
CREATE POLICY "favorites_admin_all"
  ON public.favorites FOR ALL
  USING (public.is_admin());
