"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChargeResult =
  | { success: true; message?: string }
  | { success: false; error: string };

/** Les justificatifs partagent le bucket des documents, sous leur propre dossier. */
const BUCKET = "crm-documents";
const TAILLE_MAX = 20 * 1024 * 1024;
const TYPES_ACCEPTES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

export const CATEGORIES_CHARGE = [
  "hebergement",
  "logiciel",
  "banque",
  "marketing",
  "materiel",
  "honoraires",
  "assurance",
  "deplacement",
  "telecom",
  "autre",
] as const;

export type CategorieCharge = (typeof CATEGORIES_CHARGE)[number];

export const LIBELLES_CHARGE: Record<CategorieCharge, string> = {
  hebergement: "Hébergement / infrastructure",
  logiciel: "Logiciels et abonnements",
  banque: "Frais bancaires",
  marketing: "Marketing et communication",
  materiel: "Matériel",
  honoraires: "Honoraires",
  assurance: "Assurance",
  deplacement: "Déplacements",
  telecom: "Téléphonie et internet",
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

function nomSur(nom: string): string {
  const point = nom.lastIndexOf(".");
  const extension = point > 0 ? nom.slice(point + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = (point > 0 ? nom.slice(0, point) : nom)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return extension ? `${base || "justificatif"}.${extension}` : base || "justificatif";
}

/** Lit un montant saisi à la française : virgule décimale, espaces insécables. */
function montant(valeur: FormDataEntryValue | null): number | null {
  const brut = String(valeur ?? "").replace(/\s/g, "").replace(",", ".");
  if (!brut) return null;
  const n = Number(brut);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export async function enregistrerCharge(formData: FormData): Promise<ChargeResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const libelle = String(formData.get("libelle") ?? "").trim();
  const categorie = String(formData.get("categorie") ?? "autre");
  const somme = montant(formData.get("montant"));
  const tva = montant(formData.get("tva")) ?? 0;
  const fournisseur = String(formData.get("fournisseur") ?? "").trim();
  const dateCharge = String(formData.get("date") ?? "").trim();
  const recurrent = formData.get("recurrent") === "on";
  const notes = String(formData.get("notes") ?? "").trim();
  const fichier = formData.get("justificatif");

  if (!libelle) return { success: false, error: "Le libellé est obligatoire." };
  if (!CATEGORIES_CHARGE.includes(categorie as CategorieCharge)) {
    return { success: false, error: "Catégorie inconnue." };
  }
  if (somme === null || somme <= 0) {
    return { success: false, error: "Le montant doit être un nombre supérieur à zéro." };
  }
  if (!dateCharge) return { success: false, error: "La date est obligatoire." };

  const supabase = createAdminClient();
  let cheminJustificatif: string | null = null;

  if (fichier instanceof File && fichier.size > 0) {
    if (fichier.size > TAILLE_MAX) {
      return { success: false, error: "Justificatif trop volumineux (20 Mo maximum)." };
    }
    if (!TYPES_ACCEPTES.includes(fichier.type)) {
      return { success: false, error: "Justificatif refusé : PDF ou image uniquement." };
    }
    cheminJustificatif = `charges/${Date.now()}-${nomSur(fichier.name)}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(cheminJustificatif, Buffer.from(await fichier.arrayBuffer()), {
        contentType: fichier.type,
        upsert: false,
      });
    if (error) return { success: false, error: `Dépôt du justificatif impossible : ${error.message}` };
  }

  const { error } = await supabase.from("charges").insert({
    label: libelle,
    category: categorie,
    amount: somme,
    vat_amount: tva,
    supplier: fournisseur || null,
    incurred_on: dateCharge,
    recurring: recurrent,
    receipt_url: cheminJustificatif,
    notes: notes || null,
  });

  if (error) {
    if (cheminJustificatif) await supabase.storage.from(BUCKET).remove([cheminJustificatif]);
    return { success: false, error: `Enregistrement impossible : ${error.message}` };
  }

  revalidatePath("/kshare-crm/charges");
  revalidatePath("/kshare-crm/chiffres");
  return { success: true, message: "Charge enregistrée." };
}

export async function supprimerCharge(id: string): Promise<ChargeResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { data: charge } = await supabase
    .from("charges")
    .select("receipt_url")
    .eq("id", id)
    .single();

  if (!charge) return { success: false, error: "Charge introuvable." };
  if (charge.receipt_url) await supabase.storage.from(BUCKET).remove([charge.receipt_url]);

  const { error } = await supabase.from("charges").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/kshare-crm/charges");
  revalidatePath("/kshare-crm/chiffres");
  return { success: true, message: "Charge supprimée." };
}

export async function lienJustificatif(
  id: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { data: charge } = await supabase
    .from("charges")
    .select("receipt_url")
    .eq("id", id)
    .single();

  if (!charge?.receipt_url) return { success: false, error: "Aucun justificatif." };

  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(charge.receipt_url, 3600);
  if (!data?.signedUrl) return { success: false, error: "Lien indisponible." };

  return { success: true, url: data.signedUrl };
}
