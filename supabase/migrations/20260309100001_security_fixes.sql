-- ============================================================
-- Kshare — Migration : Correctifs de sécurité
-- ============================================================

-- ── 1. Fix profiles_select_own ─────────────────────────────
-- Problème : USING(true) expose TOUS les profils à n'importe qui
-- Correction : seuls les utilisateurs authentifiés voient leur propre profil + admin voit tout

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

-- ── 2. Fix tickets_insert_all ──────────────────────────────
-- Problème : WITH CHECK(true) permet des insertions anonymes
-- Correction : l'insertion de tickets nécessite d'être authentifié
-- Note : le formulaire contact utilise createAdminClient() (service_role)
-- qui bypass RLS, donc ce changement ne l'affecte pas

DROP POLICY IF EXISTS "tickets_insert_all" ON public.support_tickets;

CREATE POLICY "tickets_insert_authenticated"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 3. Fix handle_new_user trigger ─────────────────────────
-- Problème : un utilisateur peut s'auto-attribuer le rôle 'admin'
-- en passant { role: "admin" } dans user_metadata lors de l'inscription
-- Correction : bloquer le rôle 'admin' depuis les métadonnées,
-- n'autoriser que 'client', 'commerce', 'association'

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role TEXT;
  safe_role public.user_role;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';

  -- Never allow admin role from user_metadata (admin must be set by DB admin directly)
  IF requested_role IS NOT NULL
     AND requested_role IN ('client', 'commerce', 'association')
  THEN
    safe_role := requested_role::public.user_role;
  ELSE
    safe_role := 'client'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    safe_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
