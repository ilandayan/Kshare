import Link from "next/link";
import { KshareLogo } from "@/components/shared/kshare-logo";
import { Store, Heart } from "lucide-react";

interface SharedFooterProps {
  variant?: "full" | "minimal";
}

export function SharedFooter({ variant = "full" }: SharedFooterProps) {
  if (variant === "minimal") {
    return (
      <footer className="bg-[#0F1B40] text-white pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-blue-200 gap-3">
            <div className="flex items-center gap-3">
              <KshareLogo size={28} variant="white" />
              <span className="text-blue-300">·</span>
              <span>© {new Date().getFullYear()} Kshare. Tous droits réservés.</span>
            </div>
            <a
              href="mailto:contact@k-share.fr"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              contact@k-share.fr
            </a>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-[#0F1B40] text-white pt-14 pb-8 mt-4" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-10">
          {/* Col 1 — Brand */}
          <div>
            <div className="mb-4">
              <KshareLogo size={36} variant="white" />
            </div>
            <p className="text-sm text-blue-200 mb-4 leading-relaxed">
              La plateforme solidaire pour sauver des paniers casher et lutter contre le gaspillage alimentaire.
            </p>
            <div className="flex items-center gap-1.5 text-sm text-blue-200">
              <Heart className="h-3.5 w-3.5" />
              Agissons ensemble
            </div>
          </div>

          {/* Col 2 — Navigation */}
          <div>
            <h4 className="font-semibold mb-5 text-sm tracking-widest uppercase text-blue-100">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm text-blue-200">
              {[
                { label: "Accueil", href: "/" },
                { label: "Notre mission", href: "/notre-mission" },
                { label: "Je suis client", href: "/je-suis-client" },
                { label: "Je suis commerçant", href: "/je-suis-commercant" },
                { label: "FAQ", href: "/faq" },
                { label: "Contact", href: "/contact" },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Espaces */}
          <div>
            <h4 className="font-semibold mb-5 text-sm tracking-widest uppercase text-blue-100">
              Espaces
            </h4>
            <ul className="space-y-2.5 text-sm text-blue-200">
              <li>
                <Link
                  href="/connexion?role=commerce"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Store className="h-3.5 w-3.5" /> Espace Commerçant
                </Link>
              </li>
              <li>
                <Link
                  href="/connexion?role=association"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Heart className="h-3.5 w-3.5" /> Espace Association
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 — App mobile */}
          <div>
            <h4 className="font-semibold mb-5 text-sm tracking-widest uppercase text-blue-100">
              Application mobile
            </h4>
            <p className="text-sm text-blue-200 mb-4 leading-relaxed">
              Téléchargez l&apos;app pour commander vos paniers
            </p>
            <div className="space-y-2">
              {/* App Store */}
              <Link
                href="#"
                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 transition-colors"
              >
                <svg className="h-5 w-5 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div>
                  <div className="text-[10px] text-blue-300 leading-none">Télécharger sur</div>
                  <div className="text-sm font-semibold text-white leading-snug">App Store</div>
                </div>
              </Link>
              {/* Google Play */}
              <Link
                href="#"
                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 transition-colors"
              >
                <svg className="h-5 w-5 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/>
                </svg>
                <div>
                  <div className="text-[10px] text-blue-300 leading-none">Télécharger sur</div>
                  <div className="text-sm font-semibold text-white leading-snug">Google Play</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-blue-200 gap-3">
          <span>© {new Date().getFullYear()} Kshare. Tous droits réservés.</span>
          <div className="flex items-center gap-5">
            <Link href="/cgu" className="hover:text-white transition-colors">CGU</Link>
            <Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/suppression-compte" className="hover:text-white transition-colors">Suppression de compte</Link>
            <a
              href="mailto:contact@k-share.fr"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              contact@k-share.fr
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
