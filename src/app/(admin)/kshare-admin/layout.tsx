import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link          from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // Manifeste propre a cet espace : « Ajouter a l'ecran d'accueil » installe une
  // icone qui ouvre directement ici, et non le site public. La portee reste « / »
  // volontairement — sinon un passage vers l'autre espace, ou une redirection
  // vers /connexion a l'expiration de la session, sortirait de l'application.
  manifest: "/manifest-admin.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Kshare Admin" },
};
import Image         from "next/image";
import { createClient } from "@/lib/supabase/server";
import { AdminTopNav }  from "@/components/admin/admin-top-nav";
import { AdminUserMenu } from "@/components/admin/admin-user-menu";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const adminName = profile?.full_name ?? user.user_metadata?.full_name as string ?? "Admin Kshare";

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col">
      {/* ── Top header ── */}
      <header className="bg-gradient-to-r from-[#D72638] to-[#FF6B6B] sticky top-0 z-40 shadow-md">
        <div className="px-6 h-16 flex items-center justify-between">
          <Link href="/kshare-admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/logo-k-blanc.png" alt="Kshare" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">Kshare</div>
              <div className="text-xs text-white/70 leading-tight">Administration</div>
            </div>
          </Link>
          <div className="flex items-center gap-5">
            {/* Pendant du lien « Administration → » que porte deja l'en-tete du
                CRM : les deux espaces se repondent, on n'a plus a retenir
                l'adresse de l'autre. */}
            <Link
              href="/kshare-crm"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Gestion →
            </Link>
            <AdminUserMenu adminName={adminName} />
          </div>
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <AdminTopNav />

      {/* ── Content ── */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
