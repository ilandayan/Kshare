-- Un seul compte employé par magasin.
--
-- La table acceptait autant de délégations qu'on voulait. En pratique un
-- commerce n'en veut qu'une : une adresse, un mot de passe, remis à qui
-- s'occupe des paniers le soir. Gérer une liste de comptes nominatifs est un
-- travail d'entreprise, pas de boucherie de quartier.
--
-- La contrainte le dit à la base plutôt qu'à l'écran : l'unicité tient même si
-- deux onglets soumettent le formulaire en même temps, ce qu'une simple
-- vérification préalable dans le code laisserait passer.

ALTER TABLE public.commerce_acces
  ADD CONSTRAINT commerce_acces_un_seul_par_magasin UNIQUE (commerce_id);

COMMENT ON CONSTRAINT commerce_acces_un_seul_par_magasin ON public.commerce_acces IS
  'Un magasin n''a qu''un compte employe, partage par l''equipe';
