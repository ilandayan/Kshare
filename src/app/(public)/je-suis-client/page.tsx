import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/shared/public-navbar";
import {
  Smartphone,
  Tag,
  Heart,
  Clock,
  ShoppingBag,
  Star,
  Bell,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default function JeSuisClientPage() {
  return (
    <div className="min-h-screen bg-[#EEF0F8]">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#3744C8] leading-tight mb-6">
                Sauvez des paniers<br />casher
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Accédez à des produits casher de qualité à prix réduits tout en luttant contre
                le gaspillage alimentaire. Une démarche simple, rapide et solidaire.
              </p>
              <Button
                size="lg"
                className="bg-[#3744C8] hover:bg-[#2B38B8] text-white h-12 px-8 rounded-xl shadow-sm"
                asChild
              >
                <Link href="#">
                  <Smartphone className="mr-2.5 h-5 w-5" />
                  Télécharger l&apos;app
                </Link>
              </Button>
            </div>

            {/* Right — Photo */}
            <div className="relative">
              <div className="bg-white rounded-3xl shadow-md overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80"
                  alt="Clients utilisant l'application Kshare"
                  className="w-full h-[340px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── POURQUOI UTILISER KSHARE ? ─────────────── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#3744C8] mb-3">Pourquoi utiliser Kshare ?</h2>
            <p className="text-gray-500">Des avantages concrets pour vous et pour la planète</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Tag,
                title: "Prix réduits",
                desc: "Économisez jusqu'à -50% sur des produits casher de qualité",
              },
              {
                icon: Heart,
                title: "Action solidaire",
                desc: "Chaque achat contribue à réduire le gaspillage alimentaire",
              },
              {
                icon: Clock,
                title: "Commande rapide",
                desc: "Réservez vos paniers en quelques clics depuis votre mobile",
              },
              {
                icon: ShoppingBag,
                title: "Large choix",
                desc: "Paniers Bassari, Halavi, Parvé, Mix et spécial Shabbat",
              },
              {
                icon: Star,
                title: "Hashgakha garantie",
                desc: "Tous les produits sont certifiés et contrôlés",
              },
              {
                icon: Bell,
                title: "Simple et efficace",
                desc: "Notifications en temps réel pour les nouveaux paniers",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e5f0]/60 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 bg-[#3744C8] rounded-xl flex items-center justify-center mb-4 shadow-sm">
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── COMMENT ÇA MARCHE ─────────────── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[#3744C8] mb-3">Comment ça marche ?</h2>
            <p className="text-gray-500">4 étapes simples pour sauver des paniers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Téléchargez l'app",     desc: "Installez gratuitement l'application mobile Kshare" },
              { step: "2", title: "Créez votre compte",    desc: "Inscrivez-vous en quelques secondes" },
              { step: "3", title: "Choisissez vos paniers",desc: "Parcourez les paniers disponibles près de chez vous" },
              { step: "4", title: "Récupérez et savourez", desc: "Retirez vos paniers aux horaires indiqués" },
            ].map((item, i) => (
              <div key={item.step} className="relative flex flex-col items-center">
                {/* Step bubble */}
                <div className="w-10 h-10 rounded-full bg-[#3744C8] text-white flex items-center justify-center text-sm font-bold mb-5 shadow-sm z-10">
                  {item.step}
                </div>
                {/* Dashed connector */}
                {i < 3 && (
                  <div className="hidden md:block absolute top-5 left-[calc(50%+20px)] right-0 h-px border-t-2 border-dashed border-[#3744C8]/30" />
                )}
                {/* Card */}
                <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-[#e2e5f0]/60 w-full">
                  <div className="font-semibold text-gray-900 mb-2 text-sm">{item.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── TYPES DE PANIERS ─────────────── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-sm border border-[#e2e5f0]/60 overflow-hidden">
            <div className="grid md:grid-cols-2">
              {/* Left */}
              <div className="p-10">
                <h2 className="text-3xl font-bold text-[#3744C8] mb-3">Différents types<br />de paniers</h2>
                <p className="text-gray-500 text-sm mb-7 leading-relaxed">
                  Retrouvez dans l&apos;application mobile une variété de paniers adaptés à vos besoins :
                </p>
                <ul className="space-y-3">
                  {[
                    "Bassari (Viande)",
                    "Halavi (Laitier)",
                    "Parvé (Neutre)",
                    "Mix (Varié)",
                    "Spécial Shabbat",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-gray-700">
                      <div className="w-6 h-6 rounded-full border-2 border-[#3744C8] flex items-center justify-center shrink-0">
                        <CheckCircle className="h-3.5 w-3.5 text-[#3744C8]" />
                      </div>
                      <span className="text-sm font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Right — Photo */}
              <div className="relative h-64 md:h-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&q=80"
                  alt="Paniers casher"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── CTA APP MOBILE ─────────────── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-3xl p-12 text-center text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #3744C8 0%, #2B38B8 100%)" }}
          >
            <Smartphone className="h-10 w-10 mx-auto mb-6 opacity-70" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Tout se passe sur l&apos;application mobile !
            </h2>
            <p className="text-white/70 text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
              Pour commander vos paniers, recevez des notifications en temps réel et gérer vos
              réservations, téléchargez notre application mobile gratuite.
            </p>

            {/* App buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Button
                size="lg"
                variant="outline"
                className="border-white/50 text-white hover:bg-white hover:text-[#3744C8] bg-transparent h-11"
                asChild
              >
                <Link href="#">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  App Store
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/50 text-white hover:bg-white hover:text-[#3744C8] bg-transparent h-11"
                asChild
              >
                <Link href="#">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.18 23.76c.35.2.76.23 1.15.08L15.31 12 3.33.16C2.94.01 2.53.04 2.18.24 1.48.64 1 1.38 1 2.23v19.54c0 .85.48 1.59 1.18 1.99zm14.55-12.36l-2.91-2.91-9.4 9.4 12.31-6.49zM17.73.24L5.42 6.73l2.91 2.91 9.4-9.4zM20.82 10.7l-2.95-1.56-3.16 3.16 3.16 3.16 2.95-1.56c.84-.45 1.18-1.28 1.18-2 0-.72-.34-1.55-1.18-2z"/>
                  </svg>
                  Google Play
                </Link>
              </Button>
            </div>

            {/* Divider */}
            <div className="border-t border-white/20 pt-6">
              <p className="text-white/50 text-sm mb-3">L&apos;application mobile n&apos;est pas encore disponible ?</p>
              <Button
                variant="outline"
                className="border-white/40 text-white hover:bg-white hover:text-[#3744C8] bg-transparent"
                asChild
              >
                <Link href="/connexion">
                  Découvrir la version web (démo) <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── FOOTER ─────────────── */}
      <footer className="bg-[#0F1B40] text-white pt-8 pb-8 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-blue-200 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                <span className="text-[#3744C8] font-bold text-sm leading-none">K</span>
              </div>
              <span className="font-semibold">Kshare</span>
              <span className="text-blue-300">·</span>
              <span>© 2024 Tous droits réservés.</span>
            </div>
            <a href="mailto:contact@k-share.fr" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              contact@k-share.fr
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
