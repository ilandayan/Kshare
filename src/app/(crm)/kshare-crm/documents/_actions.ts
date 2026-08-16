"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DocumentResult =
  | { success: true; message?: string }
  | { success: false; error: string };

const BUCKET = "crm-documents";

/** 20 Mo : au-delà, c'est un scan mal réglé, pas un document. */
const TAILLE_MAX = 20 * 1024 * 1024;

/**
 * Types acceptés. Liste blanche et non liste noire : un bucket privé reste un
 * endroit où l'on dépose des fichiers, et l'admin n'est pas à l'abri d'une
 * pièce jointe piégée reçue par email puis rangée ici sans réfléchir.
 */
const TYPES_ACCEPTES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
];

export const CATEGORIES_DOCUMENT = [
  "juridique",
  "fiscal",
  "social",
  "banque",
  "assurance",
  "fournisseur",
  "contrat",
  "autre",
] as const;

export type CategorieDocument = (typeof CATEGORIES_DOCUMENT)[number];

export const LIBELLES_CATEGORIE: Record<CategorieDocument, string> = {
  juridique: "Juridique",
  fiscal: "Fiscal",
  social: "Social / URSSAF",
  banque: "Banque",
  assurance: "Assurance",
  fournisseur: "Fournisseur",
  contrat: "Contrat",
  autre: "Autre",
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return { user };
}

/** Nettoie un nom de fichier pour en faire un segment de chemin sûr. */
function nomSur(nom: string): string {
  const point = nom.lastIndexOf(".");
  const extension = point > 0 ? nom.slice(point + 1).toLowerCase() : "";
  const base = (point > 0 ? nom.slice(0, point) : nom)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return extension ? `${base || "document"}.${extension.replace(/[^a-z0-9]/g, "")}` : base || "document";
}

export async function televerserDocument(formData: FormData): Promise<DocumentResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const fichier = formData.get("fichier");
  const titre = String(formData.get("titre") ?? "").trim();
  const categorie = String(formData.get("categorie") ?? "autre");
  const emisLe = String(formData.get("emisLe") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!titre) return { success: false, error: "Le titre est obligatoire." };
  if (!CATEGORIES_DOCUMENT.includes(categorie as CategorieDocument)) {
    return { success: false, error: "Catégorie inconnue." };
  }
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { success: false, error: "Aucun fichier reçu." };
  }
  if (fichier.size > TAILLE_MAX) {
    return { success: false, error: "Fichier trop volumineux (20 Mo maximum)." };
  }
  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    return {
      success: false,
      error: `Type de fichier refusé (${fichier.type || "inconnu"}). PDF, image, tableur ou document texte.`,
    };
  }

  const supabase = createAdminClient();
  // L'horodatage préfixe le nom : deux relevés « releve.pdf » déposés le même
  // jour ne doivent pas s'écraser l'un l'autre.
  const chemin = `${categorie}/${Date.now()}-${nomSur(fichier.name)}`;

  const { error: erreurUpload } = await supabase.storage
    .from(BUCKET)
    .upload(chemin, Buffer.from(await fichier.arrayBuffer()), {
      contentType: fichier.type,
      upsert: false,
    });

  if (erreurUpload) {
    return { success: false, error: `Dépôt impossible : ${erreurUpload.message}` };
  }

  const { error } = await supabase.from("crm_documents").insert({
    title: titre,
    category: categorie,
    file_url: chemin,
    issued_on: emisLe || null,
    notes: notes || null,
    file_size: fichier.size,
    mime_type: fichier.type,
    uploaded_by: ctx.user.id,
  });

  if (error) {
    // Le fichier est déposé mais la fiche a échoué : sans ce ménage, le bucket
    // se remplirait de fichiers que plus rien ne référence.
    await supabase.storage.from(BUCKET).remove([chemin]);
    return { success: false, error: `Enregistrement impossible : ${error.message}` };
  }

  revalidatePath("/kshare-crm/documents");
  return { success: true, message: "Document ajouté." };
}

export async function supprimerDocument(id: string): Promise<DocumentResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("crm_documents")
    .select("file_url")
    .eq("id", id)
    .single();

  if (!doc) return { success: false, error: "Document introuvable." };

  // Le fichier d'abord : une fiche sans fichier se répare, un fichier sans
  // fiche ne se retrouve pas.
  if (doc.file_url) await supabase.storage.from(BUCKET).remove([doc.file_url]);

  const { error } = await supabase.from("crm_documents").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/kshare-crm/documents");
  return { success: true, message: "Document supprimé." };
}

/** Lien de téléchargement temporaire. Le bucket est privé. */
export async function lienDocument(
  id: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("crm_documents")
    .select("file_url")
    .eq("id", id)
    .single();

  if (!doc?.file_url) return { success: false, error: "Aucun fichier joint." };

  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_url, 3600);
  if (!data?.signedUrl) return { success: false, error: "Lien indisponible." };

  return { success: true, url: data.signedUrl };
}
