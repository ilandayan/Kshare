-- Le commerce n'accède plus aux profils de ses clients.
--
-- Une politique ouvrait au commerçant le profil — nom, adresse e-mail,
-- téléphone — de toute personne lui ayant commandé un panier. Elle datait
-- d'avant le modèle de retrait actuel, où l'identité du client ne sert plus à
-- rien : la remise se fait sur présentation d'un code, que le commerce scanne
-- sans savoir qui le présente.
--
-- Vérifié avant suppression : aucun écran de l'espace commerçant ne lit ces
-- profils. La liste des commandes affiche le panier, le créneau, le statut et
-- la note, jamais le client.
--
-- Ce qu'il reste au commerce sur `profiles` : son propre profil, et celui du
-- compte employé qu'il a créé (20260821000006).

DROP POLICY IF EXISTS profiles_select_commerce_clients ON public.profiles;
