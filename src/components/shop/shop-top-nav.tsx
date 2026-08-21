"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, ClipboardList, Wallet, ScanLine, Users } from "lucide-react";

const TABS = [
  { label: "Tableau de bord",  href: "/shop/dashboard",       icon: LayoutDashboard },
  { label: "Gérer mes paniers", href: "/shop/paniers",         icon: ShoppingBag },
  { label: "Commandes",         href: "/shop/paniers/orders",  icon: ClipboardList },
  { label: "Scanner retrait",   href: "/shop/scan",            icon: ScanLine },
  { label: "Finances",          href: "/shop/finances",        icon: Wallet },
  { label: "Équipe",            href: "/shop/equipe",          icon: Users },
] as const;

/** Onglets reserves au proprietaire du magasin. */
const RESERVES = ["/shop/finances", "/shop/equipe"];

/**
 * `voitLesComptes` est faux pour un employe : Finances et Equipe disparaissent.
 * Ce n'est qu'un confort — le RLS refuse deja les chiffres a ce role, et la
 * page Equipe le renvoie au tableau de bord — mais un onglet qui mene nulle
 * part passe pour une panne.
 */
export function ShopTopNav({ voitLesComptes = true }: { voitLesComptes?: boolean }) {
  const pathname = usePathname();
  const onglets = TABS.filter((t) => voitLesComptes || !RESERVES.includes(t.href));

  return (
    <div className="bg-white border-b border-[#e2e5f0] px-6 overflow-x-auto">
      <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
        {onglets.map((tab) => {
          const active =
            tab.href === "/shop/paniers"
              ? pathname === "/shop/paniers"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium rounded-full my-2 transition-colors cursor-pointer shrink-0 ${
                active
                  ? "bg-gradient-to-r from-[#1e2a78] via-[#2d4de0] to-[#4f6df5] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
