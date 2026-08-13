import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { CrmTopNav } from "@/components/crm/crm-top-nav";

export const metadata: Metadata = {
  title: "Kshare — Gestion",
  robots: { index: false, follow: false },
};

/**
 * Espace de gestion : prospection, facturation, charges, seuils.
 *
 * Vit dans l'application Kshare et lit les mêmes tables que l'espace admin.
 * La synchronisation n'est donc pas une fonctionnalité à maintenir, c'est la
 * conséquence d'une base unique.
 *
 * Charte Kshare — bleu de la marque — pour le distinguer au premier coup d'œil
 * de l'administration, en rouge, dont le rôle est opérationnel et non de
 * gestion.
 */
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col">
      <header className="bg-gradient-to-r from-[#1e2a78] via-[#3744C8] to-[#5B6EF5] sticky top-0 z-40 shadow-md">
        <div className="px-6 h-16 flex items-center justify-between">
          <Link href="/crm" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
              <Image
                src="/logo-k-blanc.png"
                alt="Kshare"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">Kshare</div>
              <div className="text-xs text-white/70 leading-tight">Gestion</div>
            </div>
          </Link>
          <Link
            href="/kshare-admin"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Administration →
          </Link>
        </div>
      </header>

      <CrmTopNav />

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
