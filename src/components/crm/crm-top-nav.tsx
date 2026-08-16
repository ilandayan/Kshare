"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Onglets du CRM. L'ordre suit la journée de travail : on prospecte, puis on
 * regarde ses clients et ses chiffres, et la gestion administrative ferme la
 * marche.
 */
const TABS = [
  { label: "Prospection", href: "/kshare-crm" },
  { label: "Associations", href: "/kshare-crm/associations" },
  { label: "Clients", href: "/kshare-crm/clients" },
  { label: "Chiffres", href: "/kshare-crm/chiffres" },
  { label: "Seuils", href: "/kshare-crm/seuils" },
  { label: "Factures", href: "/kshare-crm/factures" },
  { label: "Charges", href: "/kshare-crm/charges" },
  { label: "URSSAF", href: "/kshare-crm/urssaf" },
  { label: "Documents", href: "/kshare-crm/documents" },
];

export function CrmTopNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-[#e2e5f0] px-6 overflow-x-auto">
      <div className="flex items-center gap-1 h-12 flex-nowrap whitespace-nowrap">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/kshare-crm"
              ? pathname === "/kshare-crm"
              : pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? "bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] text-white shadow-sm"
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
