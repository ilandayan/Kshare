/**
 * Lecture / écriture de l'état de lancement de la plateforme.
 * Singleton : une seule ligne avec id=TRUE dans platform_config.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PlatformConfig {
  launched: boolean;
  launch_date: string | null;       // YYYY-MM-DD
  launched_at: string | null;       // ISO timestamp
  launched_by: string | null;
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_config")
    .select("launched, launch_date, launched_at, launched_by")
    .eq("id", true)
    .maybeSingle();

  return data ?? { launched: false, launch_date: null, launched_at: null, launched_by: null };
}

/** Comptes "validés" mais qui sont des seeds @kshare.fr — autorisés à publier en pre-launch (démo) */
const DEMO_DOMAINS = ["@kshare.fr"];

export function isDemoAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_DOMAINS.some((d) => email.toLowerCase().endsWith(d));
}

/**
 * Renvoie une raison de blocage si la publication n'est pas autorisée pour ce commerce.
 * Renvoie null si OK.
 */
export async function checkPublicationAllowed(commerceEmail: string | null | undefined): Promise<string | null> {
  if (isDemoAccount(commerceEmail)) return null;
  const config = await getPlatformConfig();
  if (config.launched) return null;
  return "La publication de paniers ouvrira au lancement officiel de la plateforme. Vous serez prévenu par email quelques jours avant.";
}

/** Action admin : déclenche le lancement (publication ouverte à tous). */
export async function triggerLaunch(adminId: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_config")
    .upsert({ id: true, launched: true, launched_at: new Date().toISOString(), launched_by: adminId, updated_at: new Date().toISOString() });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function setLaunchDate(date: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_config")
    .upsert({ id: true, launch_date: date, updated_at: new Date().toISOString() });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
