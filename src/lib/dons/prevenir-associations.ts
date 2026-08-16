import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailPanierDonDisponible } from "@/lib/resend";

/**
 * Prévenir les associations qu'un panier don est disponible.
 *
 * L'email est le seul canal qui compte : les associations n'utilisent pas
 * l'application mobile. Un panier dont elles ne sont pas averties finit à la
 * poubelle, le créneau de retrait étant souvent le soir même.
 *
 * Quand le commerçant a désigné une bénéficiaire, elle seule est prévenue tout
 * de suite ; les autres du rayon le sont à la fin des deux heures
 * d'exclusivité, via la file `donation_email_queue`. On ne programme pas
 * l'envoi chez Resend : l'email partirait même si la bénéficiaire avait pris le
 * panier entre-temps, et une association se déplacerait pour rien. La file est
 * relue au moment de l'envoi, ce qui rend impossible d'écrire pour un panier
 * déjà parti.
 */

const RAYON_KM_DEFAUT = 50;

interface AssociationDestinataire {
  id: string;
  name: string;
  email: string;
  latitude: number;
  longitude: number;
}

/** Haversine, même formule que la fonction SQL `distance_km`. */
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

async function chargerPanier(basketId: string) {
  const supabase = createAdminClient();

  const { data: panier } = await supabase
    .from("baskets")
    .select(
      "id, quantity_total, quantity_reserved, day, pickup_start, pickup_end, is_donation, status, commerce_id, exclusive_association_id, exclusive_until",
    )
    .eq("id", basketId)
    .single();

  if (!panier) return null;

  const { data: commerce } = await supabase
    .from("commerces")
    .select("name, city, latitude, longitude")
    .eq("id", panier.commerce_id)
    .single();

  return { supabase, panier, commerce };
}

/** Associations validées, joignables et situées, dans le rayon du commerce. */
async function associationsDuRayon(
  supabase: ReturnType<typeof createAdminClient>,
  commerce: { latitude: number; longitude: number },
  rayonKm: number,
): Promise<Array<AssociationDestinataire & { distance: number }>> {
  const { data } = await supabase
    .from("associations")
    .select("id, name, email, latitude, longitude")
    .eq("status", "validated")
    .not("email", "is", null)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  return (data ?? [])
    .map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email as string,
      latitude: a.latitude as number,
      longitude: a.longitude as number,
      distance: distanceKm(
        a.latitude as number,
        a.longitude as number,
        commerce.latitude,
        commerce.longitude,
      ),
    }))
    .filter((a) => a.distance <= rayonKm);
}

function miseEnForme(panier: {
  quantity_total: number;
  quantity_reserved: number;
  day: string | null;
  pickup_start: string | null;
  pickup_end: string | null;
}) {
  return {
    quantite: panier.quantity_total - panier.quantity_reserved,
    jour: panier.day === "today" ? "Aujourd'hui" : "Demain",
    creneau: `${String(panier.pickup_start ?? "").substring(0, 5)} – ${String(
      panier.pickup_end ?? "",
    ).substring(0, 5)}`,
  };
}

/**
 * À la publication d'un panier don. Écrit tout de suite à qui doit l'être, et
 * dépose une intention d'envoi pour les autres si une exclusivité court.
 */
export async function prevenirAssociations(
  basketId: string,
  rayonKm = RAYON_KM_DEFAUT,
): Promise<{ envoyes: number; differes: number }> {
  const contexte = await chargerPanier(basketId);
  if (!contexte) return { envoyes: 0, differes: 0 };

  const { supabase, panier, commerce } = contexte;

  if (!panier.is_donation || panier.status !== "published") {
    return { envoyes: 0, differes: 0 };
  }

  // Sans position du commerce, aucune distance n'est calculable : on n'écrit à
  // personne plutôt que d'écrire à toute la France.
  if (!commerce?.latitude || !commerce?.longitude) return { envoyes: 0, differes: 0 };
  const position = { latitude: commerce.latitude, longitude: commerce.longitude };

  const exclusiviteJusqua =
    panier.exclusive_association_id && panier.exclusive_until
      ? new Date(panier.exclusive_until)
      : null;
  const exclusiviteEnCours = exclusiviteJusqua !== null && exclusiviteJusqua > new Date();

  const destinataires = await associationsDuRayon(supabase, position, rayonKm);
  const { quantite, jour, creneau } = miseEnForme(panier);

  let envoyes = 0;
  let differes = 0;

  for (const asso of destinataires) {
    const estBeneficiaire = asso.id === panier.exclusive_association_id;

    // Pendant l'exclusivité, les autres attendent. Leur intention d'envoi est
    // déposée en file plutôt qu'exécutée.
    if (exclusiviteEnCours && !estBeneficiaire) {
      const { error } = await supabase.from("donation_email_queue").upsert(
        {
          basket_id: panier.id,
          association_id: asso.id,
          send_after: exclusiviteJusqua!.toISOString(),
        },
        { onConflict: "basket_id,association_id", ignoreDuplicates: true },
      );
      if (!error) differes += 1;
      continue;
    }

    const { subject, html } = emailPanierDonDisponible({
      associationName: asso.name,
      commerceName: commerce.name,
      commerceCity: commerce.city,
      distanceKm: asso.distance,
      creneau,
      jour,
      quantite,
      prioritaire: estBeneficiaire && exclusiviteEnCours,
    });

    if (await sendEmail({ to: asso.email, subject, html })) envoyes += 1;
  }

  // La bénéficiaire peut être hors rayon : c'est un choix du commerçant, pas
  // une proximité. Elle est alors absente de la liste ci-dessus.
  if (
    exclusiviteEnCours &&
    !destinataires.some((a) => a.id === panier.exclusive_association_id)
  ) {
    const { data: beneficiaire } = await supabase
      .from("associations")
      .select("id, name, email, latitude, longitude")
      .eq("id", panier.exclusive_association_id!)
      .not("email", "is", null)
      .maybeSingle();

    if (beneficiaire?.email) {
      const { subject, html } = emailPanierDonDisponible({
        associationName: beneficiaire.name,
        commerceName: commerce.name,
        commerceCity: commerce.city,
        distanceKm:
          beneficiaire.latitude && beneficiaire.longitude
            ? distanceKm(
                beneficiaire.latitude,
                beneficiaire.longitude,
                position.latitude,
                position.longitude,
              )
            : null,
        creneau,
        jour,
        quantite,
        prioritaire: true,
      });
      if (await sendEmail({ to: beneficiaire.email, subject, html })) envoyes += 1;
    }
  }

  return { envoyes, differes };
}

