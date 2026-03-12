"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Tableau de bord global", href: "/kshare-admin" },
  { label: "Utilisateurs",           href: "/kshare-admin/utilisateurs" },
  { label: "Commandes",              href: "/kshare-admin/commandes" },
  { label: "Paniers",                href: "/kshare-admin/paniers" },
  { label: "Comptes",                href: "/kshare-admin/comptes" },
  { label: "Finance",                href: "/kshare-admin/finance" },
  { label: "Reporting",              href: "/kshare-admin/reporting" },
  { label: "Support",                href: "/kshare-admin/support" },
];

export function AdminTopNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-[#e2e5f0] px-6 overflow-x-auto">
      <div className="flex items-center gap-1 h-12 flex-nowrap whitespace-nowrap">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/kshare-admin"
              ? pathname === "/kshare-admin"
              : pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? "bg-gradient-to-r from-[#D72638] to-[#FF6B6B] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
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
