import { NextRequest, NextResponse } from "next/server";
import { envoyerDonsDifferes } from "@/lib/dons/prevenir-associations";

export const dynamic = "force-dynamic";

/**
 * Envoie les emails aux associations dont l'attente est finie.
 *
 * Quand un commerçant désigne une association bénéficiaire, elle est seule
 * pendant deux heures ; les autres du rayon sont prévenues à l'expiration. Ce
 * passage relit chaque panier avant d'écrire : si la bénéficiaire l'a pris
 * entre-temps, l'email ne part pas, et la raison est consignée.
 *
 * Doit tourner plus souvent qu'une fois par jour — sans quoi une association
 * serait prévenue le lendemain d'un créneau du soir. Une fréquence de quinze
 * minutes suffit : l'exclusivité dure deux heures, un quart d'heure de retard
 * ne coûte rien.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    console.error("[cron/dons-differes] CRON_SECRET not configured or too short");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { envoyes, ignores } = await envoyerDonsDifferes();
    if (envoyes > 0 || ignores > 0) {
      console.info("[cron/dons-differes]", { envoyes, ignores });
    }
    return NextResponse.json({ envoyes, ignores });
  } catch (err) {
    console.error("[cron/dons-differes] échec:", err);
    return NextResponse.json({ error: "Échec du traitement" }, { status: 500 });
  }
}
