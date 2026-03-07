import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/shared/public-navbar";
import {
  Sparkles,
  TrendingDown,
  CheckCircle,
  Store,
  Users,
  Heart,
  Leaf,
  Clock,
  ShieldCheck,
  Unlock,
  ShoppingBasket,
} from "lucide-react";

export default function NotreMissionPage() {
  return (
    <div className="min-h-screen bg-[#EEF0F8]">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="py-24 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-white border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-8 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#3744C8]" />
            Notre mission
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#3744C8] leading-tight mb-6">
            Une plateforme solidaire au service<br />de la communauté
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            Kshare connecte commerçants, associations et donateurs pour sauver des paniers casher
            et lutter contre le gaspillage alimentaire
          </p>
        </div>
      </section>

      {/* ─────────────── PROBLÈME / SOLUTION ─────────────── */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Le problème */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#e2e5f0]/60">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Le problème</h3>
              <p className="text-gray-500 leading-relaxed">
                De nombreux commerces casher font face à des invendus quotidiens.
                Parallèlement, des associations peinent à accéder à des produits de qualité
                pour leurs bénéficiaires.
              </p>
            </div>

            {/* Notre solution */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#e2e5f0]/60">
              <div className="w-12 h-12 bg-[#3744C8] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Notre solution</h3>
              <p className="text-gray-500 leading-relaxed">
                Kshare crée un pont entre ces acteurs : les commerçants valorisent leurs invendus,
                les associations accèdent à des produits casher certifiés, et la communauté peut
                soutenir cette action via des dons.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── COMMENT ÇA FONCTIONNE ─────────────── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[#3744C8] mb-3">Comment ça fonctionne ?</h2>
            <p className="text-gray-500">Un processus simple et efficace</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Création de paniers",  desc: "Les commerçants créent des paniers d'invendus à prix réduit" },
              { step: "2", title: "Publication",          desc: "Les paniers sont publiés sur la plateforme avec certification hashgakha" },
              { step: "3", title: "Réservation",          desc: "Les associations réservent les paniers selon leurs besoins" },
              { step: "4", title: "Distribution",         desc: "Récupération et distribution aux bénéficiaires" },
            ].map((item, i) => (
              <div key={item.step} className="relative flex flex-col items-center">
                {/* Step bubble */}
                <div className="w-10 h-10 rounded-full bg-[#3744C8] text-white flex items-center justify-center text-sm font-bold mb-5 shadow-sm z-10">
                  {item.step}
                </div>
                {/* Dash connector */}
                {i < 3 && (
                  <div className="hidden md:block absolute top-5 left-[calc(50%+20px)] right-0 h-px border-t-2 border-dashed border-[#3744C8]/30" />
                )}
                {/* Card */}
                <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-[#e2e5f0]/60 w-full">
                  <div className="font-semibold text-gray-900 mb-2">{item.title}</div>
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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#3744C8] mb-3">Types de paniers</h2>
            <p className="text-gray-500">Une offre adaptée à tous les besoins</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Bassari",  emoji: "🥩", desc: "Viande et produits carnés",    border: "border-red-400" },
              { label: "Halavi",   emoji: "🥛", desc: "Produits laitiers",             border: "border-blue-400" },
              { label: "Parvé",    emoji: "🌿", desc: "Neutre (ni viande, ni lait)",   border: "border-green-500" },
              { label: "Mix",      emoji: "🛒", desc: "Assortiment varié",             border: "border-purple-400" },
              { label: "Shabbat",  emoji: "✨", desc: "Spécial Shabbat",              border: "border-yellow-400" },
            ].map((type) => (
              <div
                key={type.label}
                className={`bg-white rounded-2xl p-5 text-center shadow-sm border-t-0 border-r-0 border-l-0 border-b-4 ${type.border} hover:shadow-md transition-shadow`}
                style={{ borderStyle: "solid" }}
              >
                <div className="text-4xl mb-3">{type.emoji}</div>
                <div className="font-semibold text-gray-900 text-sm mb-1">{type.label}</div>
                <div className="text-xs text-gray-500 leading-snug">{type.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── LES AVANTAGES ─────────────── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#3744C8] mb-3">Les avantages pour chacun</h2>
            <p className="text-gray-500">Un impact positif pour tous les acteurs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                gradient: "from-blue-500 to-indigo-600",
                title: "Pour les commerçants",
                desc: "Réduisez le gaspillage, valorisez vos invendus et touchez de nouveaux clients",
              },
              {
                icon: Users,
                gradient: "from-purple-500 to-pink-500",
                title: "Pour les associations",
                desc: "Accédez à des produits casher de qualité pour vos bénéficiaires",
              },
              {
                icon: Heart,
                gradient: "from-red-400 to-orange-500",
                title: "Pour la communauté",
                desc: "Participez à une action solidaire et éthique avec des dons (mitzvot)",
              },
            ].map((card) => (
              <div key={card.title} className="bg-white rounded-2xl p-8 shadow-sm border border-[#e2e5f0]/60">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-5 shadow-sm`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── PHOTO + FEATURES ─────────────── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Photo */}
            <div className="relative rounded-2xl overflow-hidden shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80"
                alt="Produits casher frais"
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <div className="flex items-center gap-2.5 text-white">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Certification Hashgakha</div>
                    <div className="text-xs text-white/80 mt-0.5">
                      Tous les produits sont certifiés casher avec traçabilité complète
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature list */}
            <div className="space-y-4">
              {[
                {
                  icon: Leaf,
                  bg: "bg-green-500",
                  title: "Impact environnemental",
                  desc: "Réduction du gaspillage alimentaire et valorisation des invendus pour un avenir plus durable",
                },
                {
                  icon: Heart,
                  bg: "bg-purple-500",
                  title: "Système de Mitzvot",
                  desc: "Permettez à la communauté de participer par des dons et de soutenir l'action solidaire",
                },
                {
                  icon: Clock,
                  bg: "bg-blue-500",
                  title: "Temps réel",
                  desc: "Plateforme moderne avec suivi en temps réel et notifications instantanées",
                },
                {
                  icon: Unlock,
                  bg: "bg-orange-500",
                  title: "Transparence totale",
                  desc: "Tableaux de bord détaillés et reporting complet pour tous les utilisateurs",
                },
              ].map((feature) => (
                <div key={feature.title} className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e5f0]/60 flex items-start gap-4">
                  <div className={`w-10 h-10 ${feature.bg} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm mb-1">{feature.title}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── CTA BANNER ─────────────── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-3xl p-12 text-center text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #3744C8 0%, #2B38B8 100%)" }}
          >
            <ShoppingBasket className="h-10 w-10 mx-auto mb-6 opacity-70" />
            <h2 className="text-3xl font-bold mb-3">Rejoignez Kshare dès aujourd&apos;hui</h2>
            <p className="text-white/70 mb-8">Ensemble, construisons une communauté solidaire et responsable</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="outline"
                className="border-white/50 text-white hover:bg-white hover:text-[#3744C8] bg-transparent h-11"
                asChild
              >
                <Link href="/inscription-commercant">Espace Commerçant</Link>
              </Button>
              <Button
                size="lg"
                className="bg-white text-[#3744C8] hover:bg-white/90 h-11 font-semibold"
                asChild
              >
                <Link href="/inscription-association">Espace Association</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── FOOTER ─────────────── */}
      <footer className="bg-[#0F1B40] text-white pt-14 pb-8">
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
