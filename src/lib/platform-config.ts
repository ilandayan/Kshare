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

/**
 * La plateforme est-elle officiellement lancée ?
 *
 * Lue avec la clé de service, contrairement à `getPlatformConfig` qui s'appuie
 * sur la session : le cron de facturation n'a pas de session, et c'est
 * précisément lui qu'il faut retenir. Rien ne doit être émis ni envoyé à un
 * commerce avant l'ouverture — une facture partie trop tôt ne se rattrape pas,
 * elle s'annule et s'explique.
 */
export async function plateformeLancee(): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_config")
    .select("launched")
    .eq("id", true)
    .maybeSingle();

  // Au moindre doute — ligne absente, lecture en échec — on considère que le
  // lancement n'a pas eu lieu. Le défaut prudent est de ne rien envoyer.
  return data?.launched === true;
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
