import { createClient } from "@/lib/supabase/server";
import { PALIERS_DEFAUT, resoudreTaux, type Palier } from "@/lib/groupes";
import EnseignesClient from "./_client";

export const dynamic = "force-dynamic";

/**
 * Administration des enseignes.
 *
 * Une enseigne regroupe des magasins juridiquement distincts sous une grille de
 * commission commune. Elle ne change rien à leur exploitation : chacun garde
 * son compte, publie ses paniers et reçoit sa facture. Ce qui se décide ici,
 * c'est le périmètre du réseau, sa grille, et qui peut consulter le consolidé.
 */
export default async function EnseignesPage() {
  const supabase = await createClient();

  const { data: groupes } = await supabase
    .from("groupes")
    .select("id, nom, siren, contact_nom, contact_email, paliers, taux_courant, actif, created_at")
    .order("nom");

  const { data: commerces } = await supabase
    .from("commerces")
    .select("id, name, city, groupe_id, commission_rate, status")
    .eq("status", "validated")
    .order("name");

  const { data: acces } = await supabase
    .from("groupe_acces")
    .select("id, groupe_id, profile_id, role, created_at");

  // `groupe_acces` n'expose pas les profils : on résout les noms séparément,
  // sans quoi l'écran n'afficherait que des identifiants.
  const profilIds = [...new Set((acces ?? []).map((a) => a.profile_id))];
  const { data: profils } = profilIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", profilIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const nomsParProfil = new Map((profils ?? []).map((p) => [p.id, p]));

  const { data: historique } = await supabase
    .from("groupe_taux_historique")
    .select("groupe_id, periode, ca_consolide, taux, magasins")
    .order("periode", { ascending: false })
    .limit(50);

  const enseignes = (groupes ?? []).map((g) => {
    const membres = (commerces ?? []).filter((c) => c.groupe_id === g.id);
    const paliers = (Array.isArray(g.paliers) ? g.paliers : PALIERS_DEFAUT) as Palier[];
    return {
      id: g.id,
      nom: g.nom,
      siren: g.siren,
      contactNom: g.contact_nom,
      contactEmail: g.contact_email,
      tauxCourant: g.taux_courant,
      actif: g.actif,
      paliers,
      // Ce que la grille donnerait au dernier chiffre connu : un repère utile
      // avant de la modifier.
      tauxDernierCa: (() => {
        const dernier = (historique ?? []).find((h) => h.groupe_id === g.id);
        return dernier ? resoudreTaux(Number(dernier.ca_consolide), paliers) : null;
      })(),
      magasins: membres.map((m) => ({
        id: m.id,
        nom: m.name,
        ville: m.city,
        taux: m.commission_rate,
      })),
      acces: (acces ?? [])
        .filter((a) => a.groupe_id === g.id)
        .map((a) => ({
          id: a.id,
          nom: nomsParProfil.get(a.profile_id)?.full_name ?? null,
          email: nomsParProfil.get(a.profile_id)?.email ?? null,
        })),
      historique: (historique ?? [])
        .filter((h) => h.groupe_id === g.id)
        .map((h) => ({
          periode: h.periode,
          ca: Number(h.ca_consolide),
          taux: h.taux,
          magasins: h.magasins,
        })),
    };
  });

  const disponibles = (commerces ?? [])
    .filter((c) => !c.groupe_id)
    .map((c) => ({ id: c.id, nom: c.name, ville: c.city }));

  return <EnseignesClient enseignes={enseignes} disponibles={disponibles} />;
}
