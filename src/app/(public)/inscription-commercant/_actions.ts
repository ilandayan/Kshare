"use server";

import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

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
  // ── Extract text fields ──
  const email = (fd.get("email") as string)?.trim();
  const password = fd.get("password") as string;
  const nom = (fd.get("nom") as string)?.trim();
  const commerceType = (fd.get("commerceType") as string)?.trim();
  const adresse = (fd.get("adresse") as string)?.trim();
  const ville = (fd.get("ville") as string)?.trim();
  const codePostal = (fd.get("codePostal") as string)?.trim();
  const hashgakha = (fd.get("hashgakha") as string)?.trim();
  const telephone = (fd.get("telephone") as string)?.trim();
  const siret = (fd.get("siret") as string)?.trim();

  // ── Extract files ──
  const kbisFile = fd.get("kbis") as File | null;
  const idFile = fd.get("idDocument") as File | null;

  // ── Validate files ──
  const kbisError = validateFile(kbisFile, "L'extrait KBIS");
  if (kbisError) return { success: false, error: kbisError };

  const idError = validateFile(idFile, "La pièce d'identité");
  if (idError) return { success: false, error: idError };

  const supabase = await createClient();

  // Créer le compte Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "commerce",
        full_name: nom,
      },
    },
  });

  if (authError || !authData.user) {
    if (authError?.message?.includes("already registered")) {
      return { success: false, error: "Cette adresse email est déjà utilisée." };
    }
    return { success: false, error: authError?.message ?? "Erreur lors de la création du compte." };
  }

  // Créer le profil
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: authData.user.id,
    email,
    full_name: nom,
    phone: telephone,
    role: "commerce",
  });

  if (profileError) {
    return { success: false, error: "Erreur lors de la création du profil." };
  }

  // Créer le commerce
  const { data: commerce, error: commerceError } = await supabase
    .from("commerces")
    .insert({
      profile_id: authData.user.id,
      name: nom,
      email,
      commerce_type: commerceType,
      address: adresse,
      city: ville,
      postal_code: codePostal,
      hashgakha,
      phone: telephone,
      status: "pending",
      basket_types: [],
      commission_rate: SUBSCRIPTION_PLANS.starter.commissionRate,
      subscription_plan: "starter",
      subscription_status: "active",
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

  // Update commerce with document paths (stored as storage paths for signed URL generation)
  await supabase
    .from("commerces")
    .update({
      kbis_url: `commerces/${commerce.id}/kbis.${kbisExt}`,
      id_document_url: `commerces/${commerce.id}/id.${idExt}`,
    })
    .eq("id", commerce.id);

  return { success: true };
}
