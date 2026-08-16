/**
 * Distances géographiques.
 *
 * Même formule que la fonction SQL `distance_km` : le serveur et la base
 * doivent s'accorder au kilomètre près, sinon une association verrait un panier
 * dans son écran sans recevoir l'email correspondant, ou l'inverse.
 */

/** Rayon dans lequel une association voit les paniers dons, en kilomètres. */
export const RAYON_DONS_KM = 50;

/** Distance orthodromique en kilomètres (haversine). */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * « 7,3 km » en dessous de dix, « 24 km » au-dessus. La décimale n'aide plus à
 * décider d'un déplacement passé quelques kilomètres.
 */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined) return "";
  return km < 10
    ? `${km.toFixed(1).replace(".", ",")} km`
    : `${Math.round(km)} km`;
}
