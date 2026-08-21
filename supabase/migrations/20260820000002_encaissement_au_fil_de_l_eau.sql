-- L'encaissement suit l'événement, il n'attend plus la nuit.
--
-- La route `no-show` couvre deux cas : le client a confirmé son retrait, ou le
-- créneau s'est écoulé sans qu'il vienne — le commerce a préparé le panier, il
-- doit être payé. Dans les deux cas, la route lit l'état de la commande et
-- compare `pickup_end` à l'instant présent. Elle n'a jamais eu besoin de la fin
-- de journée.
--
-- Elle tournait pourtant à 22h, faute de mieux : l'offre Vercel Hobby refuse
-- toute expression tournant plus d'une fois par jour. Un créneau clos à 10h
-- attendait donc douze heures, et un retrait confirmé le matin restait en simple
-- autorisation jusqu'au soir.
--
-- Le passage à pg_cron (20260820000001) lève la contrainte : un quart d'heure.
--
-- Ce que cela déplace, et qu'il faut avoir en tête : un signalement ouvert
-- suspend la capture, et c'est la fenêtre pendant laquelle l'admin peut relâcher
-- l'autorisation sans frais, ou n'en capturer qu'une partie. Cette fenêtre passe
-- de quelques heures à quinze minutes. Après capture, un litige se règle par un
-- remboursement — et Stripe ne rend pas sa commission sur un remboursement.
-- Le virement au commerce, lui, reste hebdomadaire : avancer la capture ne le
-- paie pas plus tôt.

SELECT cron.unschedule('no-show') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'no-show'
);

SELECT cron.schedule(
  'no-show',
  '*/15 * * * *',
  $$SELECT public.declencher_cron('no-show');$$
);
