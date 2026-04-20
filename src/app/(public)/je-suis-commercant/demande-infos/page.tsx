import type { Metadata } from "next";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { SharedFooter } from "@/components/shared/footer";
import ProspectForm from "./_form";
import { Mail, Clock, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Recevoir les informations",
  description:
    "Recevez par email toutes les informations nécessaires pour rejoindre Kshare en tant que commerçant partenaire.",
  openGraph: {
    title: "Recevoir les infos | Kshare",
    url: "https://k-share.fr/je-suis-commercant/demande-infos",
  },
};

export default function DemandeInfosPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <section className="relative pt-10 pb-24 md:pt-16 md:pb-40 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-60 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,#c8cef5_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#9ba8d8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.15]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-6 shadow-sm">
              <Mail className="h-3.5 w-3.5 text-[#3744C8]" />
              Recevoir les informations
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-[#3744C8] leading-tight mb-4">
              Découvrez Kshare à votre rythme
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
              Laissez-nous vos coordonnées et recevez par email toutes les informations pour rejoindre Kshare en tant que commerçant partenaire. Aucun engagement, aucun appel surprise.
            </p>
          </div>

          {/* Avantages courts */}
          <div className="grid md:grid-cols-3 gap-3 mb-10">
            {[
              { icon: Clock, title: "Sous 5 minutes", desc: "Email envoyé instantanément" },
              { icon: ShieldCheck, title: "Aucun engagement", desc: "Juste les infos, c'est tout" },
              { icon: Mail, title: "Informations complètes", desc: "Offres, fonctionnement, tarifs" },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-[#e2e5f0]/60 p-4 flex items-center gap-3 card-elevated">
                <div className="w-10 h-10 bg-[#EEF0F8] rounded-lg flex items-center justify-center shrink-0">
                  <f.icon className="h-4.5 w-4.5 text-[#3744C8]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{f.title}</div>
                  <div className="text-xs text-gray-500">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Formulaire */}
          <ProspectForm />

          <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
            En envoyant ce formulaire, vous acceptez que Kshare vous contacte par email.
            <br />
            Vos données sont protégées conformément au RGPD.
          </p>
        </div>
      </section>

      <SharedFooter variant="minimal" />
    </div>
  );
}
