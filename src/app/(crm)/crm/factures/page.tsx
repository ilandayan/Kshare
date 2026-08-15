import {
  recapitulatifCommissions,
  recapitulatifAbonnements,
  libellePeriode,
  commandesSansDateDeCapture,
  commissionEnAttenteDeDecision,
} from "@/lib/invoicing/compute";
import { mentionsManquantes, EMETTEUR, CONSERVATION_ANNEES } from "@/lib/invoicing/emetteur";
import { FacturesClient } from "@/components/crm/factures-client";

export const dynamic = "force-dynamic";

/**
 * Périodes proposées : les douze derniers mois révolus.
 *
 * Le mois en cours n'y figure pas — une facture porte sur une période close,
 * et facturer un mois entamé obligerait à annuler puis réémettre.
 */
function periodesDisponibles(): string[] {
  const maintenant = new Date();
  const periodes: string[] = [];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1));
    periodes.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return periodes;
}

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: demandee } = await searchParams;
  const periodes = periodesDisponibles();
  const periode = demandee && periodes.includes(demandee) ? demandee : periodes[0];

  const [commissions, abonnements, orphelines, enAttente] = await Promise.all([
    recapitulatifCommissions(periode),
    recapitulatifAbonnements(periode),
    commandesSansDateDeCapture(),
    commissionEnAttenteDeDecision(),
  ]);

  return (
    <FacturesClient
      periode={periode}
      periodes={periodes.map((p) => ({ valeur: p, libelle: libellePeriode(p) }))}
      commissions={commissions}
      abonnements={abonnements}
      emetteurIncomplet={mentionsManquantes()}
      emetteurNom={EMETTEUR.nomCommercial}
      commandesOrphelines={orphelines}
      enAttente={enAttente}
      conservationAnnees={CONSERVATION_ANNEES}
    />
  );
}
