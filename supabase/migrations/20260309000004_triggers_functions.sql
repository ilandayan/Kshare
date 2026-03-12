-- ============================================================
-- Kshare — Migration 004 : Triggers & Fonctions
-- ============================================================

-- ── 1. Trigger : créer un profil à chaque inscription ───────
-- Se déclenche automatiquement quand un utilisateur s'inscrit via Supabase Auth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'client'::public.user_role
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 2. Fonction : mettre à jour la note moyenne d'un commerce ──

CREATE OR REPLACE FUNCTION public.update_commerce_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.commerces
  SET
    average_rating = (
      SELECT AVG(score)::NUMERIC(3,2) FROM public.ratings WHERE commerce_id = NEW.commerce_id
    ),
    total_ratings = (
      SELECT COUNT(*) FROM public.ratings WHERE commerce_id = NEW.commerce_id
    )
  WHERE id = NEW.commerce_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_commerce_rating
  AFTER INSERT OR UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commerce_rating();

-- ── 3. Fonction : auto-publish → mettre published_at ────────

CREATE OR REPLACE FUNCTION public.basket_publish_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_basket_publish
  BEFORE UPDATE ON public.baskets
  FOR EACH ROW
  EXECUTE FUNCTION public.basket_publish_timestamp();

-- ── 4. Fonction : vérifier sold_out automatiquement ─────────

CREATE OR REPLACE FUNCTION public.basket_check_sold_out()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published'
     AND NEW.quantity_sold >= NEW.quantity_total
  THEN
    NEW.status = 'sold_out';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_basket_sold_out
  BEFORE UPDATE ON public.baskets
  FOR EACH ROW
  EXECUTE FUNCTION public.basket_check_sold_out();

-- ── 5. Fonction : générer un QR code token pour les commandes ──

CREATE OR REPLACE FUNCTION public.generate_order_qr_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token = encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_qr_token
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_qr_token();

-- ── 6. Fonction : mettre à jour picked_up_at ────────────────

CREATE OR REPLACE FUNCTION public.order_picked_up_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'picked_up' AND OLD.status != 'picked_up' THEN
    NEW.picked_up_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_picked_up
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.order_picked_up_timestamp();

-- ── 7. Fonction : JWT custom claims (role dans le token) ────

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_role public.user_role;
BEGIN
  -- Récupérer le rôle du profil
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  -- Ajouter le rôle aux claims
  claims := event->'claims';
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role::TEXT));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"client"');
  END IF;

  -- Mettre à jour l'event
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Note : Pour activer le hook JWT custom, aller dans
-- Supabase Dashboard → Authentication → Hooks
-- et ajouter custom_access_token_hook comme "Custom Access Token" hook.
