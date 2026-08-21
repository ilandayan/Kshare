"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailCompteValide, emailCompteRefuse, emailDemandeComplements } from "@/lib/resend";
import { logAuditEvent } from "@/lib/audit-log";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { getStripe } from "@/lib/stripe/client";

export type AccountActionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Crée le compte Stripe Connect du commerce dès sa validation, pour lui épargner
 * une étape : il n'aura plus qu'à renseigner ses informations chez Stripe.
 *
 * Volontairement non bloquant. Un incident chez Stripe ne doit pas empêcher la
 * validation d'un compte : la route `/api/stripe/connect/onboard` recrée le
 * compte s'il manque. Et cette création ne débloque rien à elle seule, la
 * publication d'un panier payant restant conditionnée à `charges_enabled`.
 */
async function creerCompteConnect(commerceId: string, email: string | null): Promise<void> {
  if (!email) return;
  try {
    const supabase = createAdminClient();
    const { data: commerce } = await supabase
      .from("commerces")
      .select("stripe_account_id")
      .eq("id", commerceId)
      .single();

    if (commerce?.stripe_account_id) return;

    const account = await getStripe().accounts.create({
      type: "express",
      country: "FR",
      email,
      settings: {
        // Virements manuels : le cron hebdomadaire du mardi reste la source
        // unique, sinon Stripe verserait en parallèle.
        payouts: { schedule: { interval: "manual" } },
      },
    });

    await supabase
      .from("commerces")
      .update({ stripe_account_id: account.id })
      .eq("id", commerceId);
  } catch (error) {
    console.error("[validateAccount] Création du compte Connect échouée:", error);
  }
}

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

/**
 * Creates a Supabase Auth user, profile, and links to the commerce/association.
 * Generates a recovery link so the user can set their password.
 */
async function createAuthUserAndLink(params: {
  email: string;
  fullName: string;
  phone: string | null;
  role: "commerce" | "association";
  entityId: string;
  entityTable: "commerces" | "associations";
}): Promise<{ userId: string; recoveryLink: string | null } | null> {
  const adminClient = createAdminClient();

  // Check if auth user already exists (e.g. from old registration flow)
  const { data: existingList } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  // Use a more targeted lookup
  let existingUserId: string | null = null;
  const { data: userByEmail } = await adminClient.auth.admin.listUsers();
  const matchingUser = userByEmail?.users?.find((u) => u.email === params.email);
  if (matchingUser) {
    existingUserId = matchingUser.id;
  }

  let userId: string;

  if (existingUserId) {
    userId = existingUserId;
    await adminClient.auth.admin.updateUserById(userId, {
      email_confirm: true,
      user_metadata: {
        role: params.role,
        full_name: params.fullName,
      },
    });
  } else {
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: params.email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        role: params.role,
        full_name: params.fullName,
      },
    });

    if (createError || !newUser.user) {
      console.error("[validerCompte] Failed to create auth user:", createError);
      return null;
    }
    userId = newUser.user.id;
  }

  // Create or update profile
  await adminClient.from("profiles").upsert({
    id: userId,
    email: params.email,
    full_name: params.fullName,
    phone: params.phone,
    role: params.role,
  });

  // Link entity to profile
  await adminClient
    .from(params.entityTable)
    .update({ profile_id: userId })
    .eq("id", params.entityId);

  // If it's a commerce, set default subscription plan
  if (params.entityTable === "commerces") {
    await adminClient
      .from("commerces")
      .update({
        commission_rate: SUBSCRIPTION_PLANS.starter.commissionRate,
        subscription_plan: "starter",
        subscription_status: "active",
      })
      .eq("id", params.entityId);
  }

  // Generate recovery link so user can set their password.
  // hint = email encodé pour pré-remplir /lien-expire si le lien expire.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://k-share.fr";
  const hint = Buffer.from(params.email).toString("base64url");
  const redirectTo = `${siteUrl}/api/auth/callback?next=/definir-mot-de-passe&hint=${hint}`;

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: params.email,
    options: {
      redirectTo,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[validerCompte] Failed to generate recovery link:", linkError);
    return { userId, recoveryLink: null };
  }

  return { userId, recoveryLink: linkData.properties.action_link };
}

