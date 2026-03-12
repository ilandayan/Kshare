"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Calendar, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/asso/paniers-dons",     label: "Paniers disponibles", icon: Gift },
  { href: "/asso/mes-reservations", label: "Mes réservations",    icon: Calendar },
  { href: "/asso/reporting",        label: "Reporting",           icon: BarChart3 },
];

export function AssoSidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-4 space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              active
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm"
                : "text-gray-600 hover:bg-purple-50 hover:text-purple-600"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
