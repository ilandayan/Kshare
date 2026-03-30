import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#EEF0F8] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* 404 badge */}
        <div className="inline-flex items-center gap-2 bg-white border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-8 shadow-sm">
          <Search className="h-3.5 w-3.5 text-[#3744C8]" />
          Erreur 404
        </div>

        {/* Big number */}
        <div className="font-display text-[120px] md:text-[160px] font-extrabold leading-none bg-gradient-to-br from-[#3744C8] to-[#4f6df5] bg-clip-text text-transparent select-none">
          404
        </div>

        {/* Message */}
        <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mt-4 mb-3">
          Page introuvable
        </h1>
        <p className="text-gray-500 text-lg mb-10 leading-relaxed">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-[#3744C8] hover:bg-[#2d38a8] text-white rounded-xl px-6">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Retour à l&apos;accueil
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl px-6">
            <Link href="/faq">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Consulter la FAQ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
