"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PALIERS_DEFAUT, type Palier } from "@/lib/groupes";

type ActionResult = { success: true } | { success: false; error: string };

const CHEMIN = "/kshare-admin/enseignes";

/**
 * Toutes les écritures de cet écran passent par là.
 *
 * La vérification du rôle se fait avec le client de session, jamais avec le
 * client admin : c'est la session de l'appelant qu'on veut interroger, pas une
 * requête privilégiée qui répondrait « admin » à tout le monde.
 */
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
  return { supabase, user };
}

export async function creerEnseigne(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Accès refusé." };

  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { success: false, error: "Le nom de l'enseigne est obligatoire." };

  const siren = String(formData.get("siren") ?? "").replace(/\s/g, "").trim();
  if (siren && !/^\d{9}$/.test(siren)) {
    return { success: false, error: "Un SIREN compte neuf chiffres." };
  }

  const { error } = await ctx.supabase.from("groupes").insert({
    nom,
    siren: siren || null,
    contact_nom: String(formData.get("contact_nom") ?? "").trim() || null,
    contact_email: String(formData.get("contact_email") ?? "").trim() || null,
    paliers: PALIERS_DEFAUT as unknown as Palier[],
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(CHEMIN);
  return { success: true };
}

export async function rattacherMagasin(
  groupeId: string,
  commerceId: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Accès refusé." };

  // Le magasin prend le taux courant de l'enseigne dès son rattachement : sans
  // ça il continuerait à vendre au taux qu'il avait, jusqu'à la prochaine
  // clôture mensuelle.
  const { data: groupe } = await ctx.supabase
    .from("groupes")
    .select("taux_courant")
    .eq("id", groupeId)
    .single();

  const maj: { groupe_id: string; commission_rate?: number } = { groupe_id: groupeId };
  if (groupe?.taux_courant !== null && groupe?.taux_courant !== undefined) {
    maj.commission_rate = groupe.taux_courant;
  }

  const { error } = await ctx.supabase.from("commerces").update(maj).eq("id", commerceId);
  if (error) return { success: false, error: error.message };

  revalidatePath(CHEMIN);
  return { success: true };
}

export async function detacherMagasin(commerceId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Accès refusé." };

  // Le magasin redevient indépendant : il repart au taux de base, et non au
  // taux négocié pour un réseau qu'il vient de quitter.
  const { error } = await ctx.supabase
    .from("commerces")
    .update({ groupe_id: null, commission_rate: 18 })
    .eq("id", commerceId);

  if (error) return { success: false, error: error.message };

  revalidatePath(CHEMIN);
  return { success: true };
}

/**
 * Ouvre l'espace enseigne à quelqu'un, par son adresse.
 *
 * Le compte doit exister : on ne crée pas d'utilisateur ici, et on ne devine
 * pas une adresse voisine. Un accès accordé au mauvais compte donnerait à voir
 * le chiffre d'affaires de tout un réseau.
 */
export async function ouvrirAcces(groupeId: string, email: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Accès refusé." };

  const adresse = email.trim().toLowerCase();
  if (!adresse) return { success: false, error: "Indiquez une adresse e-mail." };

  // Lecture au service role : la politique de `profiles` n'expose pas les
  // comptes des autres, et l'admin doit pourtant pouvoir désigner quelqu'un.
  const { data: profil } = await createAdminClient()
    .from("profiles")
    .select("id, full_name")
    .ilike("email", adresse)
    .maybeSingle();

  if (!profil) {
    return {
      success: false,
      error: `Aucun compte Kshare pour ${adresse}. La personne doit d'abord s'inscrire.`,
    };
  }

  const { error } = await ctx.supabase
    .from("groupe_acces")
    .insert({ groupe_id: groupeId, profile_id: profil.id });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Cette personne a déjà accès à l'enseigne." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(CHEMIN);
  return { success: true };
}

export async function retirerAcces(accesId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Accès refusé." };

  const { error } = await ctx.supabase.from("groupe_acces").delete().eq("id", accesId);
  if (error) return { success: false, error: error.message };

  revalidatePath(CHEMIN);
  return { success: true };
}

/**
 * Remplace la grille de paliers d'une enseigne.
 *
 * Les paliers sont validés ici plutôt qu'en base : une grille incohérente ne
 * ferait pas échouer la facturation — `resoudreTaux` retombe sur le taux de
 * base — mais l'enseigne se verrait appliquer 18 % sans que personne comprenne
 * pourquoi.
 */
export async function enregistrerPaliers(
  groupeId: string,
  paliers: Palier[],
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Accès refusé." };

  if (!Array.isArray(paliers) || paliers.length === 0) {
    return { success: false, error: "Il faut au moins un palier." };
  }

  for (const p of paliers) {
    if (!Number.isFinite(p.seuil) || p.seuil < 0) {
      return { success: false, error: "Chaque seuil doit être un montant positif." };
    }
    if (!Number.isFinite(p.taux) || p.taux < 0 || p.taux > 100) {
      return { success: false, error: "Chaque taux doit être compris entre 0 et 100." };
    }
  }

  const tries = [...paliers].sort((a, b) => a.seuil - b.seuil);

  if (tries[0].seuil !== 0) {
    return {
      success: false,
      error: "Le premier palier doit partir de 0 €, sinon les petits volumes n'ont aucun taux.",
    };
  }

  for (let i = 1; i < tries.length; i++) {
    if (tries[i].seuil === tries[i - 1].seuil) {
      return { success: false, error: "Deux paliers ne peuvent pas partager le même seuil." };
    }
    if (tries[i].taux >= tries[i - 1].taux) {
      return {
        success: false,
        error: "La grille doit être dégressive : un seuil plus haut doit donner un taux plus bas.",
      };
    }
  }

  const { error } = await ctx.supabase
    .from("groupes")
    .update({ paliers: tries as unknown as Palier[], updated_at: new Date().toISOString() })
    .eq("id", groupeId);

  if (error) return { success: false, error: error.message };

  revalidatePath(CHEMIN);
  return { success: true };
}
