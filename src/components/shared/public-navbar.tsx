"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { KshareLogo } from "@/components/shared/kshare-logo";
import { Store, Users, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Accueil", href: "/" },
  { label: "Notre mission", href: "/notre-mission" },
  { label: "Je suis client", href: "/je-suis-client" },
  { label: "Contact", href: "/contact" },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-200/60 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <KshareLogo size={34} />
          </Link>

          {/* Center nav — desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                    isActive
                      ? "text-[#3744C8] bg-blue-50"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#3744C8] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right CTA — desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 gap-1.5 text-sm"
              asChild
            >
              <Link href="/connexion?role=commerce">
                <Store className="h-3.5 w-3.5" />
                Commerçant
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-[#3744C8] hover:bg-[#2B38B8] text-white shadow-sm gap-1.5 text-sm rounded-lg"
              asChild
            >
              <Link href="/connexion?role=association">
                <Users className="h-3.5 w-3.5" />
                Association
              </Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 pb-4 space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "text-[#3744C8] bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2 text-gray-700" asChild>
                <Link href="/connexion?role=commerce" onClick={() => setMobileOpen(false)}>
                  <Store className="h-4 w-4" /> Espace Commerçant
                </Link>
              </Button>
              <Button size="sm" className="justify-start gap-2 bg-[#3744C8] hover:bg-[#2B38B8] text-white" asChild>
                <Link href="/connexion?role=association" onClick={() => setMobileOpen(false)}>
                  <Users className="h-4 w-4" /> Espace Association
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
