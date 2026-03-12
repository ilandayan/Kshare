"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Tableau de bord",       href: "/asso/dashboard" },
  { label: "Récupération de dons",  href: "/asso/paniers-dons" },
  { label: "Mes réservations",      href: "/asso/mes-reservations" },
  { label: "Reporting",             href: "/asso/reporting" },
];

export function AssoTopNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-[#e2e5f0] px-6 overflow-x-auto">
      <div className="flex items-center gap-1 h-12 flex-nowrap whitespace-nowrap">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
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
