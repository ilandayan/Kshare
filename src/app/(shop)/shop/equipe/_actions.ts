"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Resultat = { success: true; message?: string } | { success: false; error: string };

const CHEMIN = "/shop/equipe";
const LONGUEUR_MINIMALE = 8;

/**
 * Le magasin dont l'appelant est propriétaire.
 *
 * Volontairement `profile_id` et non `mes_commerces()` : un employé ne crée pas
 * d'autres employés. Seul celui qui répond du magasin décide qui y publie.
 */
async function monMagasin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, name")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!commerce) return null;
  return { supabase, user, commerce };
}

/** Refuse les mots de passe qu'on regrette d'avoir acceptés. */
function motDePasseAcceptable(mdp: string): string | null {
  if (mdp.length < LONGUEUR_MINIMALE) {
    return `Le mot de passe doit faire au moins ${LONGUEUR_MINIMALE} caractères.`;
  }
  if (!/[a-zA-Z]/.test(mdp) || !/[0-9]/.test(mdp)) {
    return "Le mot de passe doit mêler des lettres et des chiffres.";
  }
  return null;
}

/**
 * Crée le compte d'un employé, mot de passe compris.
 *
 * C'est le commerçant qui choisit le mot de passe et le transmet à son équipe :
 * pas d'invitation par e-mail à attendre, pas de boîte partagée à surveiller.
 * En fin de journée, quand il faut publier les invendus, ce détour aurait suffi
 * à faire renoncer.
 *
 * Le rôle passe par les métadonnées du compte : le déclencheur
 * `handle_new_user` ne retient que client, commerce ou association, ce qui
 * interdit de fabriquer un administrateur par ce chemin.
 */
export async function creerCompteEmploye(formData: FormData): Promise<Resultat> {
  const ctx = await monMagasin();
  if (!ctx) return { success: false, error: "Seul le responsable du magasin peut ajouter un compte." };

  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("mot_de_passe") ?? "");

  if (!nom) return { success: false, error: "Indiquez le nom de la personne." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Cette adresse e-mail n'est pas valide." };
  }

  const faible = motDePasseAcceptable(motDePasse);
  if (faible) return { success: false, error: faible };

  const admin = createAdminClient();

  const { data: cree, error: erreurCreation } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    // Le commerçant remet le mot de passe en main propre : lui imposer de
    // confirmer son adresse bloquerait un compte dont personne ne relève la
    // boîte, souvent une adresse de service.
    email_confirm: true,
    user_metadata: { full_name: nom, role: "commerce" },
  });

  if (erreurCreation || !cree?.user) {
    const message = erreurCreation?.message ?? "";
    if (/already|exist|registered/i.test(message)) {
      return {
        success: false,
        error: "Cette adresse a déjà un compte Kshare. Utilisez-en une autre, ou demandez à l'administrateur de rattacher le compte existant.",
      };
    }
    return { success: false, error: message || "La création du compte a échoué." };
  }

  // Rattachement par le client de session : c'est le RLS qui vérifie que le
  // magasin est bien le mien, et non ce fichier.
  const { error: erreurAcces } = await ctx.supabase
    .from("commerce_acces")
    .insert({ commerce_id: ctx.commerce.id, profile_id: cree.user.id, role: "employe" });

  if (erreurAcces) {
    // Sans rattachement, le compte n'ouvrirait sur rien : on le retire plutôt
    // que de laisser un accès orphelin au magasin.
    await admin.auth.admin.deleteUser(cree.user.id);
    return { success: false, error: erreurAcces.message };
  }

  revalidatePath(CHEMIN);
  return { success: true, message: `Compte créé pour ${nom}. Communiquez-lui son mot de passe.` };
}

/** Redonne un mot de passe à un employé qui l'a perdu. */
export async function redefinirMotDePasse(
  accesId: string,
  motDePasse: string,
): Promise<Resultat> {
  const ctx = await monMagasin();
  if (!ctx) return { success: false, error: "Seul le responsable du magasin peut le faire." };

  const faible = motDePasseAcceptable(motDePasse);
  if (faible) return { success: false, error: faible };

  // La lecture passe par le RLS : un identifiant d'accès pris ailleurs ne
  // remonte rien, et la suite ne s'exécute pas.
  const { data: acces } = await ctx.supabase
    .from("commerce_acces")
    .select("profile_id, commerce_id")
    .eq("id", accesId)
    .maybeSingle();

  if (!acces || acces.commerce_id !== ctx.commerce.id) {
    return { success: false, error: "Ce compte n'appartient pas à votre magasin." };
  }

  const { error } = await createAdminClient().auth.admin.updateUserById(acces.profile_id, {
    password: motDePasse,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(CHEMIN);
  return { success: true, message: "Mot de passe changé. Communiquez-le à la personne concernée." };
}

/**
 * Retire l'accès d'un employé.
 *
 * Le compte lui-même subsiste, ramené au rôle client : il a pu servir à
 * commander des paniers, et le supprimer effacerait cet historique. Sans
 * rattachement, il n'ouvre plus rien du magasin.
 */
export async function retirerCompteEmploye(accesId: string): Promise<Resultat> {
  const ctx = await monMagasin();
  if (!ctx) return { success: false, error: "Seul le responsable du magasin peut le faire." };

  const { data: acces } = await ctx.supabase
    .from("commerce_acces")
    .select("profile_id, commerce_id")
    .eq("id", accesId)
    .maybeSingle();

  if (!acces || acces.commerce_id !== ctx.commerce.id) {
    return { success: false, error: "Ce compte n'appartient pas à votre magasin." };
  }

  const { error } = await ctx.supabase.from("commerce_acces").delete().eq("id", accesId);
  if (error) return { success: false, error: error.message };

  await createAdminClient()
    .from("profiles")
    .update({ role: "client" })
    .eq("id", acces.profile_id);

  revalidatePath(CHEMIN);
  return { success: true, message: "Accès retiré." };
}
