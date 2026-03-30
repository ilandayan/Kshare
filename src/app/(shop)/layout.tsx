import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle } from "lucide-react";
import { ShopTopNav } from "@/components/shop/shop-top-nav";
import { ShopUserMenu } from "@/components/shop/shop-user-menu";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "commerce") redirect("/");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("name, status, contract_signed_at")
    .eq("profile_id", user.id)
    .single();

  // ── Blocage contrat : rediriger vers /shop/contrat si non signé ──
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  if (!commerce?.contract_signed_at && !pathname.endsWith("/shop/contrat")) {
    redirect("/shop/contrat");
  }

  const commerceName = commerce?.name ?? "Mon commerce";
  const userInitial = (profile?.full_name ?? commerceName).charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col">
      {/* ── Top header ── */}
      <header className="bg-gradient-to-r from-[#1e2a78] via-[#2d4de0] to-[#4f6df5] sticky top-0 z-40">
        <div className="px-6 h-16 flex items-center justify-between">
          <Link href="/shop/dashboard" className="flex items-center gap-3">
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
              <div className="text-xs text-white/60 leading-tight">Espace Commerçant</div>
            </div>
          </Link>
          <ShopUserMenu commerceName={commerceName} userInitial={userInitial} />
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <ShopTopNav />

      {/* ── Pending validation banner ── */}
      {commerce?.status === "pending" && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Votre compte est en attente de validation. Vous ne pouvez pas encore publier de paniers.
        </div>
      )}

      {/* ── Content ── */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
