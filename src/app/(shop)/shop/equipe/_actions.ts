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

/**
 * Fabrique l'identifiant de connexion à partir du nom donné.
 *
 * Le commerçant ne fournit pas d'adresse : demander une boîte pour l'équipe du
 * soir, c'est demander d'en créer une, et l'ajout n'aurait jamais lieu.
 * L'identifiant est donc dérivé du nom et du magasin, sur un sous-domaine qui
 * ne reçoit rien. Il n'est jamais écrit à cette adresse, mais Supabase exige
 * une adresse valide pour un compte à mot de passe.
 */
function identifiantPour(nom: string, magasin: string, suffixe = 0): string {
  const simplifier = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);

  const personne = simplifier(nom) || "equipe";
  const boutique = simplifier(magasin) || "magasin";
  const numero = suffixe > 0 ? `-${suffixe}` : "";
  return `${personne}${numero}.${boutique}@equipe.k-share.fr`;
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
 * Crée le compte employé du magasin, mot de passe compris.
 *
 * Un seul par magasin : une adresse, un mot de passe, remis à qui s'occupe des
 * paniers le soir. C'est le commerçant qui le choisit et le transmet — pas
 * d'invitation par e-mail à attendre, pas de boîte partagée à surveiller. En
 * fin de journée, quand il faut publier les invendus, ce détour aurait suffi à
 * faire renoncer.
 *
 * Le rôle passe par les métadonnées du compte : le déclencheur
 * `handle_new_user` ne retient que client, commerce ou association, ce qui
 * interdit de fabriquer un administrateur par ce chemin.
 */
export async function creerCompteEmploye(formData: FormData): Promise<Resultat> {
  const ctx = await monMagasin();
  if (!ctx) return { success: false, error: "Seul le responsable du magasin peut ajouter un compte." };

  const nom = String(formData.get("nom") ?? "").trim();
  const motDePasse = String(formData.get("mot_de_passe") ?? "");

  if (!nom) return { success: false, error: "Indiquez un nom : « David », « Équipe du soir »…" };
  if (nom.length > 60) return { success: false, error: "Ce nom est trop long." };

  const faible = motDePasseAcceptable(motDePasse);
  if (faible) return { success: false, error: faible };

  // La contrainte d'unicité en base tranche en dernier ressort ; ce contrôle
  // n'est là que pour dire pourquoi, plutôt que de laisser remonter une
  // violation de contrainte.
  const { data: deja } = await ctx.supabase
    .from("commerce_acces")
    .select("id")
    .eq("commerce_id", ctx.commerce.id)
    .maybeSingle();

  if (deja) {
    return {
      success: false,
      error: "Votre magasin a déjà un compte employé. Changez son mot de passe, ou retirez-le avant d'en créer un autre.",
    };
  }

  const admin = createAdminClient();

  // Deux magasins peuvent employer un David, et un commerce peut recréer un
  // compte après en avoir supprimé un : on numérote jusqu'à trouver libre.
  let email = "";
  let cree: Awaited<ReturnType<typeof admin.auth.admin.createUser>>["data"] | null = null;
  let dernierMessage = "";

  for (let essai = 0; essai < 5; essai++) {
    email = identifiantPour(nom, ctx.commerce.name, essai);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: motDePasse,
      // Personne ne relève cette boîte : exiger une confirmation bloquerait le
      // compte au premier jour.
      email_confirm: true,
      user_metadata: { full_name: nom, role: "commerce" },
    });

    if (!error && data?.user) {
      cree = data;
      break;
    }
    dernierMessage = error?.message ?? "";
    if (!/already|exist|registered/i.test(dernierMessage)) break;
  }

  if (!cree?.user) {
    return { success: false, error: dernierMessage || "La création du compte a échoué." };
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
    const message =
      erreurAcces.code === "23505"
        ? "Votre magasin a déjà un compte employé."
        : erreurAcces.message;
    return { success: false, error: message };
  }

  revalidatePath(CHEMIN);
  return {
    success: true,
    message: `Compte créé. Identifiant : ${email} — communiquez-le avec le mot de passe.`,
  };
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
