import { caAnnuel } from "@/lib/crm/assiette";
import {
  etatDesSeuils, ANNEE_BAREME, VERIFIE_LE, CATEGORIE_PAR_DEFAUT,
  LIBELLES_CATEGORIE, TAUX_COTISATIONS, PLAFOND_MICRO,
  SEUIL_FRANCHISE_TVA, SEUIL_FRANCHISE_TVA_MAJORE,
} from "@/lib/crm/fiscal";
import { SeuilsClient } from "@/components/crm/seuils-client";

export const dynamic = "force-dynamic";

export default async function SeuilsPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee } = await searchParams;
  const anneeCourante = new Date().getUTCFullYear();
  const anneeChoisie = Math.min(
    anneeCourante,
    Math.max(2025, parseInt(annee ?? String(anneeCourante), 10) || anneeCourante),
  );

  const ca = await caAnnuel(anneeChoisie);
  // Les seuils se lisent sur l'année en cours : projeter une année révolue
  // n'aurait pas de sens, on affiche alors le réalisé sans projection.
  const reference = anneeChoisie === anneeCourante ? new Date() : new Date(Date.UTC(anneeChoisie, 11, 31));

  const annees: number[] = [];
  for (let a = anneeCourante; a >= 2025; a--) annees.push(a);

  return (
    <SeuilsClient
      annee={anneeChoisie}
      annees={annees}
      ca={ca}
      seuils={etatDesSeuils(ca, reference)}
      anneeCourante={anneeChoisie === anneeCourante}
      bareme={{
        annee: ANNEE_BAREME,
        verifieLe: VERIFIE_LE,
        categorie: LIBELLES_CATEGORIE[CATEGORIE_PAR_DEFAUT],
        tauxCotisations: TAUX_COTISATIONS[CATEGORIE_PAR_DEFAUT],
        plafondMicro: PLAFOND_MICRO,
        franchise: SEUIL_FRANCHISE_TVA,
        franchiseMajoree: SEUIL_FRANCHISE_TVA_MAJORE,
      }}
    />
  );
}
