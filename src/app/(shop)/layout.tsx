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
import { ShopOrdersBadge } from "@/components/shop/shop-orders-badge";

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
    .select(
      "id, name, status, contract_signed_at, stripe_charges_enabled, stripe_details_submitted"
    )
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
          <div className="flex items-center gap-3">
            {commerce?.id && (
              <div className="relative">
                <ShopOrdersBadge commerceId={commerce.id} />
              </div>
            )}
            <ShopUserMenu commerceName={commerceName} userInitial={userInitial} />
          </div>
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

      {/* ── Onboarding Stripe : bloquant tant que le commerce ne peut pas encaisser ──
          Affiché sur tout l'espace commerçant, sauf sur la page Paiements
          elle-même où l'information serait redondante. */}
      {commerce?.status === "validated" &&
        !commerce.stripe_charges_enabled &&
        !pathname.endsWith("/shop/stripe-connect") && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1 min-w-0">
                {commerce.stripe_details_submitted ? (
                  <>
                    <p className="font-semibold text-amber-900">
                      Vérification de votre compte de paiement en cours
                    </p>
                    <p className="text-sm text-amber-800 mt-0.5">
                      Stripe n&apos;a pas encore activé votre compte. Il reste
                      peut-être des informations à fournir. Vos paniers ne
                      peuvent pas être mis en vente tant qu&apos;il n&apos;est
                      pas actif.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-900">
                      Dernière étape avant de pouvoir publier vos paniers
                    </p>
                    <p className="text-sm text-amber-800 mt-0.5">
                      Votre compte de paiement n&apos;est pas encore actif. Vos
                      paniers ne peuvent pas être mis en vente tant qu&apos;il
                      ne l&apos;est pas. Préparez votre IBAN et une pièce
                      d&apos;identité.
                    </p>
                  </>
                )}
              </div>
              <Link
                href="/api/stripe/connect/onboard"
                className="shrink-0 inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
              >
                {commerce.stripe_details_submitted
                  ? "Compléter mes informations"
                  : "Activer mes paiements"}
              </Link>
            </div>
          </div>
        )}

      {/* ── Content ── */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
