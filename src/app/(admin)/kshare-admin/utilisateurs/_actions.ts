"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";

export type ActionResult =
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

/* ── Stripe subscription helpers ── */

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function pauseStripeSubscription(supabase: SupabaseClient, commerceId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("commerce_id", commerceId)
    .single();

  if (sub?.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: { behavior: "void" },
      });
    } catch (err) {
      console.error("[admin] Failed to pause Stripe subscription:", err);
    }
  }
}

async function resumeStripeSubscription(supabase: SupabaseClient, commerceId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("commerce_id", commerceId)
    .single();

  if (sub?.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: "",
      });
    } catch (err) {
      console.error("[admin] Failed to resume Stripe subscription:", err);
    }
  }
}

/* ── Suspend a commerce ── */
export async function suspendCommerce(commerceId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;

  const { error } = await supabase
    .from("commerces")
    .update({ status: "suspended" })
    .eq("id", commerceId);

  if (error) return { success: false, error: "Erreur lors de la suspension." };

  // Pause Stripe subscription (no more charges until admin lifts the suspension)
  await pauseStripeSubscription(supabase, commerceId);

  revalidatePath("/kshare-admin/utilisateurs");
  return { success: true };
}

/* ── Unsuspend a commerce (restore to validated) ── */
export async function unsuspendCommerce(commerceId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;

  const { error } = await supabase
    .from("commerces")
    .update({ status: "validated" })
    .eq("id", commerceId);

  if (error) return { success: false, error: "Erreur lors de la réactivation." };

  // Resume Stripe subscription (charges resume from next billing cycle)
  await resumeStripeSubscription(supabase, commerceId);

  revalidatePath("/kshare-admin/utilisateurs");
  return { success: true };
}

/* ── Delete a commerce (archive: set archived + ban, preserves all data) ── */
export async function deleteCommerce(commerceId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;

  // Get profile_id to ban the auth user
  const { data: commerce } = await supabase
    .from("commerces")
    .select("profile_id")
    .eq("id", commerceId)
    .single();

  if (!commerce) return { success: false, error: "Commerce introuvable." };

  // Set commerce status to archived (keeps all orders, baskets, financial data)
  const { error } = await supabase
    .from("commerces")
    .update({ status: "archived" })
    .eq("id", commerceId);

  if (error) return { success: false, error: "Erreur lors de l'archivage du commerce." };

  // Pause Stripe subscription (stop all charges)
  await pauseStripeSubscription(supabase, commerceId);

  // Ban the auth user permanently (prevents login, preserves data)
  const adminClient = createAdminClient();
  await adminClient.auth.admin.updateUserById(commerce.profile_id, {
    ban_duration: "876000h",
  });

  revalidatePath("/kshare-admin/utilisateurs");
  return { success: true };
}

/* ── Suspend an association ── */
export async function suspendAssociation(assoId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;

  const { error } = await supabase
    .from("associations")
    .update({ status: "suspended" })
    .eq("id", assoId);

  if (error) return { success: false, error: "Erreur lors de la suspension." };

  revalidatePath("/kshare-admin/utilisateurs");
  return { success: true };
}

/* ── Unsuspend an association (restore to validated) ── */
export async function unsuspendAssociation(assoId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;

  const { error } = await supabase
    .from("associations")
    .update({ status: "validated" })
    .eq("id", assoId);

  if (error) return { success: false, error: "Erreur lors de la réactivation." };

  revalidatePath("/kshare-admin/utilisateurs");
  return { success: true };
}

/* ── Delete an association (archive: set archived + ban, preserves all data) ── */
export async function deleteAssociation(assoId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;

  // Get profile_id to ban the auth user
  const { data: asso } = await supabase
    .from("associations")
    .select("profile_id")
    .eq("id", assoId)
    .single();

  if (!asso) return { success: false, error: "Association introuvable." };

  // Set association status to archived (keeps all data)
  const { error } = await supabase
    .from("associations")
    .update({ status: "archived" })
    .eq("id", assoId);

  if (error) return { success: false, error: "Erreur lors de l'archivage de l'association." };

  // Ban the auth user permanently (prevents login, preserves data)
  const adminClient = createAdminClient();
  await adminClient.auth.admin.updateUserById(asso.profile_id, {
    ban_duration: "876000h",
  });

  revalidatePath("/kshare-admin/utilisateurs");
  return { success: true };
}

/* ── Suspend a client (set role to disabled or delete later) ── */
export async function suspendClient(profileId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  // Ban the user via admin API (prevents login)
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(profileId, {
    ban_duration: "876000h", // ~100 years = effectively permanent
  });

  if (error) return { success: false, error: "Erreur lors de la suspension." };

  revalidatePath("/kshare-admin/utilisateurs");
  return { success: true };
}

/* ── Unsuspend a client ── */
export async function unsuspendClient(profileId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(profileId, {
    ban_duration: "none",
  });

  if (error) return { success: false, error: "Erreur lors de la réactivation." };

  revalidatePath("/kshare-admin/utilisateurs");
  return { success: true };
}

/* ── Delete a client (archive: mark archived + ban, preserves all data) ── */
export async function deleteClient(profileId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;

  // Mark profile as archived
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq("id", profileId);

  if (profileError) return { success: false, error: "Erreur lors de l'archivage du client." };

  // Ban the user permanently (prevents login, preserves all orders and financial data)
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(profileId, {
    ban_duration: "876000h",
  });

  if (error) return { success: false, error: "Erreur lors de la suspension du client." };

  revalidatePath("/kshare-admin/utilisateurs");
  return { success: true };
}
