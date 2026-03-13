"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type InscriptionAssoResult =
  | { success: true }
  | { success: false; error: string };

const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5 Mo

function validateFile(file: File | null, label: string): string | null {
  if (!file || file.size === 0) return `${label} est requis.`;
  if (!ALLOWED_DOC_TYPES.includes(file.type))
    return `${label} : format accepté PDF, JPEG ou PNG.`;
  if (file.size > MAX_DOC_SIZE) return `${label} ne doit pas dépasser 5 Mo.`;
  return null;
}

export async function inscriptionAssociation(
  fd: FormData
): Promise<InscriptionAssoResult> {
  // ── Extract text fields ──
  const email = (fd.get("email") as string)?.trim();
  const nomAsso = (fd.get("nomAsso") as string)?.trim();
  const rna = (fd.get("rna") as string)?.trim();
  const adresse = (fd.get("adresse") as string)?.trim();
  const ville = (fd.get("ville") as string)?.trim();
  const codePostal = (fd.get("codePostal") as string)?.trim();
  const nomResponsable = (fd.get("nomResponsable") as string)?.trim();
  const telephone = (fd.get("telephone") as string)?.trim();

  // ── Basic validation ──
  if (!email || !nomAsso || !rna || !adresse || !ville || !codePostal || !nomResponsable || !telephone) {
    return { success: false, error: "Tous les champs sont obligatoires." };
  }

  // ── Extract files ──
  const rnaFile = fd.get("rnaDocument") as File | null;
  const idFile = fd.get("idDocument") as File | null;

  // ── Validate files ──
  const rnaError = validateFile(rnaFile, "Le récépissé RNA");
  if (rnaError) return { success: false, error: rnaError };

  const idError = validateFile(idFile, "La pièce d'identité");
  if (idError) return { success: false, error: idError };

  const supabase = createAdminClient();

  // Vérifier que l'email n'est pas déjà utilisé
  const { data: existingAsso } = await supabase
    .from("associations")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingAsso) {
    return { success: false, error: "Cette adresse email est déjà utilisée pour une association." };
  }

  // Déduire le département à partir du code postal (2 premiers chiffres)
  const department = codePostal.slice(0, 2);

  // Créer l'association SANS compte Auth (sera créé à la validation admin)
  const { data: asso, error: assoError } = await supabase
    .from("associations")
    .insert({
      profile_id: null,
      name: nomAsso,
      email,
      contact: `${nomResponsable} · ${telephone}`,
      address: adresse,
      city: ville,
      department,
      zone_region: `RNA: ${rna} | CP: ${codePostal}`,
      status: "pending",
    })
    .select("id")
    .single();

  if (assoError || !asso) {
    return { success: false, error: "Erreur lors de la création de l'association." };
  }

  // ── Upload documents ──
  const rnaExt = rnaFile!.name.split(".").pop() ?? "pdf";
  const idExt = idFile!.name.split(".").pop() ?? "pdf";

  const [rnaUpload, idUpload] = await Promise.all([
    supabase.storage
      .from("registration-documents")
      .upload(`associations/${asso.id}/rna.${rnaExt}`, rnaFile!, {
        upsert: true,
        contentType: rnaFile!.type,
      }),
    supabase.storage
      .from("registration-documents")
      .upload(`associations/${asso.id}/id.${idExt}`, idFile!, {
        upsert: true,
        contentType: idFile!.type,
      }),
  ]);

  if (rnaUpload.error || idUpload.error) {
    return { success: false, error: "Erreur lors de l'upload des documents." };
  }

  // Update association with document paths
  await supabase
    .from("associations")
    .update({
      rna_document_url: `associations/${asso.id}/rna.${rnaExt}`,
      id_document_url: `associations/${asso.id}/id.${idExt}`,
    })
    .eq("id", asso.id);

  return { success: true };
}
