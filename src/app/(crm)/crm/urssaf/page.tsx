import { trimestres } from "@/lib/crm/assiette";
import {
  ANNEE_BAREME, VERIFIE_LE, CATEGORIE_PAR_DEFAUT, LIBELLES_CATEGORIE,
  TAUX_COTISATIONS, TAUX_VERSEMENT_LIBERATOIRE, TAUX_CFP,
} from "@/lib/crm/fiscal";
import { UrssafClient } from "@/components/crm/urssaf-client";

export const dynamic = "force-dynamic";

export default async function UrssafPage({
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

  const annees: number[] = [];
  for (let a = anneeCourante; a >= 2025; a--) annees.push(a);

  return (
    <UrssafClient
      annee={anneeChoisie}
      annees={annees}
      trimestres={await trimestres(anneeChoisie)}
      bareme={{
        annee: ANNEE_BAREME,
        verifieLe: VERIFIE_LE,
        categorie: LIBELLES_CATEGORIE[CATEGORIE_PAR_DEFAUT],
        tauxCotisations: TAUX_COTISATIONS[CATEGORIE_PAR_DEFAUT],
        tauxVersementLiberatoire: TAUX_VERSEMENT_LIBERATOIRE[CATEGORIE_PAR_DEFAUT],
        tauxCfp: TAUX_CFP[CATEGORIE_PAR_DEFAUT],
      }}
    />
  );
}
