"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, ClipboardList, User } from "lucide-react";

const TABS = [
  { label: "Paniers",      href: "/client/paniers",    icon: ShoppingBag },
  { label: "Mes commandes", href: "/client/commandes",  icon: ClipboardList },
  { label: "Mon profil",   href: "/client/profil",     icon: User },
] as const;

export function ClientTopNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-[#e2e5f0] px-6 overflow-x-auto">
      <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
        {TABS.map((tab) => {
          const active =
            tab.href === "/client/paniers"
              ? pathname === "/client/paniers"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium rounded-full my-2 transition-colors cursor-pointer shrink-0 ${
                active
                  ? "bg-emerald-600 text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
