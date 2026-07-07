-- Durcissement : SET search_path sur la dernière fonction SECURITY DEFINER
-- qui en manquait (reserve_basket_quantity). Sans search_path fixe, une fonction
-- SECURITY DEFINER est exposée au détournement via un schéma malveillant.
ALTER FUNCTION public.reserve_basket_quantity(uuid, integer) SET search_path = public;
