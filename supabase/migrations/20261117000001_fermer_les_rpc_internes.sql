-- Les fonctions internes étaient appelables par n'importe qui.
--
-- Supabase expose automatiquement toute fonction du schéma `public` en
-- `/rest/v1/rpc/<nom>`, et Postgres accorde l'exécution à PUBLIC par défaut.
-- Dix-huit fonctions `SECURITY DEFINER` — donc qui contournent le RLS —
-- étaient ainsi joignables avec la seule clé anonyme, celle qui est publiée
-- dans le site et dans l'application mobile.
--
-- Vérifié en conditions réelles avant ce correctif : `crm_chiffres` et
-- `crm_clients` répondaient 200 à un appel anonyme. Le résultat était vide
-- parce qu'aucune commande n'a encore été encaissée, pas parce que l'accès
-- était refusé. À la première vente, le chiffre d'affaires, les commissions,
-- les frais Stripe et le détail par commerce devenaient lisibles par tous.
-- `emettre_facture`, `annuler_facture` et `create_ledger_entry_atomic`, elles,
-- écrivent.
--
-- Les trois familles fermées ici ne sont jamais appelées depuis un navigateur
-- ni depuis l'application : le CRM et la facturation passent par le client
-- d'administration, le webhook Stripe aussi, et les fonctions de déclencheur
-- ne s'appellent pas en RPC. Postgres ne vérifie pas le droit d'exécution
-- quand un déclencheur se déclenche, elles continuent donc de fonctionner.
--
-- Ce qui n'est PAS touché, et pourquoi : `is_admin`, `mes_commerces`,
-- `mes_commerces_geres`, `mes_employes`, `groupes_diriges`, `get_user_role` et
-- `commerce_is_demo` sont évaluées À L'INTÉRIEUR des règles RLS — 36 règles sur
-- 24 tables pour la seule `is_admin`. Les révoquer ferait échouer toute requête
-- sur ces tables. `reserve_donation` et `dons_disponibles` sont appelées depuis
-- l'espace association avec la session de l'utilisateur : elles restent
-- ouvertes aux comptes connectés.

do $$
declare
  f record;
  -- Fonctions réservées au service_role : CRM, facturation, grand livre,
  -- webhook Stripe, et déclencheurs.
  internes text[] := array[
    'crm_chiffres', 'crm_clients', 'crm_prospects_facettes',
    'facturation_detail', 'facturation_recap',
    'emettre_facture', 'annuler_facture', 'remplacer_facture', 'remplacer_releve',
    'create_ledger_entry_atomic',
    'reserve_basket_quantity', 'confirm_basket_sold', 'increment_basket_sold',
    'handle_new_user', 'update_basket_quantity', 'update_commerce_rating',
    'figer_creneau_si_commande', 'figer_exclusivite_don'
  ];
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (internes)
  loop
    -- PUBLIC d'abord : sans cela, anon et authenticated gardent le droit par
    -- héritage et la révocation nominative ne change rien.
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end
$$;

-- `search_path` modifiable : un appelant peut détourner les noms non qualifiés
-- vers un schéma à lui. Les deux dernières fonctions qui n'étaient pas figées.
alter function public.distance_km(double precision, double precision, double precision, double precision)
  set search_path = public;
alter function public.figer_exclusivite_don()
  set search_path = public;
