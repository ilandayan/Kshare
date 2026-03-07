import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LogOut, Users } from "lucide-react";
import { AssoSidebarNav } from "@/components/asso/asso-sidebar-nav";

export default async function AssoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "association") redirect("/connexion");

  const { data: asso } = await supabase
    .from("associations")
    .select("name, status")
    .eq("profile_id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-[#EEF0F8]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e2e5f0] flex flex-col shrink-0 shadow-sm">
        {/* Logo */}
        <div className="p-5 border-b border-[#e2e5f0]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#3744C8] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base leading-none">K</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Kshare</span>
          </Link>
        </div>

        {/* Association info */}
        <div className="px-5 py-4 border-b border-[#e2e5f0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#EEF0F8] flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-[#3744C8]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {asso?.name ?? "Mon association"}
              </p>
              <p className="text-xs text-gray-400">Espace Association</p>
            </div>
          </div>
        </div>

        {/* Nav (client component for active state) */}
        <AssoSidebarNav />

        {/* Logout */}
        <div className="p-4 border-t border-[#e2e5f0]">
          <form action="/api/auth/signout" method="POST">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-500 hover:text-red-500 hover:bg-red-50"
              type="submit"
            >
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
