import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { SharedFooter } from "@/components/shared/footer";
import Simulator from "./_simulator";
import {
  Store,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  Heart,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Mail,
  UserPlus,
  Wallet,
  ShieldCheck,
  MapPin,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Je suis commerçant",
  description:
    "Transformez vos invendus casher en revenus avec Kshare. Démarrage gratuit, commission réduite, accompagnement dédié.",
  openGraph: {
    title: "Je suis commerçant | Kshare",
    description:
      "Transformez vos invendus casher en revenus avec Kshare.",
    url: "https://k-share.fr/je-suis-commercant",
  },
};

export default function JeSuisCommercantPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative pt-10 pb-24 md:pt-16 md:pb-40 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-70 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,#c8cef5_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#9ba8d8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.18]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="anim-hidden animate-fade-in-up inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-8 shadow-sm">
            <Store className="h-3.5 w-3.5 text-[#3744C8]" />
            Espace commerçants
          </div>
          <h1 className="anim-hidden animate-fade-in-up delay-100 font-display text-4xl md:text-5xl lg:text-[3.2rem] font-bold leading-[1.15] mb-6 tracking-tight">
            <span className="bg-gradient-to-br from-[#3744C8] via-[#4B5BE2] to-[#7B8FFF] bg-clip-text text-transparent">
              Transformez vos invendus
            </span>
            <br />
            <span className="text-gray-800">en chiffre d&apos;affaires</span>
          </h1>
          <p className="anim-hidden animate-fade-in-up delay-200 text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Rejoignez la communauté des commerces casher partenaires de Kshare. Valorisez vos invendus quotidiens, touchez une nouvelle clientèle et participez à la lutte contre le gaspillage alimentaire.
          </p>

          <div className="anim-hidden animate-fade-in-up delay-300 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-[#3744C8] text-[#3744C8] hover:bg-[#3744C8]/5 px-8 h-12 rounded-xl font-display font-semibold cursor-pointer"
              asChild
            >
              <Link href="/je-suis-commercant/demande-infos">
                <Mail className="mr-2 h-4 w-4" />
                Recevoir plus d&apos;infos
              </Link>
            </Button>
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] text-white px-8 h-12 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all border-0 font-display font-semibold cursor-pointer"
              asChild
            >
              <Link href="/inscription-commercant">
                <UserPlus className="mr-2 h-4 w-4" />
                Je m&apos;inscris maintenant
              </Link>
            </Button>
          </div>

          <p className="anim-hidden animate-fade-in-up delay-400 text-xs text-gray-400 mt-6">
            Aucun engagement · Inscription en 5 minutes · Accompagnement personnalisé
          </p>
        </div>
      </section>

      {/* ─────────────── AVANTAGES ─────────────── */}
      <section className="relative py-24 md:py-40 overflow-hidden" style={{ background: "linear-gradient(135deg, #3744C8 0%, #2B38B8 50%, #1E2A9E 100%)" }}>
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
              Pourquoi rejoindre Kshare ?
            </h2>
            <p className="text-white/60 max-w-lg mx-auto">
              Une solution pensée pour les commerces casher, du boucher au traiteur
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Wallet,
                title: "Revenus additionnels",
                desc: "Vos invendus deviennent du CA. Chaque panier vendu est un revenu que vous n'auriez pas eu.",
              },
              {
                icon: Users,
                title: "Nouveaux clients",
                desc: "Visible sur l'app Kshare, votre commerce attire des clients qui ne vous connaissaient pas.",
              },
              {
                icon: Zap,
                title: "Simple et rapide",
                desc: "Publiez un panier en quelques secondes. Les clients réservent et paient en ligne.",
              },
              {
                icon: BarChart3,
                title: "Suivi en temps réel",
                desc: "Tableau de bord avec ventes, taux de réservation, statistiques détaillées.",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`anim-hidden animate-fade-in-up delay-${(i + 1) * 100} bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/15`}
              >
                <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-display font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── SIMULATEUR ─────────────── */}
      <section className="relative py-24 md:py-40 bg-white overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] opacity-50 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,#c8cef5_0%,transparent_70%)]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#EEF0F8] rounded-full px-3 py-1.5 text-xs font-semibold text-[#3744C8] mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Simulateur
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Combien pouvez-vous gagner ?
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Estimez vos revenus mensuels avec Kshare selon votre volume de paniers
            </p>
          </div>

          <Simulator />
        </div>
      </section>

      {/* ─────────────── COMMENT ÇA MARCHE ─────────────── */}
      <section className="relative py-24 md:py-40 overflow-hidden" style={{ background: "linear-gradient(135deg, #3744C8 0%, #2B38B8 50%, #1E2A9E 100%)" }}>
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
              Comment ça marche ?
            </h2>
            <p className="text-white/60">5 étapes pour démarrer avec Kshare</p>
          </div>

          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Inscrivez-vous gratuitement",
                desc: "Créez votre compte commerçant en 5 minutes sur k-share.fr. Notre équipe valide votre dossier sous 48h.",
              },
              {
                step: "2",
                title: "Publiez vos paniers",
                desc: "Choisissez le type (Bassari, Halavi, Parvé, Shabbat, Mix), le prix, le créneau de retrait. En quelques clics.",
              },
              {
                step: "3",
                title: "Les clients réservent",
                desc: "Ils paient en ligne. Vous êtes notifié immédiatement. Aucune manipulation de paiement pour vous.",
              },
              {
                step: "4",
                title: "Retrait en magasin",
                desc: "Le client vient avec son QR code. Vous préparez le panier. Validation par glissement dans l'app.",
              },
              {
                step: "5",
                title: "Vous êtes payé",
                desc: "Reversement automatique sur votre compte bancaire chaque mardi via Stripe Connect.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/15 flex items-start gap-5"
              >
                <div className="w-11 h-11 rounded-full bg-white text-[#3744C8] flex items-center justify-center text-base font-display font-bold shadow-md shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-lg mb-1">{item.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── ENGAGEMENT SOLIDAIRE ─────────────── */}
      <section className="relative py-24 md:py-40 bg-white overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] opacity-50 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,#c8cef5_0%,transparent_70%)]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-200/60 p-8 md:p-12 card-elevated">
            <div className="flex items-start gap-5 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                <Heart className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-emerald-800 mb-2">
                  Un engagement solidaire
                </h2>
                <p className="text-emerald-700 leading-relaxed">
                  Au-delà de la vente, Kshare vous permet de <strong>donner vos invendus</strong> à des associations partenaires directement depuis votre espace commerce.
                </p>
              </div>
            </div>
            <p className="text-sm text-emerald-700/80 leading-relaxed ml-0 md:ml-[76px]">
              Un geste de <strong>tsedaka</strong> concret et simplifié : en quelques clics, vos produits invendus trouvent une seconde vie auprès de ceux qui en ont le plus besoin. Une <strong>mitzvah</strong> au quotidien, facilitée par la technologie.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────── CTA FINAL ─────────────── */}
      <section className="relative py-24 md:py-40 bg-white overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] opacity-40 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,#c8cef5_0%,transparent_70%)]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl p-10 md:p-12 text-center text-white shadow-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #3744C8 0%, #1E2A9E 100%)" }}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
            <div className="relative">
              <Store className="h-10 w-10 mx-auto mb-5 opacity-80" />
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
                Prêt à rejoindre Kshare ?
              </h2>
              <p className="text-white/70 mb-8 max-w-md mx-auto text-sm md:text-base">
                Notre équipe est disponible pour répondre à toutes vos questions et vous accompagner dans votre inscription.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/60 bg-transparent text-white hover:bg-white/10 h-11 font-display font-semibold cursor-pointer"
                  asChild
                >
                  <Link href="/je-suis-commercant/demande-infos">
                    <Mail className="mr-2 h-4 w-4" />
                    Recevoir plus d&apos;infos
                  </Link>
                </Button>
                <Button
                  size="lg"
                  className="bg-white text-[#3744C8] hover:bg-white/90 h-11 font-display font-semibold cursor-pointer border-0"
                  asChild
                >
                  <Link href="/inscription-commercant">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Je m&apos;inscris maintenant
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
