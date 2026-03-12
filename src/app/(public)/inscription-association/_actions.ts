"use server";

import { createClient } from "@/lib/supabase/server";

export type InscriptionAssoResult =
  | { success: true }
  | { success: false; error: string };

export async function inscriptionAssociation(formData: {
  email: string;
  password: string;
  nomAsso: string;
  rna: string;
  adresse: string;
  ville: string;
  codePostal: string;
  nomResponsable: string;
  telephone: string;
}): Promise<InscriptionAssoResult> {
  const supabase = await createClient();

  // Créer le compte Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        role: "association",
        full_name: formData.nomResponsable,
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
    email: formData.email,
    full_name: formData.nomResponsable,
    phone: formData.telephone,
    role: "association",
  });

  if (profileError) {
    return { success: false, error: "Erreur lors de la création du profil." };
  }

  // Déduire le département à partir du code postal (2 premiers chiffres)
  const department = formData.codePostal.slice(0, 2);

  // Créer l'association
  const { error: assoError } = await supabase.from("associations").insert({
    profile_id: authData.user.id,
    name: formData.nomAsso,
    contact: `${formData.nomResponsable} · ${formData.telephone}`,
    address: formData.adresse,
    city: formData.ville,
    department,
    zone_region: `RNA: ${formData.rna} | CP: ${formData.codePostal}`,
    status: "pending",
  });

  if (assoError) {
    return { success: false, error: "Erreur lors de la création de l'association." };
  }

  return { success: true };
}
