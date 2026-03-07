import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { KshareLogo } from "@/components/shared/kshare-logo";
import {
  ShoppingBag,
  Heart,
  Store,
  ArrowRight,
  CheckCircle,
  Smartphone,
  Users,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#EEF0F8]">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative py-24 md:py-36 text-center overflow-hidden">
        {/* Subtle radial glow behind title */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, #c8cef5 0%, transparent 70%)",
          }}
        />
        {/* Dot-grid overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, #9ba8d8 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.18,
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-8 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#3744C8]" />
            Solidarité · Authenticité · Éthique
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-tight mb-6 tracking-tight">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #3744C8 0%, #5B6EF5 60%, #7B8FFF 100%)",
              }}
            >
              Kshare – La solution solidaire
            </span>
            <br />
            <span className="text-gray-800">pour sauver des paniers casher</span>
          </h1>

          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Rejoignez une communauté engagée dans la lutte contre le gaspillage alimentaire.
            Connectez commerçants, clients et associations pour donner une seconde vie aux paniers invendus.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-white px-8 h-12 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #3744C8 0%, #5B6EF5 100%)",
              }}
              asChild
            >
              <Link href="/inscription-commercant">Inscrire mon commerce</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-gray-300 text-gray-700 bg-white/80 hover:bg-white hover:border-[#3744C8] hover:text-[#3744C8] px-8 h-12 rounded-xl transition-all"
              asChild
            >
              <Link href="/inscription-association">Inscrire mon association</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────────── STATS ─────────────── */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShoppingBag, value: "1000+", label: "Paniers sauvés",   accent: "#3744C8" },
              { icon: Store,       value: "50+",   label: "Commerçants",      accent: "#5B6EF5" },
              { icon: Heart,       value: "20+",   label: "Associations",     accent: "#7B8FFF" },
              { icon: Sparkles,    value: "95%",   label: "Satisfaction",     accent: "#3744C8" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl p-6 text-center shadow-sm border border-[#e2e5f0]/60 hover:shadow-md transition-all hover:-translate-y-0.5 group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${stat.accent}18` }}
                >
                  <stat.icon
                    className="h-5 w-5 transition-transform group-hover:scale-110"
                    style={{ color: stat.accent }}
                  />
                </div>
                <div
                  className="text-3xl font-bold mb-1 bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${stat.accent}, #5B6EF5)`,
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── PROBLÈME / SOLUTION ─────────────── */}
      <section id="mission" className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Le problème */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#e2e5f0]/60 hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-full border-2 border-red-300 bg-red-50 flex items-center justify-center mb-6">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Le problème</h3>
              <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                30% des produits alimentaires casher finissent à la poubelle chaque année en France.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Invendus perdus pour les commerçants",
                  "Familles dans le besoin sans accès",
                  "Impact environnemental majeur",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Notre solution */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#e2e5f0]/60 hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-full border-2 border-green-300 bg-green-50 flex items-center justify-center mb-6">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Notre solution</h3>
              <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                Kshare connecte tous les acteurs pour transformer le gaspillage en solidarité.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Valorisation des invendus commerçants",
                  "Accès facilité pour les associations",
                  "Prix réduits pour les clients",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── UNE PLATEFORME POUR TOUS ─────────────── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#3744C8] mb-3">Une plateforme pour tous</h2>
            <p className="text-gray-500">Kshare réunit commerçants, associations et clients autour d&apos;un objectif commun</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                gradient: "from-[#3744C8] to-[#5B6EF5]",
                title: "Pour les commerçants",
                desc: "Réduisez le gaspillage et valorisez vos invendus tout en générant du chiffre d'affaires",
                features: ["Réduction des pertes", "CA additionnel", "Image positive"],
                href: "/inscription-commercant",
              },
              {
                icon: Heart,
                gradient: "from-purple-500 to-pink-500",
                title: "Pour les associations",
                desc: "Accédez gratuitement aux paniers dons pour soutenir les personnes dans le besoin",
                features: ["Paniers gratuits", "Distribution facilitée", "Impact social"],
                href: "/inscription-association",
              },
              {
                icon: ShoppingBag,
                gradient: "from-emerald-500 to-teal-600",
                title: "Pour les clients",
                desc: "Achetez des paniers de qualité à prix réduits via l'application mobile",
                features: ["Économies jusqu'à -50%", "Produits casher certifiés", "Acte solidaire"],
                href: "/je-suis-client",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-2xl p-8 shadow-sm border border-[#e2e5f0]/60 flex flex-col group hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center mb-5 shadow-sm`}
                >
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 mb-5 flex-1 leading-relaxed">{card.desc}</p>
                <ul className="space-y-2 mb-6">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit text-gray-700 border-gray-200 hover:border-[#3744C8] hover:text-[#3744C8] transition-colors"
                  asChild
                >
                  <Link href={card.href}>
                    En savoir plus{" "}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── 5 TYPES DE PANIERS ─────────────── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#3744C8] mb-3">5 types de paniers disponibles</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Chaque panier respecte les lois de la cacherout et est certifié par une hashgakha reconnue
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { label: "Bassari",  emoji: "🥩", bg: "from-red-500 to-red-600" },
              { label: "Halavi",   emoji: "🥛", bg: "from-blue-500 to-blue-600" },
              { label: "Parvé",    emoji: "🌿", bg: "from-green-500 to-emerald-600" },
              { label: "Mix",      emoji: "🛒", bg: "from-purple-500 to-purple-700" },
              { label: "Shabbat",  emoji: "✨", bg: "from-amber-400 to-yellow-500" },
            ].map((type) => (
              <div
                key={type.label}
                className={`bg-gradient-to-br ${type.bg} rounded-2xl px-8 py-5 text-white text-center cursor-pointer hover:scale-105 hover:shadow-lg transition-all min-w-[130px] shadow-sm`}
              >
                <div className="text-3xl mb-2">{type.emoji}</div>
                <div className="font-semibold text-sm tracking-wide">{type.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── COMMENT ÇA MARCHE ─────────────── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[#3744C8] mb-3">Comment ça marche ?</h2>
            <p className="text-gray-500">Un processus simple et efficace en 4 étapes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {[
              { step: "1", icon: Store,       title: "Création",     desc: "Le commerçant crée des paniers invendus sur la plateforme" },
              { step: "2", icon: ShoppingBag, title: "Réservation",  desc: "Clients et associations réservent les paniers disponibles" },
              { step: "3", icon: CheckCircle, title: "Retrait",      desc: "Récupération des paniers aux horaires indiqués" },
              { step: "4", icon: Heart,       title: "Distribution", desc: "Les associations distribuent aux bénéficiaires" },
            ].map((item, i) => (
              <div key={item.step} className="relative flex flex-col items-center">
                {/* Step number */}
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold z-10 shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #3744C8, #5B6EF5)",
                  }}
                >
                  {item.step}
                </div>
                {/* Card */}
                <div className="bg-white rounded-2xl p-6 pt-8 text-center shadow-sm border border-[#e2e5f0]/60 w-full mt-4 hover:shadow-md transition-all">
                  <item.icon className="h-8 w-8 text-[#3744C8] mx-auto mb-3" />
                  <div className="font-semibold text-gray-900 mb-2">{item.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
                {/* Arrow between cards */}
                {i < 3 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 z-20">
                    <ArrowRight className="h-5 w-5 text-[#3744C8]/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── APP MOBILE ─────────────── */}
      <section className="py-16" id="clients">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-[#e2e5f0]/60">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="w-12 h-12 bg-[#EEF0F8] rounded-xl flex items-center justify-center mb-6">
                  <Smartphone className="h-6 w-6 text-[#3744C8]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Application mobile pour clients</h2>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Téléchargez l&apos;app Kshare pour commander vos paniers casher à prix réduits en quelques clics
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Économies jusqu'à -50%",
                    "Paiement sécurisé",
                    "Notifications en temps réel",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full text-white h-12 rounded-xl shadow-sm hover:shadow-md transition-all"
                  style={{
                    background: "linear-gradient(135deg, #3744C8 0%, #5B6EF5 100%)",
                  }}
                  asChild
                >
                  <Link href="#">
                    <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Télécharger sur l&apos;App Store
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-gray-200 text-gray-700 h-12 rounded-xl hover:border-[#3744C8] hover:text-[#3744C8] transition-colors"
                  asChild
                >
                  <Link href="#">
                    <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.18 23.76c.35.2.76.23 1.15.08L15.31 12 3.33.16C2.94.01 2.53.04 2.18.24 1.48.64 1 1.38 1 2.23v19.54c0 .85.48 1.59 1.18 1.99zm14.55-12.36l-2.91-2.91-9.4 9.4 12.31-6.49zM17.73.24L5.42 6.73l2.91 2.91 9.4-9.4zM20.82 10.7l-2.95-1.56-3.16 3.16 3.16 3.16 2.95-1.56c.84-.45 1.18-1.28 1.18-2 0-.72-.34-1.55-1.18-2z"/>
                    </svg>
                    Télécharger sur Google Play
                  </Link>
                </Button>
                <div className="text-center pt-1">
                  <Link href="/je-suis-client" className="text-sm text-[#3744C8] hover:underline inline-flex items-center gap-1">
                    En savoir plus sur l&apos;app client <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── CTA BANNER ─────────────── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="relative rounded-3xl p-12 text-center text-white shadow-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #3744C8 0%, #2B38B8 60%, #1E2A9E 100%)",
            }}
          >
            {/* Decorative orbs */}
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/5" />

            <div className="relative">
              <Heart className="h-10 w-10 mx-auto mb-6 opacity-80" />
              <h2 className="text-3xl font-bold mb-3">Rejoignez Kshare dès aujourd&apos;hui</h2>
              <p className="text-white/70 mb-8 text-base">Ensemble, construisons une communauté solidaire et responsable</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white hover:text-[#3744C8] bg-transparent h-11 transition-all"
                  asChild
                >
                  <Link href="/inscription-commercant">
                    <Store className="mr-2 h-4 w-4" /> Je suis commerçant
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white hover:text-[#3744C8] bg-transparent h-11 transition-all"
                  asChild
                >
                  <Link href="/inscription-association">
                    <Heart className="mr-2 h-4 w-4" /> Je suis association
                  </Link>
                </Button>
                <Button size="lg" variant="link" className="text-white/80 hover:text-white h-11" asChild>
                  <Link href="/notre-mission">
                    Découvrir notre mission <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── FOOTER ─────────────── */}
      <footer className="bg-[#0F1B40] text-white pt-14 pb-8 mt-4" id="contact">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            {/* Col 1: Logo + tagline */}
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

            {/* Col 2: Navigation */}
            <div>
              <h4 className="font-semibold mb-5 text-sm tracking-wide uppercase text-blue-100">Navigation</h4>
              <ul className="space-y-2.5 text-sm text-blue-200">
                {[
                  { label: "Accueil", href: "/" },
                  { label: "Notre mission", href: "/notre-mission" },
                  { label: "Je suis client", href: "/je-suis-client" },
                  { label: "Contact", href: "/contact" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Espaces */}
            <div>
              <h4 className="font-semibold mb-5 text-sm tracking-wide uppercase text-blue-100">Espaces</h4>
              <ul className="space-y-2.5 text-sm text-blue-200">
                <li>
                  <Link href="/connexion?role=commerce" className="flex items-center gap-2 hover:text-white transition-colors">
                    <Store className="h-3.5 w-3.5" /> Espace Commerçant
                  </Link>
                </li>
                <li>
                  <Link href="/connexion?role=association" className="flex items-center gap-2 hover:text-white transition-colors">
                    <Users className="h-3.5 w-3.5" /> Espace Association
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: App mobile */}
            <div>
              <h4 className="font-semibold mb-5 text-sm tracking-wide uppercase text-blue-100">Application mobile</h4>
              <p className="text-sm text-blue-200 mb-4">Téléchargez l&apos;app pour commander vos paniers</p>
              <div className="space-y-2">
                <Button size="sm" variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent justify-start" asChild>
                  <Link href="#">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    App Store
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent justify-start" asChild>
                  <Link href="#">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.18 23.76c.35.2.76.23 1.15.08L15.31 12 3.33.16C2.94.01 2.53.04 2.18.24 1.48.64 1 1.38 1 2.23v19.54c0 .85.48 1.59 1.18 1.99zm14.55-12.36l-2.91-2.91-9.4 9.4 12.31-6.49zM17.73.24L5.42 6.73l2.91 2.91 9.4-9.4zM20.82 10.7l-2.95-1.56-3.16 3.16 3.16 3.16 2.95-1.56c.84-.45 1.18-1.28 1.18-2 0-.72-.34-1.55-1.18-2z"/>
                    </svg>
                    Google Play
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-blue-200 gap-3">
            <span>© 2025 Kshare. Tous droits réservés.</span>
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
