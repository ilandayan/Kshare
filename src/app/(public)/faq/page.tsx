import { PublicNavbar } from "@/components/shared/public-navbar";
import { SharedFooter } from "@/components/shared/footer";
import {
  HelpCircle,
  ShoppingBasket,
  CreditCard,
  Clock,
  QrCode,
  RotateCcw,
  Store,
  Heart,
  Shield,
  Smartphone,
  ChevronDown,
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string[];
}

interface FaqSection {
  title: string;
  icon: React.ElementType;
  items: FaqItem[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "G\u00e9n\u00e9ral",
    icon: HelpCircle,
    items: [
      {
        question: "Qu\u2019est-ce que Kshare ?",
        answer: [
          "Kshare est une marketplace digitale qui met en relation des commerces casher (boucheries, boulangeries, supermarch\u00e9s, traiteurs, etc.) avec des consommateurs souhaitant acheter des paniers alimentaires casher \u00e0 prix r\u00e9duit.",
          "Les paniers contiennent des invendus ou des produits proches de leur date limite de consommation. Notre double objectif : r\u00e9duire le gaspillage alimentaire et rendre l\u2019alimentation casher plus accessible.",
        ],
      },
      {
        question: "Comment fonctionne Kshare ?",
        answer: [
          "Les commerces casher publient des paniers compos\u00e9s de leurs invendus \u00e0 prix r\u00e9duit. Vous choisissez un panier, vous le r\u00e9servez et payez en ligne, puis vous le r\u00e9cup\u00e9rez en magasin pendant le cr\u00e9neau indiqu\u00e9 gr\u00e2ce \u00e0 votre QR code.",
        ],
      },
      {
        question: "L\u2019application est-elle gratuite ?",
        answer: [
          "Oui, l\u2019inscription et l\u2019utilisation de Kshare sont enti\u00e8rement gratuites pour les clients. Vous ne payez que le prix des paniers que vous commandez.",
        ],
      },
    ],
  },
  {
    title: "Les paniers",
    icon: ShoppingBasket,
    items: [
      {
        question: "Quels types de paniers sont disponibles ?",
        answer: [
          "Nous proposons 5 cat\u00e9gories de paniers :",
          "\ud83e\udd69 Bassari (viande) \u2014 \ud83e\uddc0 Halavi (laitier) \u2014 \ud83c\udf3f Parv\u00e9 (neutre) \u2014 \ud83c\udf77 Shabbat (sp\u00e9cial Shabbat) \u2014 \u2795 Mix (assortiment)",
          "Le contenu exact varie selon les stocks disponibles du commer\u00e7ant, mais la cat\u00e9gorie et la valeur indicative sont toujours respect\u00e9es.",
        ],
      },
      {
        question: "Puis-je conna\u00eetre le contenu exact d\u2019un panier ?",
        answer: [
          "Le principe des paniers anti-gaspi est l\u2019effet surprise ! Le contenu d\u00e9pend des invendus du jour. Cependant, la cat\u00e9gorie (bassari, halavi, parv\u00e9, etc.) est toujours indiqu\u00e9e, ainsi qu\u2019une description g\u00e9n\u00e9rale du type de produits que vous pouvez attendre.",
        ],
      },
      {
        question: "Les produits sont-ils bien casher ?",
        answer: [
          "Absolument. L\u2019ensemble des commerces pr\u00e9sents sur la plateforme Kshare sont des commerces certifi\u00e9s casher.",
        ],
      },
    ],
  },
  {
    title: "Commande et paiement",
    icon: CreditCard,
    items: [
      {
        question: "Comment commander un panier ?",
        answer: [
          "1. Parcourez les paniers disponibles sur l\u2019application",
          "2. S\u00e9lectionnez le panier qui vous int\u00e9resse",
          "3. Choisissez la quantit\u00e9 souhait\u00e9e",
          "4. Proc\u00e9dez au paiement s\u00e9curis\u00e9 en ligne",
          "5. Recevez votre QR code de retrait",
        ],
      },
      {
        question: "Quels moyens de paiement sont accept\u00e9s ?",
        answer: [
          "Le paiement est effectu\u00e9 en ligne de mani\u00e8re s\u00e9curis\u00e9e via Stripe. Nous acceptons les cartes bancaires (Visa, Mastercard, American Express), Apple Pay et Google Pay. Aucune donn\u00e9e bancaire n\u2019est stock\u00e9e par Kshare.",
        ],
      },
      {
        question: "Le paiement est-il s\u00e9curis\u00e9 ?",
        answer: [
          "Oui, tous les paiements sont trait\u00e9s par Stripe, un leader mondial du paiement en ligne, certifi\u00e9 PCI-DSS niveau 1. Kshare ne stocke jamais vos donn\u00e9es bancaires.",
        ],
      },
      {
        question: "Qui est le vendeur du panier ?",
        answer: [
          "Le vendeur est toujours le commer\u00e7ant. Kshare agit comme plateforme interm\u00e9diaire de mise en relation entre vous et le commer\u00e7ant. La vente est conclue directement entre le client et le commerce partenaire.",
          "Kshare facilite la transaction et pr\u00e9l\u00e8ve uniquement une commission de service. Le commer\u00e7ant reste le vendeur l\u00e9gal et responsable des produits propos\u00e9s.",
        ],
      },
    ],
  },
  {
    title: "Retrait en magasin",
    icon: QrCode,
    items: [
      {
        question: "Comment r\u00e9cup\u00e9rer mon panier ?",
        answer: [
          "Apr\u00e8s votre commande, un QR code unique est g\u00e9n\u00e9r\u00e9 dans l\u2019application (onglet \u00ab Mes paniers \u00bb). Pr\u00e9sentez-vous au commerce pendant le cr\u00e9neau de retrait indiqu\u00e9 et montrez votre QR code au commer\u00e7ant. Une fois votre panier r\u00e9cup\u00e9r\u00e9, confirmez la r\u00e9ception directement dans l\u2019application pour finaliser la transaction.",
        ],
      },
      {
        question: "Que faire si le commerce est ferm\u00e9 ?",
        answer: [
          "Si vous constatez que le commerce est ferm\u00e9 pendant le cr\u00e9neau de retrait, appuyez sur le bouton \u00ab Aide \u00bb disponible sur la page de votre commande (juste \u00e0 c\u00f4t\u00e9 du bouton de validation). Le paiement sera imm\u00e9diatement bloqu\u00e9 le temps que notre \u00e9quipe v\u00e9rifie la situation. Si la fermeture est confirm\u00e9e, le d\u00e9bit sera annul\u00e9 et vous ne serez pas pr\u00e9lev\u00e9.",
        ],
      },
      {
        question: "Que se passe-t-il si je ne viens pas r\u00e9cup\u00e9rer mon panier ?",
        answer: [
          "Si vous ne vous pr\u00e9sentez pas pendant le cr\u00e9neau de retrait, votre commande sera marqu\u00e9e comme \u00ab non retir\u00e9e \u00bb. Le panier ne pourra pas \u00eatre rembours\u00e9.",
        ],
      },
    ],
  },
  {
    title: "Cr\u00e9neaux horaires",
    icon: Clock,
    items: [
      {
        question: "Quand puis-je r\u00e9cup\u00e9rer mon panier ?",
        answer: [
          "Chaque panier a un cr\u00e9neau de retrait d\u00e9fini par le commer\u00e7ant (par exemple : 16h00 \u2013 18h00). Ce cr\u00e9neau est clairement affich\u00e9 avant l\u2019achat. Vous devez vous pr\u00e9senter pendant ce cr\u00e9neau.",
        ],
      },
      {
        question: "Les paniers sont-ils disponibles tous les jours ?",
        answer: [
          "La disponibilit\u00e9 d\u00e9pend de chaque commerce partenaire. Certains proposent des paniers quotidiennement, d\u2019autres uniquement certains jours. Les paniers sp\u00e9ciaux Shabbat sont g\u00e9n\u00e9ralement disponibles le vendredi.",
        ],
      },
    ],
  },
  {
    title: "Protection et annulation",
    icon: RotateCcw,
    items: [
      {
        question: "Que faire si le commerce ne peut pas fournir mon panier ?",
        answer: [
          "Si le commer\u00e7ant est dans l\u2019impossibilit\u00e9 de fournir votre panier (rupture de stock, fermeture impr\u00e9vue), utilisez le bouton \u00ab Aide \u00bb sur la page de votre commande pour signaler le probl\u00e8me. Le paiement sera bloqu\u00e9 et notre \u00e9quipe v\u00e9rifiera la situation. Apr\u00e8s v\u00e9rification, le d\u00e9bit sera annul\u00e9 et vous ne serez pas pr\u00e9lev\u00e9.",
        ],
      },
    ],
  },
  {
    title: "Commerces partenaires",
    icon: Store,
    items: [
      {
        question: "Comment devenir commerce partenaire ?",
        answer: [
          "Rendez-vous sur notre page d\u2019inscription commer\u00e7ant sur k-share.fr. Remplissez le formulaire avec les informations de votre commerce. Notre \u00e9quipe v\u00e9rifiera votre dossier et activera votre compte.",
        ],
      },
      {
        question: "Combien co\u00fbte l\u2019utilisation de Kshare pour les commer\u00e7ants ?",
        answer: [
          "Kshare propose deux formules aux commer\u00e7ants :",
          "Starter (gratuit) \u2014 Aucun abonnement, commission de 18 % par panier vendu. Id\u00e9al pour d\u00e9marrer sans engagement.",
          "Pro (29 \u20ac/mois) \u2014 Abonnement mensuel avec commission r\u00e9duite \u00e0 12 % par panier vendu. Recommand\u00e9 pour les commerces actifs.",
          "Le paiement de l\u2019abonnement Pro s\u2019effectue par pr\u00e9l\u00e8vement SEPA ou carte bancaire.",
        ],
      },
    ],
  },
  {
    title: "Dons et solidarit\u00e9 (Tsedaka)",
    icon: Heart,
    items: [
      {
        question: "Comment faire un don de panier ?",
        answer: [
          "Les dons peuvent provenir des clients comme des commer\u00e7ants. En tant que client, lors de votre commande, vous avez la possibilit\u00e9 d\u2019offrir un panier \u00e0 une association partenaire. Les commer\u00e7ants peuvent \u00e9galement publier des paniers en don directement sur la plateforme.",
          "Dans les deux cas, le panier est mis \u00e0 disposition d\u2019une association partenaire qui pourra le r\u00e9cup\u00e9rer en magasin.",
        ],
      },
      {
        question: "Les dons sont-ils remboursables ?",
        answer: [
          "Les paniers offerts aux associations ne sont pas remboursables une fois la transaction valid\u00e9e, sauf en cas d\u2019indisponibilit\u00e9 du panier par le commer\u00e7ant ou de non r\u00e9cup\u00e9ration du don par une association.",
        ],
      },
    ],
  },
  {
    title: "Mon compte et s\u00e9curit\u00e9",
    icon: Shield,
    items: [
      {
        question: "Mes donn\u00e9es personnelles sont-elles prot\u00e9g\u00e9es ?",
        answer: [
          "Oui, Kshare respecte le RGPD et la loi Informatique et Libert\u00e9s. Vos donn\u00e9es sont prot\u00e9g\u00e9es et ne sont jamais revendues \u00e0 des tiers. Pour en savoir plus, consultez notre Politique de Confidentialit\u00e9.",
        ],
      },
      {
        question: "Comment supprimer mon compte ?",
        answer: [
          "Vous pouvez demander la suppression de votre compte en nous contactant \u00e0 contact@k-share.fr. Votre compte et vos donn\u00e9es personnelles seront supprim\u00e9s conform\u00e9ment \u00e0 notre politique de confidentialit\u00e9.",
        ],
      },
    ],
  },
  {
    title: "Application mobile",
    icon: Smartphone,
    items: [
      {
        question: "L\u2019application est-elle disponible sur iOS et Android ?",
        answer: [
          "L\u2019application Kshare est disponible sur l\u2019App Store (iOS) et le Google Play Store (Android). Vous pouvez \u00e9galement acc\u00e9der \u00e0 la version web sur k-share.fr.",
        ],
      },
      {
        question: "Comment contacter le support ?",
        answer: [
          "Vous pouvez nous contacter par email \u00e0 contact@k-share.fr. Notre \u00e9quipe vous r\u00e9pondra dans les meilleurs d\u00e9lais.",
        ],
      },
    ],
  },
];

