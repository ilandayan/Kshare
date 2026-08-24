import { createAdminClient } from "@/lib/supabase/admin";
import { ProspectionClient, type ProspectRow } from "@/components/crm/prospection-client";

export const dynamic = "force-dynamic";

/** Libellés français des statuts stockés en anglais. */
export const STATUT_LABELS: Record<string, string> = {
  new: "À contacter",
  contacted: "Infos envoyées",
  to_call_back: "À rappeler",
  demo_scheduled: "RDV prévu",
  converted: "Inscrit",
  rejected: "Pas intéressé",
  no_response: "Sans réponse",
  wrong_number: "Mauvais numéro",
  do_not_contact: "Ne pas contacter",
  closed: "Fermé",
};

/**
 * Types de commerce, tels qu'ils ont ete importes du fichier de prospection.
 *
 * `commerce_type` est renseigne sur les 1055 lignes ; `category` porte les
 * memes valeurs mais en oublie deux. C'est donc `commerce_type` qui fait foi.
 */
export const TYPE_LABELS: Record<string, string> = {
  restaurant:  "Restaurant",
  traiteur:    "Traiteur",
  boucherie:   "Boucherie",
  supermarche: "Supermarché",
  boulangerie: "Boulangerie",
  epicerie:    "Épicerie",
  autre:       "Autre",
};

const PAGE = 100;

/** Statuts comptés sur la page. Doit rester aligné sur STATUTS_PROSPECT. */
const STATUTS = [
  "new", "contacted", "to_call_back", "demo_scheduled", "converted",
  "rejected", "no_response", "wrong_number", "do_not_contact", "closed",
] as const;

export default async function ProspectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    statut?: string; q?: string; ville?: string; page?: string;
    type?: string; region?: string; cuisine?: string;
  }>;
}) {
  const { statut, q, ville, page, type, region, cuisine } = await searchParams;
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const supabase = createAdminClient();

  // Un compteur par statut, en `head` : ramener les lignes pour les compter en
  // mémoire butait sur la limite de mille résultats de PostgREST, et affichait
  // 991 « à contacter » là où la base en a 1028.
  const compteurs: Record<string, number> = {};
  await Promise.all(
    STATUTS.map(async (s) => {
      const { count } = await supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      if (count) compteurs[s] = count;
    }),
  );

  let requete = supabase
    .from("prospects")
    .select(
      "id, company_name, city, postal_code, address, phone, mobile, email, website, commerce_type, region, cuisine_type, sources, external_links, category, hashgakha, status, contacted_at, next_action_at, first_name, last_name, admin_notes",
      { count: "exact" },
    );

  if (statut) requete = requete.eq("status", statut);
  if (type) requete = requete.eq("commerce_type", type);
  if (region) requete = requete.eq("region", region);
  if (cuisine) requete = requete.eq("cuisine_type", cuisine);
  if (ville) requete = requete.ilike("city", `%${ville}%`);
  if (q) {
    requete = requete.or(
      `company_name.ilike.%${q}%,city.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }

  const { data: prospects, count } = await requete
    // Les relances dues d'abord, puis les jamais contactés : c'est l'ordre de
    // travail réel, pas l'ordre alphabétique.
    .order("next_action_at", { ascending: true, nullsFirst: false })
    .order("contacted_at", { ascending: true, nullsFirst: true })
    .order("company_name", { ascending: true })
    .range((pageNum - 1) * PAGE, pageNum * PAGE - 1);

  // Les valeurs proposées aux filtres sont comptées en base : les ramener pour
  // les compter en mémoire buterait sur la limite de mille lignes de PostgREST,
  // et le fichier en compte 1055. C'est le piège qui avait déjà faussé les
  // compteurs de statuts.
  const { data: facettes } = await supabase.rpc("crm_prospects_facettes");
  const facette = (nom: string) =>
    (facettes ?? [])
      .filter((f) => f.facette === nom)
      .map((f) => ({ valeur: f.valeur, nombre: f.nombre }));

  const types = facette("type");
  const regions = facette("region");
  const cuisines = facette("cuisine");

  // Relances dues aujourd'hui ou en retard : la file du jour.
  const finJournee = new Date();
  finJournee.setHours(23, 59, 59, 999);
  const { count: relancesDues } = await supabase
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .not("next_action_at", "is", null)
    .lte("next_action_at", finJournee.toISOString());

  return (
    <ProspectionClient
      prospects={(prospects ?? []) as ProspectRow[]}
      total={count ?? 0}
      compteurs={compteurs}
      relancesDues={relancesDues ?? 0}
      filtreStatut={statut ?? null}
      filtreType={type ?? null}
      filtreRegion={region ?? null}
      filtreCuisine={cuisine ?? null}
      types={types}
      regions={regions}
      cuisines={cuisines}
      recherche={q ?? ""}
      page={pageNum}
      parPage={PAGE}
    />
  );
}
