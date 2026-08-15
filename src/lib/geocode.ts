/**
 * Géocodage d'adresses françaises.
 *
 * On passe par l'API Adresse de data.gouv.fr (Base Adresse Nationale) : c'est
 * le référentiel officiel, il est gratuit, sans clé et sans quota pour nos
 * volumes, et il connaît les adresses françaises mieux qu'un fournisseur
 * mondial. Les commerces et les associations de Kshare sont tous en France ;
 * le jour où ce ne sera plus vrai, il faudra un autre fournisseur.
 *
 * Documentation : https://adresse.data.gouv.fr/api-doc/adresse
 */

const ENDPOINT = "https://api-adresse.data.gouv.fr/search/";

export interface Coordonnees {
  latitude: number;
  longitude: number;
  /** Adresse telle que la BAN l'a normalisée, utile pour vérifier à l'œil. */
  adresseTrouvee: string;
  /**
   * Confiance de la BAN, entre 0 et 1. En dessous de 0,4 le résultat désigne
   * souvent la commune plutôt que la rue : on refuse plutôt que de placer un
   * commerce au centre de sa ville, ce qui fausserait le rayon de 50 km.
   */
  score: number;
}

const SCORE_MINIMUM = 0.4;

export class GeocodageIntrouvable extends Error {
  constructor(adresse: string, raison: string) {
    super(`Adresse non résolue (${raison}) : ${adresse}`);
    this.name = "GeocodageIntrouvable";
  }
}

/**
 * Résout une adresse en coordonnées. Lève `GeocodageIntrouvable` si la BAN ne
 * renvoie rien d'assez sûr — l'appelant décide s'il bloque ou s'il enregistre
 * sans coordonnées.
 */
export async function geocoderAdresse(
  adresse: string,
  codePostal?: string | null,
  ville?: string | null,
): Promise<Coordonnees> {
  const requete = [adresse, codePostal, ville].filter(Boolean).join(" ").trim();
  if (!requete) throw new GeocodageIntrouvable("", "adresse vide");

  const url = new URL(ENDPOINT);
  url.searchParams.set("q", requete);
  url.searchParams.set("limit", "1");
  // Le code postal restreint la recherche à la commune : sans lui, « 12 rue de
  // la Paix » remonte des dizaines de communes et la première n'est pas la
  // bonne.
  if (codePostal) url.searchParams.set("postcode", codePostal);

  const reponse = await fetch(url, {
    headers: { Accept: "application/json" },
    // La BAN répond en général en moins de 200 ms ; au-delà de 8 secondes,
    // mieux vaut enregistrer sans coordonnées que faire attendre un commerçant
    // devant son formulaire.
    signal: AbortSignal.timeout(8000),
  });

  if (!reponse.ok) {
    throw new GeocodageIntrouvable(requete, `API Adresse ${reponse.status}`);
  }

  const data = (await reponse.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: { score?: number; label?: string };
    }>;
  };

  const premier = data.features?.[0];
  const coords = premier?.geometry?.coordinates;
  if (!premier || !coords) throw new GeocodageIntrouvable(requete, "aucun résultat");

  const score = premier.properties?.score ?? 0;
  if (score < SCORE_MINIMUM) {
    throw new GeocodageIntrouvable(requete, `score trop faible (${score.toFixed(2)})`);
  }

  // La BAN renvoie [longitude, latitude], dans cet ordre — l'inverse de la
  // convention courante. S'y tromper place tout le monde en mer.
  const [longitude, latitude] = coords;

  return {
    latitude,
    longitude,
    adresseTrouvee: premier.properties?.label ?? requete,
    score,
  };
}

/**
 * Variante tolérante : renvoie `null` au lieu de lever. À utiliser dans les
 * parcours où l'absence de coordonnées ne doit pas empêcher l'enregistrement.
 */
export async function geocoderAdresseOuNull(
  adresse: string,
  codePostal?: string | null,
  ville?: string | null,
): Promise<Coordonnees | null> {
  try {
    return await geocoderAdresse(adresse, codePostal, ville);
  } catch {
    return null;
  }
}
