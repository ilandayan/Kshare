"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AssoProfileActionResult =
  | { success: true }
  | { success: false; error: string };

export interface UpdateAssoProfileData {
  name: string;
  address: string;
  city: string;
  contact: string;
  zoneRegion: string;
  department: string;
}

export async function updateAssoProfile(
  data: UpdateAssoProfileData
): Promise<AssoProfileActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { data: asso } = await supabase
    .from("associations")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!asso) return { success: false, error: "Association introuvable." };

  if (!data.name?.trim()) {
    return { success: false, error: "Le nom est requis." };
  }

  const { error } = await supabase
    .from("associations")
    .update({
      name: data.name.trim(),
      address: data.address?.trim() || undefined,
      city: data.city?.trim() || undefined,
      contact: data.contact?.trim() || undefined,
      zone_region: data.zoneRegion?.trim() || undefined,
      department: data.department?.trim() || undefined,
    })
    .eq("id", asso.id);

  if (error) return { success: false, error: "Erreur lors de la mise à jour." };

  // Mettre à jour aussi le nom dans profiles
  await supabase
    .from("profiles")
    .update({ full_name: data.name.trim() })
    .eq("id", user.id);

  revalidatePath("/asso/profil");
  revalidatePath("/asso/paniers-dons");
  return { success: true };
}
