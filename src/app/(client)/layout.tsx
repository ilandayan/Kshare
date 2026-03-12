import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClientTopNav } from "@/components/client/client-top-nav";
import { ClientUserMenu } from "@/components/client/client-user-menu";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  if (role !== "client") redirect("/");

  const userName = profile?.full_name || user.email?.split("@")[0] || "Client";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col">
      {/* ── Top header ── */}
      <header className="bg-white border-b border-[#e2e5f0] sticky top-0 z-40">
        <div className="px-6 h-16 flex items-center justify-between">
          <Link href="/client/paniers" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg leading-none">K</span>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-base leading-tight">Kshare</div>
              <div className="text-xs text-gray-400 leading-tight">Paniers anti-gaspi casher</div>
            </div>
          </Link>
          <ClientUserMenu userName={userName} userInitial={userInitial} />
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <ClientTopNav />

      {/* ── Content ── */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
