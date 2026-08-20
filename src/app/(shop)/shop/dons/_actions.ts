"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mesCommerceIds } from "@/lib/commerce-courant";

export type DonActionResult = { success: true } | { success: false; error: string };

/**
 * Le commerce du compte connecté.
 *
 * Toutes les actions repassent par là plutôt que d'accepter un `commerceId`
 * venu du navigateur : un identifiant transmis par le client se falsifie, et
 * on réglerait alors la bénéficiaire du commerce d'autrui.
 */
async function monCommerce() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .in("id", await mesCommerceIds(supabase))
    .single();

  if (!commerce) return null;
  return { supabase, user, commerceId: commerce.id as string };
}

/**
 * Désigne l'association bénéficiaire des dons du commerce, ou revient à
 * « toutes les associations du secteur » quand l'identifiant est nul.
 *
 * Le réglage vaut aussi pour les dons faits par les clients du commerce : c'est
 * le commerce qui prépare le panier et le remet, la préférence est la sienne.
 */
export async function choisirAssociation(
  associationId: string | null,
): Promise<DonActionResult> {
  const ctx = await monCommerce();
  if (!ctx) return { success: false, error: "Non autorisé." };

  if (associationId) {
    // On vérifie que l'association existe et est validée. La vue ne montre que
    // celles-là, mais rien n'empêche d'envoyer un autre identifiant à la main.
    const { data: asso } = await ctx.supabase
      .from("associations_publiques")
      .select("id")
      .eq("id", associationId)
      .maybeSingle();

    if (!asso) return { success: false, error: "Association inconnue." };
  }

  const { error } = await ctx.supabase
    .from("commerces")
    .update({ preferred_association_id: associationId })
    .eq("id", ctx.commerceId);

  if (error) return { success: false, error: error.message };

  // Les paniers déjà en ligne gardent l'exclusivité figée à leur publication :
  // changer d'avis vaut pour les prochains, pas pour ceux que des associations
  // voient déjà.
  revalidatePath("/shop/dons");
  return { success: true };
}

/**
 * Signale une association qui n'est pas encore sur Kshare.
 *
 * Ne crée aucun compte : seulement une demande à traiter. Le seul champ exigé
 * est le nom — un commerçant qui ne connaît que le nom de l'association du
 * quartier doit pouvoir nous le transmettre, car c'est déjà de quoi la
 * retrouver. Exiger davantage revient à ne rien recevoir.
 */
export async function signalerAssociation(champs: {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<DonActionResult> {
  const ctx = await monCommerce();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const nom = champs.name?.trim();
  if (!nom) return { success: false, error: "Le nom de l'association est obligatoire." };

  const vide = (v?: string) => {
    const t = v?.trim();
    return t ? t : null;
  };

  const { error } = await ctx.supabase.from("association_leads").insert({
    name: nom,
    contact_name: vide(champs.contactName),
    email: vide(champs.email),
    phone: vide(champs.phone),
    address: vide(champs.address),
    commerce_id: ctx.commerceId,
    created_by: ctx.user.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/shop/dons");
  return { success: true };
}
