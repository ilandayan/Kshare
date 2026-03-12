"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionResult =
  | { success: true }
  | { success: false; error: string };

export interface UpdateCommerceProfileData {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  commerceType: string;
  hashgakha: string;
}

export async function updateCommerceProfile(
  data: UpdateCommerceProfileData
): Promise<ProfileActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie." };

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) return { success: false, error: "Commerce introuvable." };

  // Validate required fields
  if (!data.name?.trim() || !data.address?.trim() || !data.city?.trim()) {
    return { success: false, error: "Nom, adresse et ville sont requis." };
  }

  const { error } = await supabase
    .from("commerces")
    .update({
      name: data.name.trim(),
      address: data.address.trim(),
      city: data.city.trim(),
      postal_code: data.postalCode?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      commerce_type: data.commerceType,
      hashgakha: data.hashgakha,
    })
    .eq("id", commerce.id);

  if (error) return { success: false, error: "Erreur lors de la mise a jour." };

  // Also update profile name
  await supabase
    .from("profiles")
    .update({
      full_name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
    })
    .eq("id", user.id);

  revalidatePath("/shop/profil");
  return { success: true };
}

export async function uploadCoverImage(
  formData: FormData
): Promise<ProfileActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, photos")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) return { success: false, error: "Commerce introuvable." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier sélectionné." };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Format accepté : JPEG, PNG ou WebP." };
  }

  // Validate file size (5 MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "L'image ne doit pas dépasser 5 Mo." };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${commerce.id}/cover.${ext}`;

  // Upload to storage (upsert to replace existing)
  const { error: uploadError } = await supabase.storage
    .from("commerce-images")
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { success: false, error: "Erreur lors de l'upload de l'image." };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("commerce-images")
    .getPublicUrl(storagePath);

  // Update commerce photos array
  const { error: updateError } = await supabase
    .from("commerces")
    .update({ photos: [urlData.publicUrl] })
    .eq("id", commerce.id);

  if (updateError) {
    return { success: false, error: "Erreur lors de la sauvegarde." };
  }

  revalidatePath("/shop/profil");
  return { success: true };
}

export async function uploadLogo(
  formData: FormData
): Promise<ProfileActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) return { success: false, error: "Commerce introuvable." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier sélectionné." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Format accepté : JPEG, PNG ou WebP." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "Le logo ne doit pas dépasser 2 Mo." };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${commerce.id}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("commerce-images")
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { success: false, error: "Erreur lors de l'upload du logo." };
  }

  const { data: urlData } = supabase.storage
    .from("commerce-images")
    .getPublicUrl(storagePath);

  const { error: updateError } = await supabase
    .from("commerces")
    .update({ logo_url: urlData.publicUrl })
    .eq("id", commerce.id);

  if (updateError) {
    return { success: false, error: "Erreur lors de la sauvegarde." };
  }

  revalidatePath("/shop/profil");
  return { success: true };
}
