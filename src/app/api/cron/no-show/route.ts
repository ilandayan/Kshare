import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  capturerCommande,
  commandesAvecSignalementOuvert,
  decisionCapture,
  type OrderForCapture,
} from "@/lib/stripe/capture";

export const dynamic = "force-dynamic";

/** Colonnes nécessaires au calcul des montants de capture. */
const COLONNES_CAPTURE =
  "id, basket_id, pickup_date, pickup_end, picked_up_at, status, stripe_payment_intent_id, total_amount, service_fee_amount, commission_amount, capture_status";

/**
 * Encaissement des retraits confirmés et des no-shows, toutes les 15 minutes.
 *
 * Cette route tournait autrefois une fois par nuit, à 22h. Rien ne l'imposait :
 * elle compare `pickup_end` à l'instant présent et lit le statut de la commande,
 * elle n'a jamais rien eu à attendre de la fin de journée. C'était l'offre
 * Vercel Hobby qui interdisait toute cadence plus fine — contrainte levée par le
 * passage à pg_cron (migration 20260820000001).
 *
 * Un créneau clos à 10h attendait donc douze heures avant que le commerce ne
 * soit payé de son panier préparé, et un retrait confirmé le matin restait en
 * autorisation toute la journée. L'encaissement suit désormais l'événement qui
 * le justifie, à un quart d'heure près.
 *
 * Depuis le passage en capture différée, la réservation ne fait qu'autoriser le
 * paiement. Ce cron l'encaisse, dans les deux cas où c'est dû :
 *
 * - le client a confirmé son retrait ;
 * - le créneau est passé sans retrait — le commerce a préparé le panier, il
 *   doit être payé, c'est le principe du no-show.
 *
 * Une commande portant un signalement ouvert est laissée en autorisation :
 * c'est la fenêtre pendant laquelle l'admin peut encore relâcher les fonds
 * sans frais, ou n'en capturer qu'une partie.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret (Vercel sets this header)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    console.error("[cron/no-show] CRON_SECRET not configured or too short");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const nowMs = Date.now();

  // Commandes encore en attente de capture : retraits confirmés du jour, et
  // commandes dont le créneau pourrait être écoulé.
  // Les dons sont exclus : leur encaissement est déclenché par la collecte de
  // l'association, et le cron d'expiration relâche ceux que personne ne prend.
  // Les capturer ici prélèverait le client pour un panier jamais collecté.
  const { data: enAttente, error } = await supabase
    .from("orders")
    .select(COLONNES_CAPTURE)
    .eq("capture_status", "pending")
    .eq("is_donation", false)
    .in("status", ["paid", "ready_for_pickup", "picked_up"]);

  if (error) {
    console.error("[cron/no-show] Failed to fetch orders:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const commandes = (enAttente ?? []) as unknown as (OrderForCapture & {
    status: string;
    pickup_date: string | null;
    pickup_end: string | null;
    picked_up_at: string | null;
  })[];

  // Un signalement ouvert suspend la capture jusqu'à décision de l'admin.
  const signalees = await commandesAvecSignalementOuvert(commandes.map((o) => o.id));

  let capturees = 0;
  let enGrace = 0;
  let noShows = 0;
  let echecs = 0;
  let suspendues = 0;

  for (const order of commandes) {
    if (signalees.has(order.id)) {
      suspendues++;
      continue;
    }

    const decision = decisionCapture(order, nowMs);

    if (decision === "grace") {
      enGrace++;
      continue;
    }
    if (decision === "attendre") continue;

    const resultat = await capturerCommande(order);

    if (!resultat.success) {
      echecs++;
      continue;
    }
    capturees++;

    // Le no-show est constaté après encaissement : le commerce est payé, mais
    // la commande doit refléter que le panier n'a pas été retiré.
    if (decision === "no_show") {
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "no_show" })
        .eq("id", order.id);
      if (!updateErr) noShows++;
    }
  }

  return NextResponse.json({
    checked: commandes.length,
    capturees,
    noShows,
    suspendues,
    enGrace,
    echecs,
  });
}
