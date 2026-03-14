"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type InscriptionCommercantResult =
  | { success: true }
  | { success: false; error: string };

const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5 Mo

function validateFile(
  file: File | null,
  label: string
): string | null {
  if (!file || file.size === 0) return `${label} est requis.`;
  if (!ALLOWED_DOC_TYPES.includes(file.type))
    return `${label} : format accepté PDF, JPEG ou PNG.`;
  if (file.size > MAX_DOC_SIZE)
    return `${label} ne doit pas dépasser 5 Mo.`;
  return null;
}

export async function inscriptionCommercant(
  fd: FormData
): Promise<InscriptionCommercantResult> {
  // ── Rate limiting ──
  const hdrs = await headers();
  const clientIp =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    "unknown";
  const { allowed } = checkRateLimit(`inscription-commercant:${clientIp}`, {
    limit: 5,
    windowSeconds: 300, // 5 requêtes par 5 minutes
  });
  if (!allowed) {
    return { success: false, error: "Trop de tentatives. Veuillez réessayer dans quelques minutes." };
  }

  // ── Extract text fields ──
  const email = (fd.get("email") as string)?.trim();
  const nom = (fd.get("nom") as string)?.trim();
  const commerceType = (fd.get("commerceType") as string)?.trim();
  const adresse = (fd.get("adresse") as string)?.trim();
  const ville = (fd.get("ville") as string)?.trim();
  const codePostal = (fd.get("codePostal") as string)?.trim();
  const hashgakha = (fd.get("hashgakha") as string)?.trim();
  const telephone = (fd.get("telephone") as string)?.trim();
  const siret = (fd.get("siret") as string)?.trim();

  // ── Basic validation ──
  if (!email || !nom || !commerceType || !adresse || !ville || !codePostal || !hashgakha || !telephone || !siret) {
    return { success: false, error: "Tous les champs sont obligatoires." };
  }

  // ── Extract files ──
  const kbisFile = fd.get("kbis") as File | null;
  const idFile = fd.get("idDocument") as File | null;

  // ── Validate files ──
  const kbisError = validateFile(kbisFile, "L'extrait KBIS");
  if (kbisError) return { success: false, error: kbisError };

  const idError = validateFile(idFile, "La pièce d'identité");
  if (idError) return { success: false, error: idError };

  const supabase = createAdminClient();

  // Vérifier que l'email n'est pas déjà utilisé
  const { data: existingCommerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingCommerce) {
    return { success: false, error: "Cette adresse email est déjà utilisée pour un commerce." };
  }

  // Créer le commerce SANS compte Auth (sera créé à la validation admin)
  const { data: commerce, error: commerceError } = await supabase
    .from("commerces")
    .insert({
      name: nom,
      email,
      commerce_type: commerceType,
      address: adresse,
      city: ville,
      postal_code: codePostal,
      hashgakha,
      phone: telephone,
      siret,
      status: "pending",
      basket_types: [],
    })
    .select("id")
    .single();

  if (commerceError || !commerce) {
    return { success: false, error: "Erreur lors de la création du commerce." };
  }

  // ── Upload documents ──
  const kbisExt = kbisFile!.name.split(".").pop() ?? "pdf";
  const idExt = idFile!.name.split(".").pop() ?? "pdf";

  const [kbisUpload, idUpload] = await Promise.all([
    supabase.storage
      .from("registration-documents")
      .upload(`commerces/${commerce.id}/kbis.${kbisExt}`, kbisFile!, {
        upsert: true,
        contentType: kbisFile!.type,
      }),
    supabase.storage
      .from("registration-documents")
      .upload(`commerces/${commerce.id}/id.${idExt}`, idFile!, {
        upsert: true,
        contentType: idFile!.type,
      }),
  ]);

  if (kbisUpload.error || idUpload.error) {
    return { success: false, error: "Erreur lors de l'upload des documents." };
  }

  // Update commerce with document paths
  await supabase
    .from("commerces")
    .update({
      kbis_url: `commerces/${commerce.id}/kbis.${kbisExt}`,
      id_document_url: `commerces/${commerce.id}/id.${idExt}`,
    })
    .eq("id", commerce.id);

  return { success: true };
}
