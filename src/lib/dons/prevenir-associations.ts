import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailPanierDonDisponible } from "@/lib/resend";

/**
 * Prévient par email les associations qu'un panier don vient d'être publié près
 * d'elles.
 *
 * Un panier dont personne n'est averti finit à la poubelle : les associations ne
 * consultent pas l'application toute la journée, et le créneau de retrait est
 * souvent le soir même.
 *
 * Quand le commerçant a désigné une bénéficiaire, elle seule est prévenue :
 * écrire aux autres pendant l'exclusivité les enverrait devant un panier
 * qu'elles ne peuvent pas encore réserver. Le revers, assumé faute de cron
 * disponible sur l'offre Vercel actuelle, est qu'aucun email ne part à la fin
 * des deux heures — les autres associations découvrent alors le panier dans
 * l'application.
 */
export async function prevenirAssociations(
  basketId: string,
  rayonKm = 50,
): Promise<{ envoyes: number; erreurs: number }> {
  const supabase = createAdminClient();

  const { data: panier } = await supabase
    .from("baskets")
    .select(
      "id, quantity_total, quantity_reserved, day, pickup_start, pickup_end, is_donation, status, commerce_id, exclusive_association_id, exclusive_until",
    )
    .eq("id", basketId)
    .single();

  if (!panier || !panier.is_donation || panier.status !== "published") {
    return { envoyes: 0, erreurs: 0 };
  }

  const { data: commerce } = await supabase
    .from("commerces")
    .select("name, city, latitude, longitude")
    .eq("id", panier.commerce_id)
    .single();

  // Sans position du commerce, aucune distance n'est calculable : on n'écrit à
  // personne plutôt que d'écrire à toute la France.
  if (!commerce?.latitude || !commerce?.longitude) return { envoyes: 0, erreurs: 0 };

  const exclusiviteEnCours =
    panier.exclusive_association_id !== null &&
    panier.exclusive_until !== null &&
    new Date(panier.exclusive_until) > new Date();

  let requete = supabase
    .from("associations")
    .select("id, name, email, latitude, longitude")
    .eq("status", "validated")
    .not("email", "is", null)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (exclusiviteEnCours) {
    requete = requete.eq("id", panier.exclusive_association_id!);
  }

  const { data: associations } = await requete;
  if (!associations?.length) return { envoyes: 0, erreurs: 0 };

  const quantite = panier.quantity_total - panier.quantity_reserved;
  const jour = panier.day === "today" ? "Aujourd'hui" : "Demain";
  const creneau = `${String(panier.pickup_start).substring(0, 5)} – ${String(
    panier.pickup_end,
  ).substring(0, 5)}`;

  let envoyes = 0;
  let erreurs = 0;

  for (const asso of associations) {
    const distance = distanceKm(
      asso.latitude!,
      asso.longitude!,
      commerce.latitude,
      commerce.longitude,
    );
    // La bénéficiaire désignée est prévenue quelle que soit la distance : c'est
    // un choix du commerçant, pas une proximité.
    if (!exclusiviteEnCours && distance > rayonKm) continue;

    const { subject, html } = emailPanierDonDisponible({
      associationName: asso.name,
      commerceName: commerce.name,
      commerceCity: commerce.city,
      distanceKm: distance,
      creneau,
      jour,
      quantite,
      prioritaire: exclusiviteEnCours,
    });

    const ok = await sendEmail({ to: asso.email!, subject, html });
    if (ok) envoyes += 1;
    else erreurs += 1;
  }

  return { envoyes, erreurs };
}

/** Haversine, même formule que la fonction SQL `distance_km`. */
function distanceKm(
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