export async function validerCompte(
  id: string,
  type: "commerce" | "association"
): Promise<AccountActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase, user } = ctx;

  let accountEmail: string | null = null;
  let accountName: string | null = null;
  let accountPhone: string | null = null;

  if (type === "commerce") {
    const { data: commerce, error } = await supabase
      .from("commerces")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        validated_by: user.id,
      })
      .eq("id", id)
      .select("name, email, phone, profile_id")
      .single();

    if (error) return { success: false, error: "Erreur lors de la validation." };
    accountEmail = commerce?.email ?? null;
    accountName = commerce?.name ?? null;
    accountPhone = commerce?.phone ?? null;

    await creerCompteConnect(id, accountEmail);

    // If no profile_id yet, create Auth user + profile + link
    if (!commerce?.profile_id && accountEmail && accountName) {
      const result = await createAuthUserAndLink({
        email: accountEmail,
        fullName: accountName,
        phone: accountPhone,
        role: "commerce",
        entityId: id,
        entityTable: "commerces",
      });

      if (result?.recoveryLink) {
        const { subject, html } = emailCompteValide(accountName, type, result.recoveryLink);
        await sendEmail({ to: accountEmail, subject, html });
      } else {
        // Fallback: send without password link
        const { subject, html } = emailCompteValide(accountName, type);
        await sendEmail({ to: accountEmail, subject, html });
      }
    } else if (accountEmail && accountName) {
      const { subject, html } = emailCompteValide(accountName, type);
      await sendEmail({ to: accountEmail, subject, html });
    }
  } else {
    const { data: asso, error } = await supabase
      .from("associations")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        validated_by: user.id,
      })
      .eq("id", id)
      .select("name, email, contact, profile_id")
      .single();

    if (error) return { success: false, error: "Erreur lors de la validation." };
    accountName = asso?.name ?? null;
    accountEmail = asso?.email ?? null;

    // Extract responsible name from contact field (format: "Nom · Tel")
    const responsableName = asso?.contact?.split("·")?.[0]?.trim() ?? accountName ?? "";
    const responsablePhone = asso?.contact?.split("·")?.[1]?.trim() ?? null;

    if (!asso?.profile_id && accountEmail && accountName) {
      const result = await createAuthUserAndLink({
        email: accountEmail,
        fullName: responsableName,
        phone: responsablePhone,
        role: "association",
        entityId: id,
        entityTable: "associations",
      });

      if (result?.recoveryLink) {
        const { subject, html } = emailCompteValide(accountName, type, result.recoveryLink);
        await sendEmail({ to: accountEmail, subject, html });
      } else {
        const { subject, html } = emailCompteValide(accountName, type);
        await sendEmail({ to: accountEmail, subject, html });
      }
    } else if (accountEmail && accountName) {
      const { subject, html } = emailCompteValide(accountName, type);
      await sendEmail({ to: accountEmail, subject, html });
    }
  }

  logAuditEvent({
    action: "admin.validate_account",
    actor_id: user.id,
    target_id: id,
    metadata: { type, accountName },
  });

  revalidatePath("/kshare-admin/comptes");
  revalidatePath(`/kshare-admin/comptes/${id}`);
  return { success: true };
}

export async function refuserCompte(
  id: string,
  type: "commerce" | "association"
): Promise<AccountActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;
  let accountEmail: string | null = null;
  let accountName: string | null = null;

  if (type === "commerce") {
    const { data: commerce, error } = await supabase
      .from("commerces")
      .update({ status: "refused" })
      .eq("id", id)
      .select("name, email")
      .single();

    if (error) return { success: false, error: "Erreur lors du refus." };
    accountEmail = commerce?.email ?? null;
    accountName = commerce?.name ?? null;
  } else {
    const { data: asso, error } = await supabase
      .from("associations")
      .update({ status: "refused" })
      .eq("id", id)
      .select("name, email")
      .single();

    if (error) return { success: false, error: "Erreur lors du refus." };
    accountName = asso?.name ?? null;
    accountEmail = asso?.email ?? null;
  }

  if (accountEmail && accountName) {
    const { subject, html } = emailCompteRefuse(accountName, type);
    await sendEmail({ to: accountEmail, subject, html });
  }

  logAuditEvent({
    action: "admin.reject_account",
    actor_id: ctx.user.id,
    target_id: id,
    metadata: { type, accountName },
  });

  revalidatePath("/kshare-admin/comptes");
  revalidatePath(`/kshare-admin/comptes/${id}`);
  return { success: true };
}

