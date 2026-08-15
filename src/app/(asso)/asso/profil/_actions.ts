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

  const adresse = data.address?.trim();
  const ville = data.city?.trim();

  const champs: Record<string, unknown> = {
    name: data.name.trim(),
    address: adresse || undefined,
    city: ville || undefined,
    contact: data.contact?.trim() || undefined,
    zone_region: data.zoneRegion?.trim() || undefined,
    department: data.department?.trim() || undefined,
  };

  // Les paniers dons sont proposés dans un rayon de 50 km : sans coordonnées,
  // l'association ne voit rien du tout. On résout l'adresse à l'enregistrement,
  // mais un échec de géocodage ne doit pas empêcher de sauver son profil — le
  // CRM signale les associations restées sans position et permet de rattraper.
  if (adresse) {
    const { geocoderAdresseOuNull } = await import("@/lib/geocode");
    const coords = await geocoderAdresseOuNull(adresse, null, ville);
    if (coords) {
      champs.latitude = coords.latitude;
      champs.longitude = coords.longitude;
      champs.geocoded_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("associations")
    .update(champs)
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
