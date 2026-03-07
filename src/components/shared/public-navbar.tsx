import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Store, Users } from "lucide-react";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e2e5f0] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#3744C8] rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg leading-none">K</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Kshare</span>
          </Link>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-500 font-medium">
            <Link href="/" className="hover:text-gray-900 transition-colors">Accueil</Link>
            <Link href="/notre-mission" className="hover:text-gray-900 transition-colors">Notre mission</Link>
            <Link href="/je-suis-client" className="hover:text-gray-900 transition-colors">Je suis client</Link>
            <Link href="/contact" className="hover:text-gray-900 transition-colors">Contact</Link>
          </nav>

          {/* Right CTA */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden md:flex items-center gap-1.5 text-gray-700 border-gray-300" asChild>
              <Link href="/connexion?role=commerce">
                <Store className="h-3.5 w-3.5" />
                Espace Commerçant
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="hidden md:flex items-center gap-1.5 text-gray-700 border-gray-300" asChild>
              <Link href="/connexion?role=association">
                <Users className="h-3.5 w-3.5" />
                Espace Association
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