/**
 * Régénère un lien de création de mot de passe et le renvoie par email.
 * Utile si le précédent lien (valable 24h) a expiré ou été perdu.
 */
/**
 * Crée le compte de paiement d'un commerce validé avant la mise en place de la
 * création automatique. Rattrapage manuel, sans effet sur les commerces déjà
 * pourvus. S'exécute côté serveur, donc avec la clé Stripe de l'environnement,
 * ce qu'un script local ne pourrait pas garantir.
 */
export async function creerComptePaiement(id: string): Promise<AccountActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { data: commerce } = await ctx.supabase
    .from("commerces")
    .select("name, email, status, stripe_account_id")
    .eq("id", id)
    .single();

  if (!commerce) return { success: false, error: "Commerce introuvable." };
  if (commerce.status !== "validated") {
    return { success: false, error: "Le commerce doit d'abord être validé." };
  }
  if (commerce.stripe_account_id) {
    return { success: false, error: "Ce commerce a déjà un compte de paiement." };
  }
  if (!commerce.email) {
    return { success: false, error: "Aucune adresse email sur ce commerce." };
  }

  await creerCompteConnect(id, commerce.email);

  const { data: apres } = await createAdminClient()
    .from("commerces")
    .select("stripe_account_id")
    .eq("id", id)
    .single();

  if (!apres?.stripe_account_id) {
    return { success: false, error: "Stripe n'a pas pu créer le compte. Réessayez." };
  }

  logAuditEvent({
    action: "admin.connect_account_created",
    actor_id: ctx.user.id,
    target_id: id,
    metadata: { commerceName: commerce.name, accountId: apres.stripe_account_id },
  });

  revalidatePath(`/kshare-admin/comptes/${id}`);
  return { success: true };
}

export async function renvoyerLienMotDePasse(
  id: string,
  type: "commerce" | "association"
): Promise<AccountActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;

  let accountEmail: string | null = null;
  let accountName: string | null = null;

  if (type === "commerce") {
    const { data: commerce } = await supabase
      .from("commerces")
      .select("name, email")
      .eq("id", id)
      .single();
    accountEmail = commerce?.email ?? null;
    accountName = commerce?.name ?? null;
  } else {
    const { data: asso } = await supabase
      .from("associations")
      .select("name, email")
      .eq("id", id)
      .single();
    accountEmail = asso?.email ?? null;
    accountName = asso?.name ?? null;
  }

  if (!accountEmail || !accountName) {
    return { success: false, error: "Compte introuvable." };
  }

  const adminClient = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://k-share.fr";
  const hint = Buffer.from(accountEmail).toString("base64url");
  const redirectTo = `${siteUrl}/api/auth/callback?next=/definir-mot-de-passe&hint=${hint}`;

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: accountEmail,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[renvoyerLien] generateLink failed:", linkError);
    return { success: false, error: "Erreur lors de la génération du lien." };
  }

  const { subject, html } = emailCompteValide(accountName, type, linkData.properties.action_link);
  const sent = await sendEmail({ to: accountEmail, subject, html });

  if (!sent) {
    return { success: false, error: "Le lien a été généré mais l'email n'a pas pu être envoyé." };
  }

  logAuditEvent({
    action: "admin.resend_recovery_link",
    actor_id: ctx.user.id,
    target_id: id,
    metadata: { type, accountName },
  });

  revalidatePath(`/kshare-admin/comptes/${id}`);
  return { success: true };
}