/**
 * Vide la file des envois différés arrivés à échéance.
 *
 * Chaque intention est relue : si le panier n'est plus publié, ou qu'il ne reste
 * plus rien à réserver, l'email ne part pas et la raison est consignée. C'est ce
 * qui garantit qu'aucune association ne se déplace pour un panier déjà pris.
 */
export async function envoyerDonsDifferes(
  rayonKm = RAYON_KM_DEFAUT,
): Promise<{ envoyes: number; ignores: number }> {
  const supabase = createAdminClient();

  const { data: enAttente } = await supabase
    .from("donation_email_queue")
    .select("id, basket_id, association_id")
    .is("sent_at", null)
    .is("skipped_reason", null)
    .lte("send_after", new Date().toISOString())
    .limit(500);

  if (!enAttente?.length) return { envoyes: 0, ignores: 0 };

  let envoyes = 0;
  let ignores = 0;

  // Les intentions d'un même panier se suivent : on garde son contexte plutôt
  // que de le relire à chaque ligne.
  const cache = new Map<string, Awaited<ReturnType<typeof chargerPanier>>>();

  for (const ligne of enAttente) {
    if (!cache.has(ligne.basket_id)) {
      cache.set(ligne.basket_id, await chargerPanier(ligne.basket_id));
    }
    const contexte = cache.get(ligne.basket_id);

    const raison = motifDAbandon(contexte);
    if (raison) {
      await supabase
        .from("donation_email_queue")
        .update({ skipped_reason: raison })
        .eq("id", ligne.id);
      ignores += 1;
      continue;
    }

    const { panier, commerce } = contexte!;
    const { data: asso } = await supabase
      .from("associations")
      .select("id, name, email, latitude, longitude, status")
      .eq("id", ligne.association_id)
      .single();

    if (!asso?.email || asso.status !== "validated") {
      await supabase
        .from("donation_email_queue")
        .update({ skipped_reason: "association injoignable" })
        .eq("id", ligne.id);
      ignores += 1;
      continue;
    }

    const distance =
      asso.latitude && asso.longitude
        ? distanceKm(asso.latitude, asso.longitude, commerce!.latitude!, commerce!.longitude!)
        : null;

    if (distance !== null && distance > rayonKm) {
      await supabase
        .from("donation_email_queue")
        .update({ skipped_reason: "hors rayon" })
        .eq("id", ligne.id);
      ignores += 1;
      continue;
    }

    const { quantite, jour, creneau } = miseEnForme(panier);
    const { subject, html } = emailPanierDonDisponible({
      associationName: asso.name,
      commerceName: commerce!.name,
      commerceCity: commerce!.city,
      distanceKm: distance,
      creneau,
      jour,
      quantite,
      // L'exclusivité est finie, c'est bien pour cela que cet email part.
      prioritaire: false,
    });

    if (await sendEmail({ to: asso.email, subject, html })) {
      await supabase
        .from("donation_email_queue")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", ligne.id);
      envoyes += 1;
    } else {
      // On laisse la ligne en attente : le passage suivant réessaiera.
      ignores += 1;
    }
  }

  return { envoyes, ignores };
}

/** Pourquoi cet email ne doit plus partir, ou `null` s'il doit partir. */
function motifDAbandon(
  contexte: Awaited<ReturnType<typeof chargerPanier>> | undefined,
): string | null {
  if (!contexte) return "panier supprimé";
  const { panier, commerce } = contexte;
  if (!panier.is_donation) return "n'est plus un don";
  if (panier.status !== "published") return `panier ${panier.status}`;
  if (panier.quantity_total - panier.quantity_reserved < 1) return "plus de stock";
  if (!commerce?.latitude || !commerce?.longitude) return "commerce sans position";
  return null;
}
