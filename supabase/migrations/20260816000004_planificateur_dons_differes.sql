-- Les emails différés aux associations, planifiés depuis la base.
--
-- L'offre Vercel Hobby n'autorise qu'une exécution de cron par jour, et un
-- « */15 * * * * » dans `vercel.json` fait échouer **tout** déploiement — sans
-- qu'aucun message n'apparaisse dans l'interface : Vercel refuse la
-- construction avant de la créer, si bien qu'elle ne figure ni dans la liste
-- des déploiements, ni dans les journaux. Seul le statut posé sur le commit,
-- lisible par l'API GitHub, le disait. Trois heures de recherche.
--
-- Le déclenchement passe donc par pg_cron, qui n'a pas cette limite, et appelle
-- la même route HTTP. Une exécution quotidienne ne convenait pas : l'exclusivité
-- accordée par un commerçant dure deux heures et les créneaux de retrait sont
-- souvent le soir même — les autres associations seraient prévenues le
-- lendemain, pour un panier déjà perdu.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Le secret d'appel ne vit pas dans le corps de la fonction : il est lu dans le
-- coffre à chaque exécution. Il n'apparaît ainsi ni dans `pg_proc`, ni dans un
-- export de schéma, ni dans ce fichier de migration.
CREATE OR REPLACE FUNCTION public.declencher_dons_differes()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_url    TEXT;
  v_id     BIGINT;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_secret';

  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets WHERE name = 'site_url';

  -- Sans secret, on ne tente rien : un appel sans en-tête serait rejeté en 401
  -- et remplirait le journal sans rien accomplir.
  IF v_secret IS NULL OR v_url IS NULL THEN
    RAISE WARNING 'declencher_dons_differes : secret ou URL absent du coffre';
    RETURN NULL;
  END IF;

  SELECT net.http_get(
    url     := v_url || '/api/cron/dons-differes',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  ) INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.declencher_dons_differes IS
  'Appelle la route qui vide la file des emails différés aux associations';

REVOKE ALL ON FUNCTION public.declencher_dons_differes() FROM PUBLIC, anon, authenticated;

-- Toutes les quinze minutes : l'exclusivité dure deux heures, un quart d'heure
-- de retard ne coûte rien.
SELECT cron.unschedule('dons-differes') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'dons-differes'
);

SELECT cron.schedule(
  'dons-differes',
  '*/15 * * * *',
  $$SELECT public.declencher_dons_differes();$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- À faire une fois, à la main, hors de ce fichier
-- ─────────────────────────────────────────────────────────────────────────────
-- Le secret n'est pas versionné. Depuis l'éditeur SQL de Supabase :
--
--   select vault.create_secret('<valeur de CRON_SECRET>', 'cron_secret',
--     'Jeton d''appel des routes /api/cron');
--
-- `site_url` est déjà posée (https://k-share.fr) : ce n'est pas un secret, le
-- coffre lui sert de simple table de configuration pour éviter une URL en dur.
