import { createAdminClient } from "@/lib/supabase/admin";
import { DocumentsClient, type DocumentRow } from "@/components/crm/documents-client";
import { CONSERVATION_ANNEES } from "@/lib/invoicing/emetteur";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const { categorie } = await searchParams;
  const supabase = createAdminClient();

  let requete = supabase
    .from("crm_documents")
    .select("id, title, category, file_url, issued_on, notes, file_size, mime_type, created_at");

  if (categorie) requete = requete.eq("category", categorie);

  // La date d'émission prime sur la date de dépôt : on cherche un document par
  // l'année dont il relève, pas par le jour où on a pensé à le ranger.
  const { data } = await requete
    .order("issued_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (
    <DocumentsClient
      documents={(data ?? []) as DocumentRow[]}
      filtre={categorie ?? null}
      conservationAnnees={CONSERVATION_ANNEES}
    />
  );
}
