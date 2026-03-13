"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailCompteValide, emailCompteRefuse, emailDemandeComplements } from "@/lib/resend";
import { logAuditEvent } from "@/lib/audit-log";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

export type AccountActionResult =
  | { success: true }
  | { success: false; error: string };

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

  // Generate recovery link so user can set their password
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://k-share.fr";
  const redirectTo = `${siteUrl}/api/auth/callback?next=/definir-mot-de-passe`;

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
