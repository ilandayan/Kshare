-- Toute la planification passe de Vercel à pg_cron.
--
-- Motif : l'offre Hobby plafonne le nombre de crons par projet, sans que rien
-- ne le signale — le déploiement réussit, et les tâches excédentaires ne sont
-- simplement jamais déclenchées. `vercel.json` en déclarait sept. Impossible de
-- savoir lesquelles tournaient : les journaux d'exécution Hobby ne remontent
-- qu'une heure, et aucune des routes ne laisse de trace en base quand elle n'a
-- rien à faire. Or la facturation mensuelle et le virement hebdomadaire en
-- dépendent.
--
-- pg_cron n'a pas de plafond, s'exécute en UTC comme Vercel — les expressions
-- sont donc reprises à l'identique — et surtout laisse un journal vérifiable
-- dans `cron.job_run_details`. C'est ce dernier point qui a emporté la
-- décision : on peut désormais prouver qu'une tâche a tourné.
--
-- Les crons sont retirés de `vercel.json` dans le même changement. Un
-- ordonnanceur, pas deux : un virement déclenché deux fois se voit sur le
-- compte du commerçant.
--
-- Voir la migration 20260816000004, qui avait ouvert cette voie pour les dons
-- différés après que la limite de fréquence Hobby eut cassé tous les
-- déploiements pendant deux mois.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Une seule fonction pour toutes les routes, la cible étant passée en
-- paramètre. La liste blanche n'est pas une précaution contre l'appelant — la
-- fonction est révoquée pour tous les rôles applicatifs — mais contre une
-- faute de frappe dans un `cron.schedule` : une route inconnue échoue bruyamment
-- au lieu d'appeler une URL inexistante toutes les nuits en silence.
CREATE OR REPLACE FUNCTION public.declencher_cron(p_route TEXT)
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
  IF p_route NOT IN (
    'expire-donations', 'no-show', 'subscription-reminders',
    'weekly-payout', 'auto-launch', 'launch-emails', 'facturation-mensuelle'
  ) THEN
    RAISE EXCEPTION 'declencher_cron : route inconnue « % »', p_route;
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_secret';

  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets WHERE name = 'site_url';

  -- Sans secret, l'appel repartirait en 401 : autant ne pas le tenter.
  IF v_secret IS NULL OR v_url IS NULL THEN
    RAISE WARNING 'declencher_cron(%) : secret ou URL absent du coffre', p_route;
    RETURN NULL;
  END IF;

  -- Deux minutes : la facturation mensuelle parcourt tous les commerces et
  -- produit un PDF par facture, bien au-delà des trente secondes qui suffisent
  -- aux autres routes.
  SELECT net.http_get(
    url     := v_url || '/api/cron/' || p_route,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 120000
  ) INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.declencher_cron IS
  'Appelle une route /api/cron authentifiée par le secret du coffre';

REVOKE ALL ON FUNCTION public.declencher_cron(TEXT) FROM PUBLIC, anon, authenticated;

-- Expressions reprises telles quelles de `vercel.json`, en UTC.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('expire-donations',       '0 6 * * *'),
      ('no-show',                '0 22 * * *'),
      ('subscription-reminders', '0 9 * * *'),
      ('weekly-payout',          '0 6 * * 2'),
      ('auto-launch',            '0 6 * * *'),
      ('launch-emails',          '0 6 * * *'),
      ('facturation-mensuelle',  '0 7 1 * *')
    ) AS v(nom, horaire)
  LOOP
    PERFORM cron.unschedule(t.nom) WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = t.nom
    );
    PERFORM cron.schedule(
      t.nom, t.horaire,
      format('SELECT public.declencher_cron(%L);', t.nom)
    );
  END LOOP;
END;
$$;
