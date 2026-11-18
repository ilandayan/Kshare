-- La vue associations_publiques était modifiable par tout utilisateur connecté.
--
-- Elle est SECURITY DEFINER à dessein : un commerçant doit pouvoir choisir une
-- association bénéficiaire sans avoir accès à la table associations, et la vue
-- n'expose que id, nom, ville et département des associations validées.
--
-- Mais une vue simple sur une seule table est modifiable, et Supabase accorde
-- par défaut tous les droits à authenticated sur les nouveaux objets. La
-- migration d'origine ne les retirait qu'à anon. Résultat, vérifié le
-- 2026-11-18 dans une transaction annulée : un client connecté pouvait faire
-- UPDATE ou DELETE sur la vue, et l'écriture atteignait la table avec les
-- droits du propriétaire, sans RLS.
--
-- La vue reste SECURITY DEFINER (l'avertissement du linter Supabase est
-- attendu), mais en lecture seule.

revoke all on public.associations_publiques from public, anon, authenticated;
grant select on public.associations_publiques to authenticated;
