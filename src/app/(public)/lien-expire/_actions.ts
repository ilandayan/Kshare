"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, emailCompteValide } from "@/lib/resend";

export type DemandeNouveauLienResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Action publique : un utilisateur dont le lien recovery a expiré
 * demande à recevoir un nouveau lien par email.
 *
 * Sécurité :
 * - Rate limit : 3 requêtes / heure / IP
 * - Réponse toujours générique (n'expose pas si l'email existe)
 * - Ne génère un lien que pour les comptes commerces/associations status='validated'
 */
export async function demanderNouveauLien(
  email: string
): Promise<DemandeNouveauLienResult> {
  // Rate limit par IP
  const hdrs = await headers();
  const clientIp =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    "unknown";

  const { allowed } = checkRateLimit(`lien-expire:${clientIp}`, {
    limit: 3,
    windowSeconds: 3600, // 1h
  });

  if (!allowed) {
    return {
      success: false,
      error: "Trop de tentatives. Réessayez dans une heure.",
    };
  }

  // Validation basique email
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { success: false, error: "Email invalide." };
  }

  const adminClient = createAdminClient();

  // Cherche le compte validé (commerce ou association)
  const [commerceRes, assoRes] = await Promise.all([
    adminClient
      .from("commerces")
      .select("name, email, status")
      .eq("email", trimmed)
      .eq("status", "validated")
      .maybeSingle(),
    adminClient
      .from("associations")
      .select("name, email, status")
      .eq("email", trimmed)
      .eq("status", "validated")
      .maybeSingle(),
  ]);

  const account =
    commerceRes.data
      ? { ...commerceRes.data, type: "commerce" as const }
      : assoRes.data
        ? { ...assoRes.data, type: "association" as const }
        : null;

  // Toujours success=true côté UX pour ne pas leak l'existence
  if (!account) {
    // Log silencieux
    console.info(`[lien-expire] Demande pour email non validé: ${trimmed}`);
    return { success: true };
  }

  // Génère nouveau recovery link
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://k-share.fr";
  const redirectTo = `${siteUrl}/api/auth/callback?next=/definir-mot-de-passe`;

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: account.email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[lien-expire] generateLink failed:", linkError);
    return { success: false, error: "Erreur technique. Réessayez plus tard." };
  }

  const { subject, html } = emailCompteValide(
    account.name,
    account.type,
    linkData.properties.action_link
  );

  await sendEmail({ to: account.email, subject, html });

  return { success: true };
}