function FaqAccordionItem({ item }: { item: FaqItem }) {
  return (
    <details className="group">
      <summary className="flex items-start gap-3 cursor-pointer list-none py-4 px-1 hover:bg-gray-50/50 rounded-xl transition-colors [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 text-[#3744C8] mt-1 shrink-0 transition-transform group-open:rotate-180" />
        <span className="text-sm font-semibold text-gray-800 leading-relaxed">
          {item.question}
        </span>
      </summary>
      <div className="pl-7 pb-4 space-y-2">
        {item.answer.map((paragraph, i) => (
          <p key={i} className="text-sm text-gray-500 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </details>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#EEF0F8]">
      <PublicNavbar />

      {/* HERO */}
      <section className="relative py-24 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-60 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,#c8cef5_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#9ba8d8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.15]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="anim-hidden animate-fade-in-up inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-8 shadow-sm">
            <HelpCircle className="h-3.5 w-3.5 text-[#3744C8]" />
            Centre d&apos;aide
          </div>
          <h1 className="anim-hidden animate-fade-in-up delay-100 font-display text-4xl md:text-5xl font-bold text-[#3744C8] leading-tight mb-6">
            Questions
            <br />
            fr&eacute;quentes
          </h1>
          <p className="anim-hidden animate-fade-in-up delay-200 text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Retrouvez les r&eacute;ponses aux questions les plus courantes sur
            Kshare, nos paniers casher anti-gaspi et le fonctionnement de la
            plateforme
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {FAQ_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="anim-hidden animate-fade-in-up bg-white rounded-3xl border border-[#e2e5f0]/60 overflow-hidden card-elevated"
            >
              <div className="h-1 bg-gradient-to-r from-[#3744C8] via-[#5B6EF5] to-[#3744C8]" />

              <div className="p-6 md:p-8">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#3744C8]/10 rounded-xl flex items-center justify-center shrink-0">
                    <section.icon className="h-5 w-5 text-[#3744C8]" />
                  </div>
                  <h2 className="font-display text-lg font-bold text-gray-900">
                    {section.title}
                  </h2>
                </div>

                {/* Questions */}
                <div className="divide-y divide-gray-100">
                  {section.items.map((item) => (
                    <FaqAccordionItem key={item.question} item={item} />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Contact CTA */}
          <div className="anim-hidden animate-fade-in-up bg-white rounded-3xl border border-[#e2e5f0]/60 overflow-hidden card-elevated">
            <div className="p-8 md:p-12 text-center">
              <h3 className="font-display text-xl font-bold text-gray-900 mb-3">
                Vous n&apos;avez pas trouv&eacute; votre r&eacute;ponse ?
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Notre &eacute;quipe est disponible pour r&eacute;pondre &agrave;
                toutes vos questions. N&apos;h&eacute;sitez pas &agrave; nous
                contacter.
              </p>
              <a
                href="mailto:contact@k-share.fr"
                className="inline-flex items-center gap-2 bg-[#3744C8] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#2d38a8] transition-colors"
              >
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </section>

      <SharedFooter variant="minimal" />
    </div>
  );
}
