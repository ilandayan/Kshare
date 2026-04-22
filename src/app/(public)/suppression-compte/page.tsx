import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { SharedFooter } from "@/components/shared/footer";
import {
  Trash2,
  Smartphone,
  Mail,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Suppression de compte",
  description:
    "Comment supprimer votre compte Kshare et vos données personnelles.",
  openGraph: {
    title: "Suppression de compte | Kshare",
    description:
      "Comment supprimer votre compte Kshare et vos données personnelles.",
    url: "https://k-share.fr/suppression-compte",
  },
};

export default function SuppressionComptePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative min-h-dvh flex items-center py-20 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-60 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,#c8cef5_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#9ba8d8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.15]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-8 shadow-sm">
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
            Suppression de compte
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#3744C8] leading-tight mb-6">
            Supprimer votre compte Kshare
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Vous pouvez supprimer votre compte et toutes vos données personnelles à tout moment. Cette action est irréversible.
          </p>
        </div>
      </section>

      {/* ─────────────── MÉTHODE 1 — DEPUIS L'APP ─────────────── */}
      <section className="min-h-dvh flex items-center py-20 bg-gradient-to-b from-[#E8ECF8] to-[#F4F5FB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Option 1 — Depuis l&apos;application mobile
            </h2>
            <p className="text-gray-500">Le moyen le plus rapide de supprimer votre compte</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e2e5f0]/60 p-8 md:p-10 card-elevated">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] rounded-2xl flex items-center justify-center shadow-sm">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-gray-900">Étapes à suivre dans l&apos;app Kshare</h3>
            </div>

            <ol className="space-y-4">
              {[
                "Ouvrez l'application Kshare sur votre téléphone",
                "Connectez-vous à votre compte",
                "Allez dans l'onglet \"Profil\" (en bas à droite)",
                "Faites défiler jusqu'en bas de la page",
                "Appuyez sur le bouton rouge \"Supprimer mon compte\"",
                "Confirmez la suppression dans la fenêtre qui s'affiche",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] text-white flex items-center justify-center text-sm font-display font-bold shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-gray-700 leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ─────────────── MÉTHODE 2 — PAR EMAIL ─────────────── */}
      <section className="min-h-dvh flex items-center py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Option 2 — Par email
            </h2>
            <p className="text-gray-500">Si vous n&apos;avez plus accès à l&apos;application</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e2e5f0]/60 p-8 md:p-10 card-elevated">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-sm">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-gray-900">Envoyez-nous une demande</h3>
            </div>

            <p className="text-gray-600 leading-relaxed mb-6">
              Envoyez un email à{" "}
              <a href="mailto:contact@k-share.fr" className="text-[#3744C8] font-semibold underline">
                contact@k-share.fr
              </a>{" "}
              avec comme objet « Suppression de compte » et précisez :
            </p>

            <ul className="space-y-3 mb-6">
              {[
                "L'adresse email associée à votre compte Kshare",
                "Votre nom et prénom",
                "La raison de la suppression (optionnel)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-[#3744C8] shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            <p className="text-sm text-gray-500 leading-relaxed">
              Notre équipe traitera votre demande sous 7 jours ouvrés et vous enverra une confirmation par email.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────── DONNÉES SUPPRIMÉES ─────────────── */}
      <section className="min-h-dvh flex items-center py-20 bg-gradient-to-b from-[#E8ECF8] to-[#F4F5FB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] mb-3">
              Données supprimées
            </h2>
            <p className="text-gray-500">Ce qui est effacé lors de la suppression de votre compte</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#e2e5f0]/60 p-7 card-elevated">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full mb-5" />
              <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Supprimé immédiatement</h3>
              <ul className="space-y-2.5">
                {[
                  "Profil utilisateur (nom, email, téléphone)",
                  "Adresse et préférences",
                  "Favoris",
                  "Token de notifications push",
                  "Identifiants de connexion",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-[#e2e5f0]/60 p-7 card-elevated">
              <div className="h-1 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mb-5" />
              <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Conservé légalement</h3>
              <ul className="space-y-2.5">
                {[
                  "Factures et historique des commandes (10 ans, obligation fiscale française)",
                  "Données anonymisées pour statistiques internes",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                Conformément à la réglementation française, certaines données financières sont conservées pour une durée légale minimale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── CTA ─────────────── */}
      <section className="min-h-dvh flex items-center py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl p-12 text-center text-white shadow-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #3744C8 0%, #1E2A9E 100%)" }}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold mb-3">Besoin d&apos;aide ?</h2>
              <p className="text-white/70 mb-8">
                Notre équipe est disponible pour toute question sur la suppression de votre compte
              </p>
              <Button
                size="lg"
                className="bg-white text-[#3744C8] hover:bg-white/90 h-11 font-display font-semibold cursor-pointer border-0"
                asChild
              >
                <Link href="/contact">
                  Nous contacter
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SharedFooter variant="full" />
    </div>
  );
}
