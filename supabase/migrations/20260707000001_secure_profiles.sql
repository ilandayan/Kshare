-- Sécurité profiles : escalade de privilèges + fuite RGPD
-- 1. Bloquer la modification du champ `role` (et autres champs sensibles) par l'utilisateur
-- 2. Supprimer la lecture publique de toute la table profiles (email, phone, stripe_customer_id)

-- ── 1. Trigger anti-escalade de privilèges ──
-- SECURITY INVOKER volontaire : current_user doit refléter le rôle Postgres réel
-- de l'appelant (authenticated / service_role), pas le propriétaire du trigger.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Les connexions backend privilégiées (Edge Functions, RPC SECURITY DEFINER,
  -- migrations) passent librement.
  IF current_user IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN NEW;
  END IF;

  -- Un admin applicatif peut tout modifier.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Sinon : interdiction de toucher aux champs sensibles.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Modification du rôle non autorisée' USING ERRCODE = '42501';
  END IF;
  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'Modification du client Stripe non autorisée' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_archived IS DISTINCT FROM OLD.is_archived
     OR NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    RAISE EXCEPTION 'Modification du statut d''archivage non autorisée' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ── 2. Supprimer la lecture publique des profils (fuite email/téléphone) ──
-- Les lectures légitimes restent couvertes par :
--   profiles_select_own            (soi-même)
--   profiles_select_commerce_clients (commerce -> ses clients)
--   profiles_admin_all             (admin)
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
