import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { SharedFooter } from "@/components/shared/footer";
import {
  ShoppingBag,
  ShoppingCart,
  Heart,
  Store,
  ArrowRight,
  CheckCircle,
  Smartphone,
  Users,
  Sparkles,
  AlertCircle,
  TrendingDown,
  Leaf,
  UtensilsCrossed,
  Milk,
  Wine,
  Layers,
  MapPin,
  Bell,
  Search,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#EEF0F8]">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative pt-10 pb-24 md:pt-16 md:pb-40 text-center overflow-hidden">
        {/* Layered glow radials */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-70 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,#c8cef5_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] opacity-30 bg-[radial-gradient(ellipse_50%_40%_at_30%_20%,#a5b4fc_0%,transparent_60%)]" />
        {/* Dot-grid overlay */}
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#9ba8d8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.18]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="anim-hidden animate-fade-in-up inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-8 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#3744C8]" />
            Communauté · Solidarité · Responsabilité
          </div>

          <h1 className="anim-hidden animate-fade-in-up delay-100 font-display text-4xl md:text-5xl lg:text-[3.6rem] font-bold leading-[1.12] mb-6 tracking-tight">
            <span className="bg-gradient-to-br from-[#3744C8] via-[#4B5BE2] to-[#7B8FFF] bg-clip-text text-transparent">
              Kshare – La solution solidaire
            </span>
            <br />
            <span className="text-gray-800">pour sauver des paniers casher</span>
          </h1>

          <p className="anim-hidden animate-fade-in-up delay-200 text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Rejoignez une communauté engagée dans la lutte contre le gaspillage alimentaire.
            Connectez commerçants, clients et associations pour donner une seconde vie aux paniers invendus.
          </p>

          <div className="anim-hidden animate-fade-in-up delay-300 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] text-white px-8 h-12 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all border-0 font-display font-semibold cursor-pointer"
              asChild
            >
              <Link href="/inscription-commercant">Inscrire mon commerce</Link>
            </Button>
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 h-12 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all border-0 font-display font-semibold cursor-pointer"
              asChild
            >
              <Link href="/inscription-association">Inscrire mon association</Link>
            </Button>
          </div>

          {/* Floating basket type chips */}
          <div className="anim-hidden animate-fade-in-up delay-500 mt-14 text-center">
            <h3 className="font-display text-xl font-bold text-[#3744C8] mb-1">Types de paniers</h3>
            <p className="text-gray-400 text-sm mb-4">Une offre adaptée à tous les besoins</p>
          </div>
          <div className="anim-hidden animate-fade-in-up delay-500 flex flex-wrap justify-center gap-2.5">
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

      {/* ─────────────── STATS ─────────────── */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShoppingBag, value: "1000+", label: "Paniers sauvés",  delay: "delay-100" },
              { icon: Store,       value: "50+",   label: "Commerçants",     delay: "delay-200" },
              { icon: Heart,       value: "20+",   label: "Associations",    delay: "delay-300" },
              { icon: Sparkles,    value: "95%",   label: "Satisfaction",    delay: "delay-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`anim-hidden animate-scale-in ${stat.delay} bg-white rounded-2xl p-6 text-center card-elevated border border-[#e2e5f0]/60 group`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#3744C8]/10 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="h-5 w-5 text-[#3744C8] transition-transform group-hover:scale-110" />
                </div>
                <div className="font-display text-3xl font-bold mb-1 bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] bg-clip-text text-transparent">
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
          {/* Section divider */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#e2e5f0]" />
            <span className="text-xs font-semibold tracking-widest uppercase text-gray-400">
              Le défi que nous relevons
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#e2e5f0]" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Le problème */}
            <div className="anim-hidden animate-fade-in-up delay-100 bg-white rounded-2xl border border-[#e2e5f0]/60 card-elevated overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-orange-400 to-red-500" />
              <div className="p-8">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-6">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-3">Le problème</h3>
                <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                  Énormément de produits alimentaires casher finissent à la poubelle chaque année en France.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Invendus perdus pour les commerçants",
                    "Familles dans le besoin sans accès",
                    "Manger casher devient un luxe",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <span className="shrink-0 text-xs leading-none">❌</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Notre solution */}
            <div className="anim-hidden animate-fade-in-up delay-200 bg-white rounded-2xl border border-[#e2e5f0]/60 card-elevated overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <div className="p-8">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-3">Notre solution</h3>
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
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── UNE PLATEFORME POUR TOUS ─────────────── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Une plateforme pour tous
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Kshare réunit commerçants, associations et clients autour d&apos;un objectif commun
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                iconClass: "bg-gradient-to-br from-[#3744C8] to-[#5B6EF5]",
                topBar: "from-blue-400 to-indigo-500",
                title: "Pour les commerçants",
                desc: "Réduisez le gaspillage et valorisez vos invendus tout en générant du chiffre d'affaires",
                features: ["Réduction des pertes", "CA additionnel", "Image positive"],
                href: "/inscription-commercant",
                delay: "delay-100",
              },
              {
                icon: Heart,
                iconClass: "bg-gradient-to-br from-purple-500 to-pink-500",
                topBar: "from-purple-400 to-pink-500",
                title: "Pour les associations",
                desc: "Accédez gratuitement aux paniers dons pour soutenir les personnes dans le besoin",
                features: ["Paniers gratuits", "Distribution facilitée", "Impact social"],
                href: "/inscription-association",
                delay: "delay-200",
              },
              {
                icon: ShoppingCart,
                iconClass: "bg-gradient-to-br from-emerald-500 to-teal-600",
                topBar: "from-emerald-400 to-teal-500",
                title: "Pour les clients",
                desc: "Achetez des paniers de qualité à prix réduits via l'application mobile",
                features: ["Économies jusqu'à -70%", "Produits casher certifiés", "Acte solidaire"],
                href: "/je-suis-client",
                delay: "delay-300",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`anim-hidden animate-fade-in-up ${card.delay} bg-white rounded-2xl border border-[#e2e5f0]/60 flex flex-col group card-elevated overflow-hidden cursor-pointer`}
              >
                <div className={`h-1 bg-gradient-to-r ${card.topBar}`} />
                <div className="p-8 flex flex-col flex-1">
                  <div className={`w-12 h-12 ${card.iconClass} rounded-xl flex items-center justify-center mb-5 shadow-sm`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
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
                    size="sm"
                    className={`w-fit transition-colors cursor-pointer border-0 ${
                      card.title === "Pour les commerçants"
                        ? "bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] text-white hover:from-[#2E3AB0] hover:to-[#4B5BE2]"
                        : card.title === "Pour les associations"
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
                    }`}
                    asChild
                  >
                    <Link href={card.href}>
                      En savoir plus{" "}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── COMMENT ÇA MARCHE ─────────────── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Comment ça marche ?
            </h2>
            <p className="text-gray-500">Un processus simple et efficace en 4 étapes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {[
              { step: "1", icon: Store,       title: "Création",     desc: "Le commerçant crée des paniers invendus sur la plateforme",      delay: "delay-100" },
              { step: "2", icon: ShoppingBag, title: "Réservation",  desc: "Clients et associations réservent les paniers disponibles",      delay: "delay-200" },
              { step: "3", icon: CheckCircle, title: "Retrait",      desc: "Récupération des paniers aux horaires indiqués avec QR code",    delay: "delay-300" },
              { step: "4", icon: Heart,       title: "Distribution", desc: "Les associations distribuent aux bénéficiaires de la communauté", delay: "delay-400" },
            ].map((item, i) => (
              <div key={item.step} className={`anim-hidden animate-fade-in-up ${item.delay} relative flex flex-col items-center`}>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] text-white flex items-center justify-center text-sm font-display font-bold z-10 shadow-sm">
                  {item.step}
                </div>
                <div className="bg-white rounded-2xl p-6 pt-8 text-center border border-[#e2e5f0]/60 w-full mt-4 card-elevated">
                  <item.icon className="h-8 w-8 text-[#3744C8] mx-auto mb-3" />
                  <div className="font-display font-semibold text-gray-900 mb-2">{item.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
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
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e2e5f0]/60">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Left — Content */}
              <div className="p-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-[#EEF0F8] rounded-full px-3 py-1.5 text-xs font-semibold text-[#3744C8] mb-5 w-fit">
                  <Smartphone className="h-3.5 w-3.5" />
                  Application mobile
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                  Vos paniers casher,<br />dans votre poche
                </h2>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Téléchargez l&apos;app Kshare pour commander vos paniers casher à prix réduits en quelques clics. Géolocalisé, rapide, avec paiement sécurisé.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    { icon: TrendingDown, label: "Économies jusqu'à -70%",     color: "text-emerald-600", bg: "bg-emerald-50" },
                    { icon: Leaf,         label: "Produits casher certifiés",   color: "text-blue-600",    bg: "bg-blue-50" },
                    { icon: Heart,        label: "Notifications en temps réel", color: "text-purple-600",  bg: "bg-purple-50" },
                  ].map((f) => (
                    <li key={f.label} className="flex items-center gap-3 text-sm text-gray-700">
                      <div className={`w-7 h-7 rounded-lg ${f.bg} flex items-center justify-center shrink-0`}>
                        <f.icon className={`h-3.5 w-3.5 ${f.color}`} />
                      </div>
                      {f.label}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Link
                    href="#"
                    className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
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
                    className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
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
                <div className="pt-4">
                  <Link href="/je-suis-client" className="text-sm text-[#3744C8] hover:underline inline-flex items-center gap-1">
                    En savoir plus sur l&apos;app client <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right — Visual mockup */}
              <div className="relative bg-gradient-to-br from-[#3744C8] to-[#1E2A9E] flex items-center justify-center p-10 min-h-[340px]">
                {/* Background blobs */}
                <div className="absolute top-6 right-6 w-32 h-32 rounded-full bg-white/5" />
                <div className="absolute bottom-6 left-6 w-24 h-24 rounded-full bg-white/5" />
                {/* Phone frame */}
                <div className="relative w-44 animate-float">
                  <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl shadow-black/40">
                    <div className="bg-[#F8F9FC] rounded-[2rem] overflow-hidden h-80 relative">
                      {/* Status bar */}
                      <div className="bg-white px-5 pt-3 pb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-800">9:41</span>
                        <div className="flex gap-1">
                          <div className="w-4 h-1.5 bg-gray-800 rounded-full" />
                          <div className="w-2 h-1.5 bg-gray-300 rounded-full" />
                        </div>
                      </div>
                      {/* Mock header */}
                      <div className="bg-white px-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-0.5 text-xs font-bold text-gray-800">
                          <MapPin className="h-2.5 w-2.5 text-[#3744C8]" />
                          Paris
                        </div>
                        <div className="text-[10px] text-gray-500">Paniers disponibles</div>
                      </div>
                      {/* Mock cards */}
                      {[
                        { icon: UtensilsCrossed, name: "Boucherie Cohen",  price: "5,90€", orig: "18€", type: "Bassari", color: "#FEF2F2", badge: "#EF4444", iconColor: "#EF4444" },
                        { icon: Milk,            name: "Boulangerie Levi",  price: "4,50€", orig: "14€", type: "Halavi",  color: "#EFF6FF", badge: "#3B82F6", iconColor: "#3B82F6" },
                        { icon: Leaf,            name: "Bio Casher Store", price: "3,90€", orig: "12€", type: "Parvé",   color: "#F0FDF4", badge: "#10B981", iconColor: "#10B981" },
                      ].map((card) => (
                        <div key={card.name} className="bg-white mx-3 my-1.5 rounded-xl overflow-hidden border border-gray-100">
                          <div className="flex items-center gap-2 p-2.5">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: card.color }}>
                              <card.icon className="h-4 w-4" style={{ color: card.iconColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-gray-800 truncate">{card.name}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: card.badge }}>{card.type}</span>
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
                  {/* Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-700 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── CTA BANNER ─────────────── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl p-12 text-center text-white shadow-xl overflow-hidden bg-gradient-to-br from-[#3744C8] via-[#2B38B8] to-[#1E2A9E]">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/5" />
            <div className="relative">
              <Heart className="h-10 w-10 mx-auto mb-6 opacity-80" />
              <h2 className="font-display text-3xl font-bold mb-3">
                Rejoignez Kshare dès aujourd&apos;hui
              </h2>
              <p className="text-white/70 mb-8 text-base max-w-md mx-auto">
                Ensemble, construisons une communauté solidaire et responsable
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                <Button
                  size="lg"
                  className="bg-white text-[#3744C8] hover:bg-white/90 h-11 transition-all font-display font-semibold cursor-pointer border-0"
                  asChild
                >
                  <Link href="/inscription-commercant">
                    <Store className="mr-2 h-4 w-4" /> Je suis commerçant
                  </Link>
                </Button>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-400 to-pink-400 text-white hover:from-purple-500 hover:to-pink-500 h-11 transition-all font-display font-semibold cursor-pointer border-0"
                  asChild
                >
                  <Link href="/inscription-association">
                    <Heart className="mr-2 h-4 w-4" /> Je suis une association
                  </Link>
                </Button>
                <Button size="lg" variant="link" className="text-white/80 hover:text-white h-11 cursor-pointer" asChild>
                  <Link href="/notre-mission">
                    Découvrir notre mission <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SharedFooter variant="full" />
    </div>
  );
}
