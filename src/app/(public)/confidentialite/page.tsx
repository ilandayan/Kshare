import type { Metadata } from "next";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { SharedFooter } from "@/components/shared/footer";
import {
  Lock,
  Eye,
  Database,
  Target,
  Scale,
  Share2,
  Clock,
  UserCheck,
  Cookie,
  ShieldCheck,
  FileEdit,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Découvrez comment Kshare collecte, utilise et protège vos données personnelles conformément au RGPD.",
  openGraph: {
    title: "Politique de confidentialité | Kshare",
    url: "https://k-share.fr/confidentialite",
  },
};

const SECTIONS = [
  {
    number: 1,
    title: "Responsable du traitement",
    icon: Eye,
    content: [
      "Le responsable du traitement des donn\u00e9es personnelles collect\u00e9es via la plateforme Kshare est la soci\u00e9t\u00e9 Kshare SAS, dont le si\u00e8ge social est situ\u00e9 \u00e0 Paris, France.",
      "Pour toute question relative \u00e0 la protection de vos donn\u00e9es personnelles, vous pouvez nous contacter par e-mail \u00e0 l\u2019adresse : contact@k-share.fr.",
      "Kshare s\u2019engage \u00e0 traiter vos donn\u00e9es personnelles dans le respect du R\u00e8glement G\u00e9n\u00e9ral sur la Protection des Donn\u00e9es (RGPD \u2014 R\u00e8glement UE 2016/679) et de la loi fran\u00e7aise Informatique et Libert\u00e9s du 6 janvier 1978 modifi\u00e9e.",
    ],
  },
  {
    number: 2,
    title: "Donn\u00e9es collect\u00e9es",
    icon: Database,
    content: [
      "Dans le cadre de l\u2019utilisation de la plateforme, Kshare est amen\u00e9e \u00e0 collecter les cat\u00e9gories de donn\u00e9es personnelles suivantes :",
    ],
    list: [
      {
        category: "Donn\u00e9es d\u2019identification",
        items:
          "Nom, pr\u00e9nom, adresse e-mail, num\u00e9ro de t\u00e9l\u00e9phone, photo de profil (facultative).",
      },
      {
        category: "Donn\u00e9es professionnelles (commerçants)",
        items:
          "Raison sociale, num\u00e9ro SIRET, adresse du commerce, certifications casher (cacherout), coordonn\u00e9es bancaires pour les virements (IBAN via Stripe Connect).",
      },
      {
        category: "Donn\u00e9es de paiement",
        items:
          "Les donn\u00e9es de paiement (num\u00e9ros de carte bancaire, IBAN) sont trait\u00e9es exclusivement par notre partenaire Stripe et ne sont jamais stock\u00e9es sur les serveurs de Kshare. Stripe est certifi\u00e9 PCI-DSS Level 1.",
      },
      {
        category: "Donn\u00e9es de g\u00e9olocalisation",
        items:
          "Position g\u00e9ographique approximative (application mobile) pour permettre l\u2019affichage des commerces et paniers \u00e0 proximit\u00e9. Cette fonctionnalit\u00e9 est soumise au consentement pr\u00e9alable de l\u2019utilisateur.",
      },
      {
        category: "Donn\u00e9es d\u2019utilisation",
        items:
          "Historique des commandes, paniers favoris, pr\u00e9f\u00e9rences alimentaires, donn\u00e9es de navigation sur la plateforme, adresse IP, type de navigateur et appareil utilis\u00e9.",
      },
      {
        category: "Donn\u00e9es relatives aux dons",
        items:
          "Historique des dons effectu\u00e9s aux associations (tsedaka), montants et b\u00e9n\u00e9ficiaires.",
      },
    ],
  },
  {
    number: 3,
    title: "Finalit\u00e9s du traitement",
    icon: Target,
    content: ["Vos donn\u00e9es personnelles sont collect\u00e9es et trait\u00e9es pour les finalit\u00e9s suivantes :"],
    bullets: [
      "Cr\u00e9ation et gestion de votre compte utilisateur (Client, Commerce ou Association)",
      "Traitement et suivi de vos commandes de paniers alimentaires casher",
      "Gestion des paiements et des reversements aux commerçants via Stripe",
      "Gestion des abonnements commerçants (pr\u00e9l\u00e8vement SEPA mensuel de 30 \u20ac)",
      "Envoi de notifications relatives \u00e0 vos commandes (confirmation, rappel de retrait, QR code)",
      "Communication commerciale sur les nouveaux paniers disponibles \u00e0 proximit\u00e9 (avec votre consentement)",
      "Am\u00e9lioration continue de la plateforme et de l\u2019exp\u00e9rience utilisateur",
      "Gestion des dons aux associations et suivi de la tsedaka",
      "Pr\u00e9vention de la fraude et s\u00e9curit\u00e9 de la plateforme",
      "Respect des obligations l\u00e9gales et r\u00e9glementaires applicables",
    ],
  },
  {
    number: 4,
    title: "Base l\u00e9gale du traitement",
    icon: Scale,
    content: [
      "Les traitements de donn\u00e9es personnelles r\u00e9alis\u00e9s par Kshare reposent sur les bases l\u00e9gales suivantes :",
    ],
    bullets: [
      "Ex\u00e9cution du contrat : le traitement est n\u00e9cessaire \u00e0 la fourniture du service (cr\u00e9ation de compte, traitement des commandes, paiements, reversements)",
      "Consentement : pour la g\u00e9olocalisation, les communications commerciales et les cookies analytiques, votre consentement pr\u00e9alable est recueilli et peut \u00eatre retir\u00e9 \u00e0 tout moment",
      "Int\u00e9r\u00eat l\u00e9gitime : pour la pr\u00e9vention de la fraude, l\u2019am\u00e9lioration du service et la s\u00e9curit\u00e9 de la plateforme",
      "Obligation l\u00e9gale : pour la conservation des donn\u00e9es de facturation et de transaction conform\u00e9ment au droit fiscal et commercial fran\u00e7ais",
    ],
  },
  {
    number: 5,
    title: "Destinataires des donn\u00e9es",
    icon: Share2,
    content: [
      "Vos donn\u00e9es personnelles peuvent \u00eatre transmises aux cat\u00e9gories de destinataires suivantes, dans la stricte limite de ce qui est n\u00e9cessaire \u00e0 la fourniture du service :",
    ],
    list: [
      {
        category: "Kshare (interne)",
        items:
          "\u00c9quipes techniques, commerciales et support client, dans le cadre de leurs fonctions respectives.",
      },
      {
        category: "Stripe (paiements)",
        items:
          "Notre partenaire de paiement certifi\u00e9 PCI-DSS pour le traitement des transactions, la gestion des comptes connect\u00e9s (Stripe Connect) et les pr\u00e9l\u00e8vements SEPA. Stripe op\u00e8re conform\u00e9ment au RGPD.",
      },
      {
        category: "Supabase (h\u00e9bergement base de donn\u00e9es)",
        items:
          "Notre fournisseur d\u2019infrastructure de base de donn\u00e9es PostgreSQL. Les donn\u00e9es sont h\u00e9berg\u00e9es sur des serveurs s\u00e9curis\u00e9s au sein de l\u2019Union Europ\u00e9enne.",
      },
      {
        category: "Vercel (h\u00e9bergement web)",
        items:
          "Notre fournisseur d\u2019h\u00e9bergement de l\u2019application web. Les donn\u00e9es transit\u00e9es sont chiffr\u00e9es en HTTPS/TLS.",
      },
    ],
    afterContent: [
      "Kshare ne vend, ne loue et ne transmet jamais vos donn\u00e9es personnelles \u00e0 des tiers \u00e0 des fins commerciales. Aucun transfert de donn\u00e9es hors de l\u2019Espace \u00c9conomique Europ\u00e9en n\u2019est effectu\u00e9 sans garanties ad\u00e9quates (clauses contractuelles types de la Commission Europ\u00e9enne).",
    ],
  },
  {
    number: 6,
    title: "Dur\u00e9e de conservation",
    icon: Clock,
    content: [
      "Vos donn\u00e9es personnelles sont conserv\u00e9es pendant les dur\u00e9es suivantes :",
    ],
    list: [
      {
        category: "Donn\u00e9es de compte",
        items:
          "Pendant toute la dur\u00e9e de votre inscription sur la plateforme, puis 3 ans apr\u00e8s la derni\u00e8re activit\u00e9 sur le compte, conform\u00e9ment aux recommandations de la CNIL.",
      },
      {
        category: "Donn\u00e9es de transaction et facturation",
        items:
          "5 ans \u00e0 compter de la transaction, conform\u00e9ment aux obligations l\u00e9gales comptables et fiscales (article L.123-22 du Code de commerce).",
      },
      {
        category: "Donn\u00e9es de paiement",
        items:
          "Les donn\u00e9es de paiement sont g\u00e9r\u00e9es et conserv\u00e9es directement par Stripe selon sa propre politique de conservation.",
      },
      {
        category: "Logs de connexion et donn\u00e9es techniques",
        items:
          "12 mois \u00e0 compter de leur collecte, conform\u00e9ment \u00e0 la r\u00e9glementation applicable.",
      },
      {
        category: "Cookies",
        items:
          "13 mois maximum \u00e0 compter du d\u00e9p\u00f4t, conform\u00e9ment aux recommandations de la CNIL.",
      },
    ],
    afterContent: [
      "\u00c0 l\u2019issue de ces dur\u00e9es, vos donn\u00e9es sont supprim\u00e9es ou anonymis\u00e9es de mani\u00e8re irr\u00e9versible.",
    ],
  },
  {
    number: 7,
    title: "Vos droits",
    icon: UserCheck,
    content: [
      "Conform\u00e9ment au RGPD et \u00e0 la loi Informatique et Libert\u00e9s, vous disposez des droits suivants sur vos donn\u00e9es personnelles :",
    ],
    bullets: [
      "Droit d\u2019acc\u00e8s : obtenir la confirmation que vos donn\u00e9es sont trait\u00e9es et en recevoir une copie",
      "Droit de rectification : demander la correction de donn\u00e9es inexactes ou incompl\u00e8tes",
      "Droit \u00e0 l\u2019effacement : demander la suppression de vos donn\u00e9es dans les conditions pr\u00e9vues par la loi",
      "Droit \u00e0 la portabilit\u00e9 : recevoir vos donn\u00e9es dans un format structur\u00e9, couramment utilis\u00e9 et lisible par machine",
      "Droit d\u2019opposition : vous opposer au traitement de vos donn\u00e9es pour des raisons tenant \u00e0 votre situation particuli\u00e8re",
      "Droit \u00e0 la limitation du traitement : demander la suspension du traitement dans certains cas",
      "Droit de retirer votre consentement : \u00e0 tout moment, pour les traitements fond\u00e9s sur le consentement",
    ],
    afterContent: [
      "Pour exercer vos droits, adressez votre demande par e-mail \u00e0 contact@k-share.fr en joignant une copie de votre pi\u00e8ce d\u2019identit\u00e9. Nous nous engageons \u00e0 r\u00e9pondre dans un d\u00e9lai de 30 jours \u00e0 compter de la r\u00e9ception de votre demande.",
      "En cas de r\u00e9ponse insatisfaisante, vous avez le droit d\u2019introduire une r\u00e9clamation aupr\u00e8s de la Commission Nationale de l\u2019Informatique et des Libert\u00e9s (CNIL) : www.cnil.fr.",
    ],
  },
  {
    number: 8,
    title: "Cookies",
    icon: Cookie,
    content: [
      "La plateforme Kshare utilise des cookies et technologies similaires pour assurer son bon fonctionnement et am\u00e9liorer l\u2019exp\u00e9rience utilisateur.",
    ],
    list: [
      {
        category: "Cookies essentiels (obligatoires)",
        items:
          "N\u00e9cessaires au fonctionnement de la plateforme : authentification de la session, pr\u00e9f\u00e9rences de langue, s\u00e9curit\u00e9 (protection CSRF). Ces cookies ne peuvent pas \u00eatre d\u00e9sactiv\u00e9s.",
      },
      {
        category: "Cookies analytiques (optionnels)",
        items:
          "Utilis\u00e9s pour mesurer l\u2019audience et am\u00e9liorer les performances de la plateforme. Ils ne sont d\u00e9pos\u00e9s qu\u2019avec votre consentement pr\u00e9alable et peuvent \u00eatre refus\u00e9s ou retir\u00e9s \u00e0 tout moment via le bandeau de gestion des cookies.",
      },
    ],
    afterContent: [
      "Kshare n\u2019utilise aucun cookie publicitaire ni aucun cookie de suivi \u00e0 des fins de ciblage comportemental.",
    ],
  },
  {
    number: 9,
    title: "S\u00e9curit\u00e9 des donn\u00e9es",
    icon: ShieldCheck,
    content: [
      "Kshare met en \u0153uvre des mesures techniques et organisationnelles appropri\u00e9es pour garantir la s\u00e9curit\u00e9 et la confidentialit\u00e9 de vos donn\u00e9es personnelles :",
    ],
    bullets: [
      "Chiffrement de toutes les communications via le protocole TLS (HTTPS)",
      "Row Level Security (RLS) activ\u00e9e sur l\u2019ensemble des tables de la base de donn\u00e9es Supabase, garantissant qu\u2019un utilisateur ne peut acc\u00e9der qu\u2019\u00e0 ses propres donn\u00e9es",
      "Aucune donn\u00e9e bancaire stock\u00e9e sur les serveurs de Kshare \u2014 le traitement est enti\u00e8rement d\u00e9l\u00e9gu\u00e9 \u00e0 Stripe (certifi\u00e9 PCI-DSS Level 1)",
      "Authentification s\u00e9curis\u00e9e via Supabase Auth avec gestion des sessions par JSON Web Token (JWT)",
      "S\u00e9paration stricte des environnements (d\u00e9veloppement, staging, production)",
      "Acc\u00e8s aux donn\u00e9es limit\u00e9 au personnel habilit\u00e9 selon le principe du moindre privil\u00e8ge",
      "Surveillance continue des acc\u00e8s et d\u00e9tection des anomalies",
    ],
  },
  {
    number: 10,
    title: "Modifications de la politique",
    icon: FileEdit,
    content: [
      "Kshare se r\u00e9serve le droit de modifier la pr\u00e9sente Politique de Confidentialit\u00e9 \u00e0 tout moment, notamment pour l\u2019adapter aux \u00e9volutions l\u00e9gislatives ou r\u00e9glementaires, ou en cas de modification de nos pratiques de traitement des donn\u00e9es.",
      "En cas de modification substantielle, les utilisateurs seront inform\u00e9s par notification dans l\u2019application ou par e-mail au moins 15 jours avant l\u2019entr\u00e9e en vigueur de la nouvelle version.",
      "La date de derni\u00e8re mise \u00e0 jour est indiqu\u00e9e en haut de ce document. Nous vous invitons \u00e0 consulter r\u00e9guli\u00e8rement cette page pour rester inform\u00e9 de nos pratiques en mati\u00e8re de protection des donn\u00e9es.",
    ],
  },
];

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#EEF0F8]">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative py-24 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-60 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,#c8cef5_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#9ba8d8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.15]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="anim-hidden animate-fade-in-up inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-8 shadow-sm">
            <Lock className="h-3.5 w-3.5 text-[#3744C8]" />
            Confidentialit&eacute;
          </div>
          <h1 className="anim-hidden animate-fade-in-up delay-100 font-display text-4xl md:text-5xl font-bold text-[#3744C8] leading-tight mb-6">
            Politique de
            <br />
            confidentialit&eacute;
          </h1>
          <p className="anim-hidden animate-fade-in-up delay-200 text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            D&eacute;couvrez comment Kshare prot&egrave;ge vos donn&eacute;es
            personnelles et respecte votre vie priv&eacute;e, en toute
            transparence
          </p>
        </div>
      </section>

      {/* ─────────────── CONTENT ─────────────── */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="anim-hidden animate-fade-in-up bg-white rounded-3xl border border-[#e2e5f0]/60 overflow-hidden card-elevated">
            <div className="h-1.5 bg-gradient-to-r from-[#3744C8] via-[#5B6EF5] to-[#3744C8]" />

            <div className="p-8 md:p-12">
              {/* Last updated */}
              <div className="mb-10 pb-6 border-b border-gray-100">
                <p className="text-sm text-gray-400">
                  Derni&egrave;re mise &agrave; jour : 8 mars 2026
                </p>
              </div>

              {/* Sections */}
              <div className="space-y-10">
                {SECTIONS.map((section) => (
                  <article key={section.number}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 bg-[#3744C8]/10 rounded-xl flex items-center justify-center shrink-0">
                        <section.icon className="h-5 w-5 text-[#3744C8]" />
                      </div>
                      <h2 className="font-display text-xl font-bold text-gray-900 pt-1.5">
                        Article {section.number} &mdash; {section.title}
                      </h2>
                    </div>

                    <div className="pl-14 space-y-3">
                      {section.content.map((paragraph, i) => (
                        <p
                          key={i}
                          className="text-sm text-gray-500 leading-relaxed"
                        >
                          {paragraph}
                        </p>
                      ))}

                      {section.list && (
                        <dl className="space-y-3 mt-2">
                          {section.list.map((item) => (
                            <div key={item.category}>
                              <dt className="text-sm font-semibold text-gray-700">
                                {item.category}
                              </dt>
                              <dd className="text-sm text-gray-500 leading-relaxed ml-4">
                                {item.items}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      {section.bullets && (
                        <ul className="space-y-2 mt-2">
                          {section.bullets.map((bullet, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-sm text-gray-500 leading-relaxed"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3744C8]/40 shrink-0 mt-1.5" />
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}

                      {section.afterContent &&
                        section.afterContent.map((paragraph, i) => (
                          <p
                            key={`after-${i}`}
                            className="text-sm text-gray-500 leading-relaxed mt-3"
                          >
                            {paragraph}
                          </p>
                        ))}
                    </div>
                  </article>
                ))}
              </div>

              {/* Contact */}
              <div className="mt-12 pt-8 border-t border-gray-100">
                <p className="text-sm text-gray-500 leading-relaxed">
                  Pour toute question relative &agrave; la protection de vos
                  donn&eacute;es personnelles ou pour exercer vos droits,
                  contactez-nous &agrave; :{" "}
                  <a
                    href="mailto:contact@k-share.fr"
                    className="text-[#3744C8] hover:underline font-medium"
                  >
                    contact@k-share.fr
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SharedFooter variant="minimal" />
    </div>
  );
}
