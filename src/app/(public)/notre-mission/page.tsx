import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { SharedFooter } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Notre mission",
  description:
    "Kshare lutte contre le gaspillage alimentaire dans le monde casher en connectant commerces et consommateurs autour de paniers invendus à prix réduit.",
  openGraph: {
    title: "Notre mission | Kshare",
    description:
      "Kshare lutte contre le gaspillage alimentaire dans le monde casher.",
    url: "https://k-share.fr/notre-mission",
  },
};
import {
  Sparkles,
  CheckCircle,
  Store,
  Heart,
  Leaf,
  Clock,
  ShieldCheck,
  Unlock,
  ShoppingBasket,
  UtensilsCrossed,
  Milk,
  Wine,
  Layers,
  BadgePercent,
  Smartphone,
  ArrowRight,
  ShoppingCart,
  X,
} from "lucide-react";

export default function NotreMissionPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative py-24 md:py-32 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-60 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,#c8cef5_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#9ba8d8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.15]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="anim-hidden animate-fade-in-up inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-8 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#3744C8]" />
            Notre mission
          </div>
          <h1 className="anim-hidden animate-fade-in-up delay-100 font-display text-4xl md:text-5xl font-bold text-[#3744C8] leading-tight mb-6">
            Rendre le casher accessible<br />et lutter contre le gaspillage
          </h1>
          <p className="anim-hidden animate-fade-in-up delay-200 text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Kshare connecte clients, commerçants et associations autour d&apos;une mission commune :
            sauver des paniers casher de qualité tout en faisant des économies
          </p>
        </div>
      </section>

      {/* ─────────────── PROBLÈMES (3 colonnes) ─────────────── */}
      <section className="py-24 md:py-40 bg-gradient-to-b from-[#E8ECF8] to-[#F4F5FB]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Les problèmes que nous résolvons
            </h2>
            <p className="text-gray-500">Chaque acteur fait face à des défis spécifiques</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* 1. Problème commerçants — BLEU */}
            <div className="anim-hidden animate-fade-in-up delay-100 bg-white rounded-2xl border border-[#e2e5f0]/60 overflow-hidden card-elevated">
              <div className="h-1 bg-gradient-to-r from-blue-400 to-[#3744C8]" />
              <div className="p-7">
                <div className="w-12 h-12 bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900 mb-3">Pour les commerçants</h3>
                <ul className="space-y-2.5 text-sm text-gray-500 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-[#3744C8] shrink-0 mt-0.5" />
                    Des invendus quotidiens qui finissent à la poubelle
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-[#3744C8] shrink-0 mt-0.5" />
                    Des pertes financières récurrentes et du gaspillage
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-[#3744C8] shrink-0 mt-0.5" />
                    Peu de canaux pour écouler les surplus rapidement
                  </li>
                </ul>
              </div>
            </div>

            {/* 2. Problème associations — VIOLET/ROSE */}
            <div className="anim-hidden animate-fade-in-up delay-200 bg-white rounded-2xl border border-[#e2e5f0]/60 overflow-hidden card-elevated">
              <div className="h-1 bg-gradient-to-r from-purple-400 to-pink-500" />
              <div className="p-7">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900 mb-3">Pour les associations</h3>
                <ul className="space-y-2.5 text-sm text-gray-500 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                    Accès limité aux produits casher pour les familles dans le besoin
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                    Budget limité et approvisionnement irrégulier
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                    Pas de plateforme dédiée pour centraliser les dons
                  </li>
                </ul>
              </div>
            </div>

            {/* 3. Problème clients — VERT */}
            <div className="anim-hidden animate-fade-in-up delay-300 bg-white rounded-2xl border border-[#e2e5f0]/60 overflow-hidden card-elevated">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <div className="p-7">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900 mb-3">Pour les clients</h3>
                <ul className="space-y-2.5 text-sm text-gray-500 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    Le casher est souvent cher et peu accessible
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    Peu de diversité dans les options à prix réduit
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    Difficile de trouver des bons plans casher à proximité
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── NOTRE SOLUTION ─────────────── */}
      <section className="py-24 md:py-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="anim-hidden animate-fade-in-up bg-white rounded-3xl border border-[#e2e5f0]/60 overflow-hidden card-elevated">
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-[#3744C8]" />
            <div className="p-10 md:p-12">
              <div className="flex items-start gap-5 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-[#3744C8] mb-2">Notre solution</h2>
                  <p className="text-gray-500 leading-relaxed">
                    Kshare crée un pont entre tous ces acteurs via une plateforme unique et intuitive
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {/* 1. Commerçants — BLEU */}
                <div className="bg-[#F8F9FC] rounded-2xl p-5 border border-[#e2e5f0]/40">
                  <div className="w-9 h-9 bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] rounded-xl flex items-center justify-center mb-3">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-display font-semibold text-gray-900 text-sm mb-1">Les commerçants</div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Valorisent leurs invendus au lieu de les jeter, touchent de nouveaux clients et peuvent faire don de leurs paniers
                  </p>
                </div>
                {/* 2. Associations — VIOLET/ROSE */}
                <div className="bg-[#F8F9FC] rounded-2xl p-5 border border-[#e2e5f0]/40">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-3">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-display font-semibold text-gray-900 text-sm mb-1">Les associations</div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Reçoivent des paniers offerts par les clients et les commerçants et accèdent à des produits casher certifiés
                  </p>
                </div>
                {/* 3. Clients — VERT */}
                <div className="bg-[#F8F9FC] rounded-2xl p-5 border border-[#e2e5f0]/40">
                  <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-3">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-display font-semibold text-gray-900 text-sm mb-1">Les clients</div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Achètent des paniers casher à prix réduit et peuvent faire des dons aux associations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── COMMENT ÇA FONCTIONNE (CLIENTS) ─────────────── */}
      <section className="py-24 md:py-40 bg-gradient-to-b from-[#E8ECF8] to-[#F4F5FB]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Comment ça fonctionne ?
            </h2>
            <p className="text-gray-500">Un processus simple pour les clients</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Trouvez",           desc: "Parcourez les paniers casher disponibles près de chez vous via l'app",  delay: "delay-100" },
              { step: "2", title: "Réservez",           desc: "Choisissez vos paniers à prix réduit et payez en toute sécurité",       delay: "delay-200" },
              { step: "3", title: "Récupérez",          desc: "Présentez votre QR code en magasin et récupérez votre panier",           delay: "delay-300" },
              { step: "4", title: "Offrez ou savourez", desc: "Profitez de vos produits ou faites un don à une association (tsedaka)",  delay: "delay-400" },
            ].map((item, i) => (
              <div key={item.step} className={`anim-hidden animate-fade-in-up ${item.delay} relative flex flex-col items-center`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] text-white flex items-center justify-center text-sm font-display font-bold mb-5 shadow-md z-10">
                  {item.step}
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-5 left-[calc(50%+20px)] right-0 h-px border-t-2 border-dashed border-[#3744C8]/30" />
                )}
                <div className="bg-white rounded-2xl p-5 text-center border border-[#e2e5f0]/60 w-full card-elevated">
                  <div className="font-display font-semibold text-gray-900 mb-2">{item.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── TYPES DE PANIERS ─────────────── */}
      <section className="py-24 md:py-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Types de paniers
            </h2>
            <p className="text-gray-500">Une offre adaptée à tous les besoins</p>
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
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm font-medium ${chip.cls}`}
              >
                <chip.icon className="h-3.5 w-3.5" />
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── LES AVANTAGES POUR CHACUN ─────────────── */}
      <section className="py-24 md:py-40 bg-gradient-to-b from-[#E8ECF8] to-[#F4F5FB]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Les avantages pour chacun
            </h2>
            <p className="text-gray-500">Un impact positif pour tous les acteurs de Kshare</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* 1. Commerçants — BLEU */}
            <div className="anim-hidden animate-fade-in-up delay-100 bg-white rounded-2xl border border-[#e2e5f0]/60 overflow-hidden card-elevated">
              <div className="h-1 bg-gradient-to-r from-blue-400 to-[#3744C8]" />
              <div className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] flex items-center justify-center mb-5 shadow-sm">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Pour les commerçants</h3>
                <ul className="space-y-3">
                  {[
                    "Transformez vos invendus en revenus au lieu de les jeter",
                    "Touchez une nouvelle clientèle dans votre quartier",
                    "Faites don de vos paniers invendus aux associations",
                    "Suivi des ventes, statistiques et reporting en temps réel",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-[#3744C8] shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 2. Associations — VIOLET/ROSE */}
            <div className="anim-hidden animate-fade-in-up delay-200 bg-white rounded-2xl border border-[#e2e5f0]/60 overflow-hidden card-elevated">
              <div className="h-1 bg-gradient-to-r from-purple-400 to-pink-500" />
              <div className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-5 shadow-sm">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Pour les associations</h3>
                <ul className="space-y-3">
                  {[
                    "Recevez des paniers casher offerts par les clients et les commerçants",
                    "Produits certifiés et de qualité pour des familles dans le besoin",
                    "Réservation simple et suivi des collectes en ligne",
                    "Reporting détaillé de vos actions solidaires",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 3. Clients — VERT */}
            <div className="anim-hidden animate-fade-in-up delay-300 bg-white rounded-2xl border border-[#e2e5f0]/60 overflow-hidden card-elevated">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <div className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5 shadow-sm">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Pour les clients</h3>
                <ul className="space-y-3">
                  {[
                    "Économies garanties : jusqu'à -70% sur des produits casher",
                    "100% casher certifié avec cacherout vérifiée",
                    "Géolocalisation pour trouver les paniers les plus proches",
                    "Faites une mitzvah en offrant un panier à une association",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── FEATURES ─────────────── */}
      <section className="py-24 md:py-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: BadgePercent, bg: "bg-emerald-500", title: "Prix réduits pour les clients", delay: "delay-100",
                desc: "Des paniers casher jusqu'à -70% : boucherie, boulangerie, traiteur, produits laitiers et bien plus" },
              { icon: Leaf,   bg: "bg-green-500",  title: "Impact environnemental", delay: "delay-200",
                desc: "Chaque panier sauvé réduit le gaspillage alimentaire et notre empreinte écologique" },
              { icon: Smartphone, bg: "bg-blue-500", title: "App mobile intuitive", delay: "delay-300",
                desc: "Trouvez, réservez et payez vos paniers en quelques secondes depuis votre téléphone" },
              { icon: Clock,  bg: "bg-orange-500",   title: "Temps réel",             delay: "delay-100",
                desc: "Notifications instantanées quand un nouveau panier est disponible près de chez vous" },
              { icon: Unlock, bg: "bg-purple-500", title: "Transparence totale",    delay: "delay-200",
                desc: "Suivi de vos commandes, historique des achats et de vos dons accessibles à tout moment" },
              { icon: ShieldCheck, bg: "bg-[#3744C8]", title: "Certification Cacherout", delay: "delay-300",
                desc: "Tous les produits sont certifiés casher avec traçabilité complète" },
            ].map((feature) => (
              <div key={feature.title} className={`anim-hidden animate-fade-in-up ${feature.delay} bg-white rounded-2xl p-5 border border-[#e2e5f0]/60 flex items-start gap-4 card-elevated`}>
                <div className={`w-10 h-10 ${feature.bg} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-display font-semibold text-gray-900 text-sm mb-1">{feature.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── CTA BANNER ─────────────── */}
      <section className="py-24 md:py-40 bg-gradient-to-b from-[#E8ECF8] to-[#F4F5FB]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="relative rounded-3xl p-12 text-center text-white shadow-xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #3744C8 0%, #1E2A9E 100%)" }}
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
            <div className="relative">
              <ShoppingBasket className="h-10 w-10 mx-auto mb-6 opacity-70" />
              <h2 className="font-display text-3xl font-bold mb-3">
                Rejoignez Kshare dès aujourd&apos;hui
              </h2>
              <p className="text-white/70 mb-8">
                Commerçant, association ou client : chacun a sa place dans Kshare
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {/* 1. Commerçant — BLEU */}
                <Button
                  size="lg"
                  className="bg-white text-[#3744C8] hover:bg-white/90 h-11 font-display font-semibold cursor-pointer border-0"
                  asChild
                >
                  <Link href="/connexion?role=commerce">
                    <Store className="mr-1.5 h-4 w-4" /> Espace Commerçant
                  </Link>
                </Button>
                {/* 2. Association — VIOLET/ROSE */}
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white hover:from-purple-500/40 hover:to-pink-500/40 h-11 font-display font-semibold cursor-pointer border border-white/30"
                  asChild
                >
                  <Link href="/connexion?role=association">
                    <Heart className="mr-1.5 h-4 w-4" /> Espace Association
                  </Link>
                </Button>
                {/* 3. Client — VERT */}
                <Button
                  size="lg"
                  className="bg-emerald-500/20 text-white hover:bg-emerald-500/30 h-11 font-display font-semibold cursor-pointer border border-white/30"
                  asChild
                >
                  <Link href="/je-suis-client">
                    <ShoppingCart className="mr-1.5 h-4 w-4" /> Je suis client
                    <ArrowRight className="ml-1.5 h-4 w-4" />
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
