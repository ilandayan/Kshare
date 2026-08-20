import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * L'espace consolidé d'une enseigne, réservé à son directeur réseau.
 *
 * La garde repose sur `groupe_acces`, pas sur le rôle : le directeur n'exploite
 * aucun magasin, il ne peut donc pas être « commerce ». La véritable barrière
 * reste le RLS — sans ligne dans `groupe_acces`, `groupes_diriges()` ne renvoie
 * rien et toutes les requêtes de cet espace reviennent vides, même si quelqu'un
 * parvenait jusqu'ici.
 *
 * Aucune écriture n'est ouverte : la publication des paniers et la facturation
 * restent l'affaire de chaque magasin.
 */
export default async function GroupeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: groupe } = await supabase
    .from("groupes")
    .select("id, nom")
    .limit(1)
    .maybeSingle();

  if (!groupe) redirect("/");

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col">
      <header className="bg-gradient-to-r from-[#1e2a78] via-[#2d4de0] to-[#4f6df5] sticky top-0 z-40">
        <div className="px-6 h-16 flex items-center justify-between">
          <Link href="/groupe" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-k-blanc.png" alt="Kshare" width={36} height={36} className="rounded-lg" />
            <div>
              <div className="text-white font-semibold leading-tight">{groupe.nom}</div>
              <div className="text-white/70 text-xs">Espace enseigne</div>
            </div>
          </Link>
          <span className="text-white/70 text-xs uppercase tracking-wider">Consultation</span>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">{children}</main>
    </div>
  );
}
