import { redirect } from "next/navigation";
import Link          from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminTopNav }  from "@/components/admin/admin-top-nav";
import { AdminUserMenu } from "@/components/admin/admin-user-menu";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?role=admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const adminName = profile?.full_name ?? "Admin Kshare";

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col">
      {/* ── Top header ── */}
      <header className="bg-white border-b border-[#e2e5f0] sticky top-0 z-40">
        <div className="px-6 h-16 flex items-center justify-between">
          <Link href="/kshare-admin" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#3744C8] rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg leading-none">K</span>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-base leading-tight">Kshare</div>
              <div className="text-xs text-gray-400 leading-tight">Administration</div>
            </div>
          </Link>
          <AdminUserMenu adminName={adminName} />
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
