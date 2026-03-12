import { redirect } from "next/navigation";
import Link          from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle } from "lucide-react";
import { AssoTopNav }   from "@/components/asso/asso-top-nav";
import { AssoUserMenu } from "@/components/asso/asso-user-menu";

export default async function AssoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "association") redirect("/");

  const { data: asso } = await supabase
    .from("associations")
    .select("name, status")
    .eq("profile_id", user.id)
    .single();

  const assoName    = asso?.name ?? "Mon association";
  const userInitial = (profile?.full_name ?? assoName).charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col">
      {/* ── Top header ── */}
      <header className="bg-gradient-to-r from-purple-700 via-purple-500 to-pink-500 sticky top-0 z-40">
        <div className="px-6 h-16 flex items-center justify-between">
          <Link href="/asso/dashboard" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-k-blanc.png"
              alt="Kshare"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <div>
              <div className="font-bold text-white text-base leading-tight">Kshare</div>
              <div className="text-xs text-white/60 leading-tight">Espace Association</div>
            </div>
          </Link>
          <AssoUserMenu assoName={assoName} userInitial={userInitial} />
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <AssoTopNav />

      {/* ── Pending validation banner ── */}
      {asso?.status === "pending" && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Votre association est en attente de validation par l&apos;équipe Kshare.
        </div>
      )}

      {/* ── Content ── */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
