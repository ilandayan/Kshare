import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShopTopNav } from "@/components/shop/shop-top-nav";
import { ShopUserMenu } from "@/components/shop/shop-user-menu";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?role=commerce");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "commerce") redirect("/connexion?role=commerce");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("name, status")
    .eq("profile_id", user.id)
    .single();

  const commerceName = commerce?.name ?? "Mon commerce";
  const userInitial = (profile?.full_name ?? commerceName).charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col">
      {/* ── Top header ── */}
      <header className="bg-white border-b border-[#e2e5f0] sticky top-0 z-40">
        <div className="px-6 h-16 flex items-center justify-between">
          <Link href="/shop/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#3744C8] rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg leading-none">K</span>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-base leading-tight">Kshare</div>
              <div className="text-xs text-gray-400 leading-tight">Espace Commerçant</div>
            </div>
          </Link>
          <ShopUserMenu commerceName={commerceName} userInitial={userInitial} />
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <ShopTopNav />

      {/* ── Pending validation banner ── */}
      {commerce?.status === "pending" && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-sm text-amber-800">
          ⚠️ Votre compte est en attente de validation. Vous ne pouvez pas encore publier de paniers.
        </div>
      )}

      {/* ── Content ── */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
