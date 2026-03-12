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