export async function demanderComplements(
  id: string,
  type: "commerce" | "association",
  message: string
): Promise<AccountActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  if (!message.trim()) return { success: false, error: "Le message est requis." };

  const { supabase } = ctx;

  let accountEmail: string | null = null;
  let accountName: string | null = null;

  if (type === "commerce") {
    const { data: commerce, error } = await supabase
      .from("commerces")
      .update({ status: "complement_required" })
      .eq("id", id)
      .select("name, email")
      .single();

    if (error) return { success: false, error: "Erreur lors de la mise à jour." };
    accountEmail = commerce?.email ?? null;
    accountName = commerce?.name ?? null;
  } else {
    const { data: asso, error } = await supabase
      .from("associations")
      .update({ status: "complement_required" })
      .eq("id", id)
      .select("name, email")
      .single();

    if (error) return { success: false, error: "Erreur lors de la mise à jour." };
    accountName = asso?.name ?? null;
    accountEmail = asso?.email ?? null;
  }

  if (accountEmail && accountName) {
    const { subject, html } = emailDemandeComplements(accountName, type, message);
    await sendEmail({ to: accountEmail, subject, html });
  }

  logAuditEvent({
    action: "admin.request_info",
    actor_id: ctx.user.id,
    target_id: id,
    metadata: { type, accountName },
  });

  revalidatePath("/kshare-admin/comptes");
  revalidatePath(`/kshare-admin/comptes/${id}`);
  return { success: true };
}

/**
 * Ouvre un second compte sur un magasin.
 *
 * Un magasin a un propriétaire — celui qui signe le contrat et perçoit les
 * virements, et qui est aussi le responsable du magasin — et des comptes
 * **employés**. L'employé publie des paniers, traite les commandes et scanne
 * les retraits, sans voir aucun montant.
 *
 * Il ne peut pas modifier la fiche du commerce, donc pas l'IBAN, ni signer quoi
 * que ce soit : cela reste au propriétaire.
 *
 * Le rôle du profil est basculé sur `commerce` : sans lui le middleware
 * renverrait la personne hors de `/shop` avant même que le RLS n'ait son mot à
 * dire. On refuse en revanche de déclasser un compte qui exploite déjà son
 * propre magasin, ou un compte d'administration.
 */
export async function ouvrirCompteMagasin(
  commerceId: string,
  email: string,
): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Accès refusé." };

  const { data: moi } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (moi?.role !== "admin") return { success: false, error: "Accès refusé." };

  const adresse = email.trim().toLowerCase();
  if (!adresse) return { success: false, error: "Indiquez une adresse e-mail." };

  const admin = createAdminClient();

  const { data: profil } = await admin
    .from("profiles")
    .select("id, role, full_name")
    .ilike("email", adresse)
    .maybeSingle();

  if (!profil) {
    return {
      success: false,
      error: `Aucun compte Kshare pour ${adresse}. La personne doit d'abord créer son compte.`,
    };
  }

  if (profil.role === "admin") {
    return { success: false, error: "Un compte d'administration ne peut pas être délégué." };
  }

  const { data: sonMagasin } = await admin
    .from("commerces")
    .select("id")
    .eq("profile_id", profil.id)
    .maybeSingle();

  if (sonMagasin) {
    return {
      success: false,
      error: "Ce compte exploite déjà son propre magasin ; il ne peut pas être délégué à un autre.",
    };
  }

  const { error } = await admin
    .from("commerce_acces")
    .insert({ commerce_id: commerceId, profile_id: profil.id, role: "employe" });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce compte a déjà accès à ce magasin." };
    }
    return { success: false, error: error.message };
  }

  if (profil.role !== "commerce") {
    await admin.from("profiles").update({ role: "commerce" }).eq("id", profil.id);
  }

  await logAuditEvent({
    action: "admin.commerce_acces_ouvert",
    target_id: commerceId,
    metadata: { profil: profil.id, email: adresse },
  });

  revalidatePath(`/kshare-admin/comptes/${commerceId}`);
  return { success: true };
}

/** Retire un compte délégué. Le propriétaire n'est jamais concerné. */
export async function fermerCompteMagasin(accesId: string): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Accès refusé." };

  const { data: moi } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (moi?.role !== "admin") return { success: false, error: "Accès refusé." };

  const admin = createAdminClient();
  const { data: acces } = await admin
    .from("commerce_acces")
    .select("commerce_id")
    .eq("id", accesId)
    .maybeSingle();

  const { error } = await admin.from("commerce_acces").delete().eq("id", accesId);
  if (error) return { success: false, error: error.message };

  if (acces) revalidatePath(`/kshare-admin/comptes/${acces.commerce_id}`);
  return { success: true };
}
