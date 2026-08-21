-- Le créneau de retrait se fige dès qu'un client a commandé.
--
-- Un client réserve un panier pour 19 h 30, paie, organise sa fin de journée
-- autour de ce créneau. Rien n'empêchait le commerce de le déplacer à 17 h
-- ensuite : le client se présentait à l'heure convenue, trouvait porte close, et
-- se voyait compter un no-show — encaissé, puisque le panier avait été préparé.
--
-- Le verrou est posé en base plutôt que dans l'écran : la modification peut
-- venir d'une action serveur, d'un correctif manuel ou d'un futur écran, et
-- c'est la commande du client qui doit la refuser, pas le formulaire.
--
-- Un panier annulé, remboursé ou expiré ne compte pas : il n'engage plus
-- personne. Un no-show, si — le créneau annoncé fait partie de ce qui sera
-- discuté si la commande est contestée.

CREATE OR REPLACE FUNCTION public.figer_creneau_si_commande()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  -- Rien à défendre si le créneau ne bouge pas.
  IF NEW.day IS NOT DISTINCT FROM OLD.day
     AND NEW.pickup_start IS NOT DISTINCT FROM OLD.pickup_start
     AND NEW.pickup_end IS NOT DISTINCT FROM OLD.pickup_end
  THEN
    RETURN NEW;
  END IF;

  -- L'administrateur garde la main : une erreur de saisie constatée après coup
  -- se corrige, en connaissance de cause et avec les clients prévenus.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.basket_id = NEW.id
      AND o.status NOT IN ('cancelled_admin', 'refunded', 'expired')
  ) THEN
    RAISE EXCEPTION
      'Ce panier est déjà commandé : son créneau de retrait ne peut plus être modifié.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.figer_creneau_si_commande IS
  'Interdit de deplacer le creneau d''un panier qu''un client a deja commande';

DROP TRIGGER IF EXISTS baskets_figer_creneau ON public.baskets;
CREATE TRIGGER baskets_figer_creneau
  BEFORE UPDATE ON public.baskets
  FOR EACH ROW
  EXECUTE FUNCTION public.figer_creneau_si_commande();
