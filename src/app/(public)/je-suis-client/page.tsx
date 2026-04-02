import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { SharedFooter } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Je suis client",
  description:
    "Téléchargez l'app Kshare et achetez des paniers casher anti-gaspi à prix réduit près de chez vous. Boucheries, boulangeries, traiteurs casher partenaires.",
  openGraph: {
    title: "Je suis client | Kshare",
    description:
      "Achetez des paniers casher anti-gaspi à prix réduit près de chez vous.",
    url: "https://k-share.fr/je-suis-client",
  },
};
import {
  Smartphone,
  Tag,
  Heart,
  Clock,
  ShoppingBag,
  Star,
  Bell,
  CheckCircle,
  MapPin,
  Zap,
  Search,
  UtensilsCrossed,
  Milk,
  Leaf,
  Wine,
  Layers,
} from "lucide-react";

export default function JeSuisClientPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] opacity-50 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,#c8cef5_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#9ba8d8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.15]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div className="anim-hidden animate-fade-in-up inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-[#3744C8] font-medium mb-6 shadow-sm">
                <Smartphone className="h-3.5 w-3.5" />
                Application mobile
              </div>
              <h1 className="anim-hidden animate-fade-in-up delay-100 font-display text-4xl md:text-5xl font-bold text-[#3744C8] leading-tight mb-6">
                Sauvez des paniers<br />casher
              </h1>
              <p className="anim-hidden animate-fade-in-up delay-200 text-gray-500 text-lg leading-relaxed mb-8">
                Accédez à des produits casher de qualité à prix réduits tout en luttant contre
                le gaspillage alimentaire. Une démarche simple, rapide et solidaire.
              </p>
              <div className="anim-hidden animate-fade-in-up delay-300 flex gap-3 flex-wrap">
                <Link
                  href="#"
                  className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl px-5 py-3 transition-colors cursor-pointer"
                >
                  <svg className="h-5 w-5 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div>
                    <div className="text-[10px] text-gray-400 leading-none">Télécharger sur</div>
                    <div className="text-sm font-semibold text-white leading-snug">App Store</div>
                  </div>
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl px-5 py-3 transition-colors cursor-pointer"
                >
                  <svg className="h-5 w-5 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/>
                  </svg>
                  <div>
                    <div className="text-[10px] text-gray-400 leading-none">Télécharger sur</div>
                    <div className="text-sm font-semibold text-white leading-snug">Google Play</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Right — Phone mockup */}
            <div className="anim-hidden animate-fade-in-up delay-200 flex justify-center">
              <div className="relative">
                {/* Glow behind phone */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#3744C8]/20 to-[#5B6EF5]/10 rounded-[3rem] blur-2xl scale-110" />
                {/* Phone */}
                <div className="relative w-52">
                  <div className="bg-gray-900 rounded-[3rem] p-2.5 shadow-2xl shadow-gray-400/30">
                    <div className="bg-[#F8F9FC] rounded-[2.5rem] overflow-hidden h-[420px]">
                      {/* Status bar */}
                      <div className="bg-white px-5 pt-3 pb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-800">9:41</span>
                        <div className="flex gap-1">
                          <div className="w-4 h-1.5 bg-gray-800 rounded-full" />
                          <div className="w-2 h-1.5 bg-gray-300 rounded-full" />
                        </div>
                      </div>

                      {/* Header */}
                      <div className="bg-white px-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5 text-[#3744C8]" />
                              <span className="text-[10px] font-bold text-gray-800">Paris 16e</span>
                            </div>
                            <div className="text-[8px] text-gray-400">Disponible maintenant</div>
                          </div>
                          <div className="w-6 h-6 bg-[#EEF0F8] rounded-full flex items-center justify-center">
                            <Bell className="h-2.5 w-2.5 text-[#3744C8]" />
                          </div>
                        </div>

                        {/* Search bar mock */}
                        <div className="mt-2 bg-gray-100 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                          <Search className="h-2.5 w-2.5 text-gray-400" />
                          <span className="text-[9px] text-gray-400">Chercher un commerce...</span>
                        </div>
                      </div>

                      {/* Category chips */}
                      <div className="bg-white px-3 pt-2 pb-1 flex gap-1.5 overflow-hidden border-b border-gray-50">
                        {[
                          { icon: UtensilsCrossed, c: "#EF4444", label: "Bassari" },
                          { icon: Milk,            c: "#3B82F6", label: "Halavi" },
                          { icon: Leaf,            c: "#10B981", label: "Parvé" },
                        ].map((cat) => (
                          <div key={cat.label} className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-white text-[8px] font-bold shrink-0" style={{ backgroundColor: cat.c }}>
                            <cat.icon className="h-2 w-2" />
                            <span>{cat.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Cards */}
                      <div className="p-2 space-y-2">
                        {[
                          { icon: UtensilsCrossed, name: "Boucherie Cohen",  price: "5,90€", orig: "18€", type: "Bassari", color: "#FEF2F2", badge: "#EF4444", iconColor: "#EF4444", time: "17h-18h" },
                          { icon: Milk,            name: "Boulangerie Levi",  price: "4,50€", orig: "14€", type: "Halavi",  color: "#EFF6FF", badge: "#3B82F6", iconColor: "#3B82F6", time: "18h-19h" },
                          { icon: Leaf,            name: "Bio Casher Store", price: "3,90€", orig: "12€", type: "Parvé",   color: "#F0FDF4", badge: "#10B981", iconColor: "#10B981", time: "17h-18h30" },
                        ].map((card) => (
                          <div key={card.name} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 p-2">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: card.color }}>
                                <card.icon className="h-4 w-4" style={{ color: card.iconColor }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold text-gray-800 truncate">{card.name}</div>
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  <span className="text-[7px] font-bold text-white px-1 py-0.5 rounded" style={{ backgroundColor: card.badge }}>{card.type}</span>
                                  <span className="text-[7px] text-gray-400">• {card.time}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[10px] font-bold text-[#3744C8]">{card.price}</div>
                                <div className="text-[8px] text-gray-400 line-through">{card.orig}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-700 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── POURQUOI UTILISER KSHARE ? ─────────────── */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#E8ECF8] to-[#F4F5FB]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Pourquoi utiliser Kshare ?
            </h2>
            <p className="text-gray-500">Des avantages concrets pour vous et pour la planète</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Tag,      topBar: "from-emerald-400 to-green-500", title: "Prix réduits",      desc: "Économisez jusqu'à -70% sur des produits casher de qualité",           delay: "delay-100" },
              { icon: Heart,    topBar: "from-pink-400 to-red-500",      title: "Action solidaire",  desc: "Chaque achat contribue à réduire le gaspillage alimentaire",           delay: "delay-200" },
              { icon: Clock,    topBar: "from-blue-400 to-indigo-500",   title: "Commande rapide",   desc: "Réservez vos paniers en quelques clics depuis votre mobile",           delay: "delay-300" },
              { icon: ShoppingBag, topBar: "from-purple-400 to-violet-500", title: "Large choix",   desc: "Paniers Bassari, Halavi, Parvé, Mix et spécial Shabbat",               delay: "delay-100" },
              { icon: Star,     topBar: "from-amber-400 to-orange-500",  title: "Cacherout garantie", desc: "Tous les produits sont certifiés et contrôlés",                      delay: "delay-200" },
              { icon: Bell,     topBar: "from-teal-400 to-cyan-500",     title: "Simple et efficace", desc: "Notifications en temps réel pour les nouveaux paniers disponibles",  delay: "delay-300" },
            ].map((card) => (
              <div
                key={card.title}
                className={`anim-hidden animate-fade-in-up ${card.delay} bg-white rounded-2xl border border-[#e2e5f0]/60 overflow-hidden card-elevated`}
              >
                <div className={`h-1 bg-gradient-to-r ${card.topBar}`} />
                <div className="p-6">
                  <div className="w-11 h-11 bg-[#3744C8] rounded-xl flex items-center justify-center mb-4 shadow-sm">
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-gray-900 mb-1.5">{card.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── COMMENT ÇA MARCHE ─────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Comment ça marche ?
            </h2>
            <p className="text-gray-500">4 étapes simples pour sauver des paniers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "1", icon: Smartphone, title: "Téléchargez l'app",      desc: "Installez gratuitement l'application mobile Kshare",              delay: "delay-100" },
              { step: "2", icon: Zap,        title: "Créez votre compte",     desc: "Inscrivez-vous en quelques secondes avec votre email",             delay: "delay-200" },
              { step: "3", icon: MapPin,     title: "Choisissez vos paniers", desc: "Parcourez les paniers disponibles près de chez vous",              delay: "delay-300" },
              { step: "4", icon: CheckCircle,title: "Récupérez et savourez",  desc: "Retirez vos paniers aux horaires indiqués avec votre QR code",     delay: "delay-400" },
            ].map((item, i) => (
              <div key={item.step} className={`anim-hidden animate-fade-in-up ${item.delay} relative flex flex-col items-center`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] text-white flex items-center justify-center text-sm font-display font-bold mb-5 shadow-md z-10">
                  {item.step}
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-5 left-[calc(50%+20px)] right-0 h-px border-t-2 border-dashed border-[#3744C8]/30" />
                )}
                <div className="bg-white rounded-2xl p-5 text-center border border-[#e2e5f0]/60 w-full card-elevated">
                  <item.icon className="h-6 w-6 text-[#3744C8] mx-auto mb-3" />
                  <div className="font-display font-semibold text-gray-900 mb-2 text-sm">{item.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── TYPES DE PANIERS ─────────────── */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#E8ECF8] to-[#F4F5FB]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-sm border border-[#e2e5f0]/60 p-10">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold text-[#3744C8] mb-3">
                Différents types de paniers
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto">
                Retrouvez dans l&apos;application mobile une variété de paniers adaptés à vos besoins :
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "Bassari",  icon: UtensilsCrossed, cls: "bg-red-50 border-red-200 text-red-700" },
                { label: "Halavi",   icon: Milk,             cls: "bg-blue-50 border-blue-200 text-blue-700" },
                { label: "Parvé",    icon: Leaf,             cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { label: "Mix",      icon: Layers,           cls: "bg-purple-50 border-purple-200 text-purple-700" },
                { label: "Shabbat",  icon: Wine,             cls: "bg-amber-50 border-amber-200 text-amber-700" },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium ${chip.cls}`}
                >
                  <chip.icon className="h-4 w-4" />
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── CTA APP MOBILE ─────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="relative rounded-3xl p-12 text-center text-white shadow-xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #3744C8 0%, #1E2A9E 100%)" }}
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
            <div className="relative">
              <Smartphone className="h-10 w-10 mx-auto mb-6 opacity-70" />
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                Tout se passe sur l&apos;application mobile !
              </h2>
              <p className="text-white/70 text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
                Pour commander vos paniers, recevoir des notifications en temps réel et gérer vos
                réservations, téléchargez notre application mobile gratuite.
              </p>

              {/* App buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white hover:text-[#3744C8] bg-transparent h-11 font-display font-semibold cursor-pointer"
                  asChild
                >
                  <Link href="#">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    App Store
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white hover:text-[#3744C8] bg-transparent h-11 font-display font-semibold cursor-pointer"
                  asChild
                >
                  <Link href="#">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/>
                    </svg>
                    Google Play
                  </Link>
                </Button>
              </div>

            </div>
          </div>
        </div>
      </section>

      <SharedFooter variant="minimal" />
    </div>
  );
}
