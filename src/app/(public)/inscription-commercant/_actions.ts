"use server";

import { createClient } from "@/lib/supabase/server";

export type InscriptionCommercantResult =
  | { success: true }
  | { success: false; error: string };

export async function inscriptionCommercant(formData: {
  email: string;
  password: string;
  nom: string;
  commerceType: string;
  adresse: string;
  ville: string;
  codePostal: string;
  hashgakha: string;
  telephone: string;
  siret: string;
}): Promise<InscriptionCommercantResult> {
  const supabase = await createClient();

  // Créer le compte Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        role: "commerce",
        full_name: formData.nom,
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
    full_name: formData.nom,
    phone: formData.telephone,
    role: "commerce",
  });

  if (profileError) {
    return { success: false, error: "Erreur lors de la création du profil." };
  }

  // Créer le commerce
  const { error: commerceError } = await supabase.from("commerces").insert({
    profile_id: authData.user.id,
    name: formData.nom,
    email: formData.email,
    commerce_type: formData.commerceType,
    address: formData.adresse,
    city: formData.ville,
    postal_code: formData.codePostal,
    hashgakha: formData.hashgakha,
    phone: formData.telephone,
    status: "pending",
    basket_types: [],
    commission_rate: 15,
  });

  if (commerceError) {
    return { success: false, error: "Erreur lors de la création du commerce." };
  }

  return { success: true };
}
