"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { KshareLogo } from "@/components/shared/kshare-logo";
import { Store, Heart, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Accueil", href: "/" },
  { label: "Notre mission", href: "/notre-mission" },
  { label: "Je suis commerçant", href: "/je-suis-commercant" },
  { label: "Je suis client", href: "/je-suis-client" },
  { label: "Contact", href: "/contact" },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-3 z-50 mx-3 sm:mx-5 md:mx-8 bg-white/80 backdrop-blur-xl border border-gray-200/40 rounded-2xl shadow-lg shadow-gray-200/50">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-[68px]">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0" aria-label="Kshare - Accueil">
            <KshareLogo size={38} />
          </Link>

          {/* Center nav — desktop */}
          <nav className="hidden md:flex items-center gap-1.5">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-150 ${
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
          <div className="hidden md:flex items-center gap-2.5">
            <Button
              size="sm"
              className="bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] hover:from-[#2E3AB0] hover:to-[#4B5BE2] text-white shadow-sm gap-1.5 text-[13px] font-semibold rounded-lg cursor-pointer border-0 px-4 py-2"
              asChild
            >
              <Link href="/connexion?role=commerce">
                <Store className="h-3.5 w-3.5" />
                Commerçant
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-sm gap-1.5 text-[13px] font-semibold rounded-lg cursor-pointer border-0 px-4 py-2"
              asChild
            >
              <Link href="/connexion?role=association">
                <Heart className="h-3.5 w-3.5" />
                Association
              </Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
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
              <Button size="sm" className="justify-start gap-2 bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] hover:from-[#2E3AB0] hover:to-[#4B5BE2] text-white border-0 cursor-pointer" asChild>
                <Link href="/connexion?role=commerce" onClick={() => setMobileOpen(false)}>
                  <Store className="h-4 w-4" /> Espace Commerçant
                </Link>
              </Button>
              <Button size="sm" className="justify-start gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 cursor-pointer" asChild>
                <Link href="/connexion?role=association" onClick={() => setMobileOpen(false)}>
                  <Heart className="h-4 w-4" /> Espace Association
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
