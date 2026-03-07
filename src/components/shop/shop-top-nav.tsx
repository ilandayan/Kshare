"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, ClipboardList } from "lucide-react";

const TABS = [
  { label: "Tableau de bord",  href: "/shop/dashboard",       icon: LayoutDashboard },
  { label: "Gérer mes paniers", href: "/shop/paniers",         icon: ShoppingBag },
  { label: "Commandes",         href: "/shop/paniers/orders",  icon: ClipboardList },
] as const;

export function ShopTopNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-[#e2e5f0] px-6">
      <div className="flex items-center gap-1">
        {TABS.map((tab) => {
          const active =
            tab.href === "/shop/paniers"
              ? pathname === "/shop/paniers"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium rounded-full my-2 transition-colors ${
                active
                  ? "bg-[#3744C8] text-white"
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
