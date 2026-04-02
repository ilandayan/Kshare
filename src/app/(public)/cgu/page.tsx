import type { Metadata } from "next";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { SharedFooter } from "@/components/shared/footer";
import {
  Scale,
  BookOpen,
  UserPlus,
  ShoppingBasket,
  CreditCard,
  CalendarCheck,
  ShieldAlert,
  RotateCcw,
  Lock,
  Fingerprint,
  FileEdit,
  Landmark,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description:
    "Consultez les conditions générales d'utilisation de la plateforme Kshare.",
  openGraph: {
    title: "CGU | Kshare",
    url: "https://k-share.fr/cgu",
  },
};

const SECTIONS = [
  {
    number: 1,
    title: "Objet",
    icon: Scale,
    content: [
      "Les pr\u00e9sentes Conditions G\u00e9n\u00e9rales d\u2019Utilisation (ci-apr\u00e8s \u00ab CGU \u00bb) ont pour objet de d\u00e9finir les modalit\u00e9s et conditions d\u2019utilisation de la plateforme Kshare, accessible via le site web k-share.fr et l\u2019application mobile Kshare.",
      "Kshare est une marketplace digitale sp\u00e9cialis\u00e9e dans la vente de paniers alimentaires casher \u00e0 prix r\u00e9duit, compos\u00e9s de produits invendus ou proches de leur date limite de consommation. La plateforme met en relation des commerces casher (boucheries, boulangeries, sup\u00e9rmarch\u00e9s, traiteurs, etc.) avec des consommateurs et des associations caritatives.",
      "L\u2019utilisation de la plateforme implique l\u2019acceptation pleine et enti\u00e8re des pr\u00e9sentes CGU. Si vous n\u2019acceptez pas ces conditions, veuillez ne pas utiliser la plateforme.",
    ],
  },
  {
    number: 2,
    title: "D\u00e9finitions",
    icon: BookOpen,
    content: [],
    definitions: [
      {
        term: "Plateforme",
        definition:
          "D\u00e9signe le site web k-share.fr et l\u2019application mobile Kshare, ainsi que l\u2019ensemble des services associ\u00e9s.",
      },
      {
        term: "Client",
        definition:
          "Toute personne physique utilisant la plateforme pour acheter des paniers alimentaires casher ou effectuer des dons \u00e0 des associations (tsedaka).",
      },
      {
        term: "Commerce",
        definition:
          "Tout professionnel de l\u2019alimentation casher inscrit sur la plateforme pour proposer des paniers \u00e0 prix r\u00e9duit compos\u00e9s de ses invendus.",
      },
      {
        term: "Association",
        definition:
          "Toute structure associative ou caritative inscrite sur la plateforme pour r\u00e9cup\u00e9rer des paniers offerts par les clients dans le cadre de la tsedaka.",
      },
      {
        term: "Panier",
        definition:
          "Ensemble de produits alimentaires casher propos\u00e9 \u00e0 prix r\u00e9duit par un commerce via la plateforme. Les paniers sont class\u00e9s par cat\u00e9gorie : Bassari (viande), Halavi (laitier), Parv\u00e9 (neutre), Shabbat (sp\u00e9cial Shabbat) et Mix (assortiment).",
      },
      {
        term: "Kshare",
        definition:
          "D\u00e9signe la marque d\u00e9pos\u00e9e Kshare, \u00e9ditrice et op\u00e9ratrice de la plateforme k-share.fr et de l\u2019application mobile Kshare.",
      },
    ],
  },
  {
    number: 3,
    title: "Inscription et compte utilisateur",
    icon: UserPlus,
    content: [
      "L\u2019acc\u00e8s \u00e0 certaines fonctionnalit\u00e9s de la plateforme n\u00e9cessite la cr\u00e9ation d\u2019un compte utilisateur. Lors de l\u2019inscription, l\u2019utilisateur s\u2019engage \u00e0 fournir des informations exactes, compl\u00e8tes et \u00e0 jour.",
      "Chaque utilisateur se voit attribuer un r\u00f4le selon son profil : Client, Commerce ou Association. Les comptes de type Commerce et Association font l\u2019objet d\u2019une v\u00e9rification et d\u2019une validation par l\u2019\u00e9quipe Kshare avant activation compl\u00e8te. Cette validation peut inclure la v\u00e9rification des documents d\u2019identit\u00e9, du statut professionnel et des certifications casher.",
      "L\u2019utilisateur est seul responsable de la confidentialit\u00e9 de ses identifiants de connexion. Toute activit\u00e9 r\u00e9alis\u00e9e depuis son compte est r\u00e9put\u00e9e effectu\u00e9e par lui. En cas d\u2019utilisation non autoris\u00e9e, l\u2019utilisateur doit en informer Kshare imm\u00e9diatement.",
      "Kshare se r\u00e9serve le droit de suspendre ou de supprimer tout compte en cas de non-respect des pr\u00e9sentes CGU, d\u2019informations frauduleuses ou de comportement contraire aux bonnes pratiques de la plateforme.",
    ],
  },
  {
    number: 4,
    title: "Fonctionnement de la plateforme",
    icon: ShoppingBasket,
    content: [
      "Les commerçants casher inscrits sur la plateforme publient des paniers alimentaires compos\u00e9s de produits invendus ou proches de leur date limite de consommation. Chaque panier pr\u00e9cise sa cat\u00e9gorie (Bassari, Halavi, Parv\u00e9, Shabbat ou Mix), son contenu indicatif, son prix r\u00e9duit, le cr\u00e9neau de retrait et l\u2019adresse du commerce.",
      "La vente est conclue directement entre le client et le commer\u00e7ant. Kshare agit uniquement comme plateforme interm\u00e9diaire de mise en relation et n\u2019est en aucun cas partie \u00e0 la transaction commerciale.",
      "Les clients r\u00e9servent et paient les paniers en ligne via la plateforme. Apr\u00e8s paiement, un QR code unique est g\u00e9n\u00e9r\u00e9 et permet au client de r\u00e9cup\u00e9rer son panier en magasin pendant le cr\u00e9neau indiqu\u00e9.",
      "Les clients peuvent \u00e9galement faire don d\u2019un panier \u00e0 une association partenaire dans le cadre d\u2019une d\u00e9marche de tsedaka (charit\u00e9). L\u2019association concern\u00e9e est notifi\u00e9e et peut r\u00e9cup\u00e9rer le panier aux m\u00eames conditions.",
      "Le contenu exact des paniers peut varier en fonction des stocks disponibles. Le commer\u00e7ant s\u2019engage cependant \u00e0 respecter la cat\u00e9gorie et la valeur indicative annonc\u00e9es. Les photographies pr\u00e9sent\u00e9es sont donn\u00e9es \u00e0 titre illustratif et ne sont pas contractuelles.",
    ],
  },
  {
    number: 5,
    title: "Prix et paiement",
    icon: CreditCard,
    content: [
      "Le commer\u00e7ant est le vendeur l\u00e9gal (merchant of record) des paniers propos\u00e9s sur la plateforme. Le prix de chaque panier est librement fix\u00e9 par le commer\u00e7ant. Il est affich\u00e9 toutes taxes comprises (TTC) sur la plateforme.",
      "Le paiement est effectu\u00e9 en ligne de mani\u00e8re s\u00e9curis\u00e9e par l\u2019interm\u00e9diaire de notre partenaire de paiement Stripe. Kshare ne stocke aucune donn\u00e9e bancaire. Les transactions sont prot\u00e9g\u00e9es par le protocole de s\u00e9curit\u00e9 PCI-DSS.",
      "Kshare facture un service de mise en relation sous forme de commission sur chaque panier vendu via la plateforme. Le taux de commission d\u00e9pend de la formule choisie par le commer\u00e7ant : 18 % (dix-huit pour cent) pour la formule Starter (sans abonnement) ou 12 % (douze pour cent) pour la formule Pro (avec abonnement mensuel).",
      "Les commer\u00e7ants re\u00e7oivent le versement du montant de leurs ventes, d\u00e9duction faite de la commission Kshare, de mani\u00e8re hebdomadaire via virement bancaire op\u00e9r\u00e9 par Stripe Connect.",
    ],
  },
  {
    number: 6,
    title: "Abonnement commer\u00e7ant",
    icon: CalendarCheck,
    content: [
      "Kshare propose deux formules aux commer\u00e7ants : la formule Starter, gratuite et sans engagement, avec une commission de 18 % par panier vendu ; et la formule Pro, \u00e0 29 \u20ac (vingt-neuf euros) hors taxes par mois, avec une commission r\u00e9duite \u00e0 12 % par panier vendu. Le paiement de l\u2019abonnement Pro est effectu\u00e9 par pr\u00e9l\u00e8vement SEPA (Single Euro Payments Area) ou carte bancaire.",
      "Tous les commer\u00e7ants d\u00e9marrent automatiquement sur la formule Starter. Ils peuvent passer \u00e0 la formule Pro \u00e0 tout moment depuis leur espace personnel.",
      "L\u2019abonnement est renouvel\u00e9 automatiquement chaque mois. Le commer\u00e7ant peut r\u00e9silier son abonnement \u00e0 tout moment depuis son espace personnel, avec prise d\u2019effet \u00e0 la fin de la p\u00e9riode en cours. Aucun remboursement ne sera effectu\u00e9 pour la p\u00e9riode d\u00e9j\u00e0 entam\u00e9e.",
      "En cas de d\u00e9faut de paiement r\u00e9p\u00e9t\u00e9, Kshare se r\u00e9serve le droit de suspendre l\u2019acc\u00e8s du commer\u00e7ant \u00e0 la plateforme jusqu\u2019\u00e0 r\u00e9gularisation.",
    ],
  },
  {
    number: 7,
    title: "Responsabilit\u00e9s",
    icon: ShieldAlert,
    content: [
      "Kshare agit en qualit\u00e9 d\u2019interm\u00e9diaire technique entre les commerçants, les clients et les associations. Kshare n\u2019est en aucun cas producteur, vendeur ou distributeur des produits alimentaires propos\u00e9s sur la plateforme.",
      "La certification casher des produits rel\u00e8ve de la seule responsabilit\u00e9 du commer\u00e7ant. Celui-ci garantit que les produits propos\u00e9s dans ses paniers respectent les normes de cashroute applicables et disposent d\u2019une cacherout (supervision rabbinique) valide.",
      "Le commer\u00e7ant est \u00e9galement responsable du respect des normes d\u2019hygi\u00e8ne alimentaire, de la cha\u00eene du froid, des dates limites de consommation et de toute r\u00e9glementation applicable en mati\u00e8re de s\u00e9curit\u00e9 alimentaire.",
      "Kshare ne saurait \u00eatre tenue responsable en cas de litige entre un client et un commer\u00e7ant portant sur la qualit\u00e9, la conformit\u00e9 ou la s\u00e9curit\u00e9 des produits. Kshare s\u2019engage cependant \u00e0 faciliter la r\u00e9solution des litiges \u00e9ventuels par la voie amiable.",
    ],
  },
  {
    number: 8,
    title: "Annulation et remboursement",
    icon: RotateCcw,
    content: [
      "Le client peut annuler sa r\u00e9servation jusqu\u2019\u00e0 2 heures avant le d\u00e9but du cr\u00e9neau de retrait indiqu\u00e9. Dans ce cas, le remboursement int\u00e9gral est effectu\u00e9 automatiquement sur le moyen de paiement utilis\u00e9, dans un d\u00e9lai de 5 \u00e0 10 jours ouvrables.",
      "Au-del\u00e0 de ce d\u00e9lai, aucune annulation ou remboursement ne sera possible, sauf circonstance exceptionnelle appr\u00e9ci\u00e9e au cas par cas par l\u2019\u00e9quipe Kshare.",
      "Si le commer\u00e7ant est dans l\u2019impossibilit\u00e9 de fournir le panier r\u00e9serv\u00e9 (rupture de stock, fermeture impr\u00e9vue, etc.), le client est automatiquement rembours\u00e9 int\u00e9gralement.",
      "Les paniers offerts aux associations dans le cadre de dons ne sont pas remboursables une fois la transaction valid\u00e9e, sauf en cas d\u2019indisponibilit\u00e9 du panier par le commer\u00e7ant.",
    ],
  },
  {
    number: 9,
    title: "Donn\u00e9es personnelles",
    icon: Lock,
    content: [
      "Kshare collecte et traite des donn\u00e9es personnelles dans le cadre de l\u2019utilisation de la plateforme, conform\u00e9ment au R\u00e8glement G\u00e9n\u00e9ral sur la Protection des Donn\u00e9es (RGPD) et \u00e0 la loi Informatique et Libert\u00e9s.",
      "Pour conna\u00eetre les d\u00e9tails du traitement de vos donn\u00e9es personnelles, les finalit\u00e9s, les dur\u00e9es de conservation et vos droits, veuillez consulter notre Politique de Confidentialit\u00e9 accessible \u00e0 l\u2019adresse suivante : k-share.fr/confidentialite.",
    ],
  },
  {
    number: 10,
    title: "Propri\u00e9t\u00e9 intellectuelle",
    icon: Fingerprint,
    content: [
      "L\u2019ensemble des contenus pr\u00e9sents sur la plateforme Kshare (textes, images, logos, ic\u00f4nes, logiciels, base de donn\u00e9es, design, charte graphique) est prot\u00e9g\u00e9 par les lois fran\u00e7aises et internationales relatives \u00e0 la propri\u00e9t\u00e9 intellectuelle.",
      "La marque Kshare, son logo et son identit\u00e9 visuelle sont des marques d\u00e9pos\u00e9es. Toute reproduction, repr\u00e9sentation, modification ou exploitation non autoris\u00e9e de tout ou partie de ces \u00e9l\u00e9ments est strictement interdite et pourra faire l\u2019objet de poursuites.",
      "Les utilisateurs conc\u00e8dent \u00e0 Kshare un droit d\u2019utilisation non exclusif sur les contenus qu\u2019ils publient sur la plateforme (photos de produits, descriptions, etc.) aux seules fins de fonctionnement et de promotion du service.",
    ],
  },
  {
    number: 11,
    title: "Modification des CGU",
    icon: FileEdit,
    content: [
      "Kshare se r\u00e9serve le droit de modifier les pr\u00e9sentes CGU \u00e0 tout moment. Les utilisateurs seront inform\u00e9s de toute modification substantielle par notification dans l\u2019application ou par e-mail, au moins 15 jours avant l\u2019entr\u00e9e en vigueur des nouvelles conditions.",
      "L\u2019utilisation continue de la plateforme apr\u00e8s l\u2019entr\u00e9e en vigueur des nouvelles CGU vaut acceptation de celles-ci. En cas de d\u00e9saccord, l\u2019utilisateur est libre de cesser d\u2019utiliser la plateforme et de supprimer son compte.",
    ],
  },
  {
    number: 12,
    title: "Droit applicable et juridiction comp\u00e9tente",
    icon: Landmark,
    content: [
      "Les pr\u00e9sentes CGU sont r\u00e9gies par le droit fran\u00e7ais. En cas de litige relatif \u00e0 l\u2019interpr\u00e9tation ou \u00e0 l\u2019ex\u00e9cution des pr\u00e9sentes, les parties s\u2019engagent \u00e0 rechercher une solution amiable avant toute action judiciaire.",
      "\u00c0 d\u00e9faut de r\u00e9solution amiable dans un d\u00e9lai de 30 jours, les tribunaux comp\u00e9tents de Paris seront seuls comp\u00e9tents pour conna\u00eetre du litige, y compris en r\u00e9f\u00e9r\u00e9, en cas de pluralit\u00e9 de d\u00e9fendeurs ou d\u2019appel en garantie.",
      "Conform\u00e9ment aux dispositions du Code de la consommation, le client consommateur peut \u00e9galement recourir \u00e0 un m\u00e9diateur de la consommation dans les conditions pr\u00e9vues par la loi.",
    ],
  },
];

export default function CguPage() {
  return (
    <div className="min-h-screen bg-[#EEF0F8]">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative py-24 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-60 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,#c8cef5_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#9ba8d8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.15]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="anim-hidden animate-fade-in-up inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e2e5f0] rounded-full px-4 py-2 text-sm text-gray-500 mb-8 shadow-sm">
            <Scale className="h-3.5 w-3.5 text-[#3744C8]" />
            Conditions G&eacute;n&eacute;rales
          </div>
          <h1 className="anim-hidden animate-fade-in-up delay-100 font-display text-4xl md:text-5xl font-bold text-[#3744C8] leading-tight mb-6">
            Conditions G&eacute;n&eacute;rales
            <br />
            d&apos;Utilisation
          </h1>
          <p className="anim-hidden animate-fade-in-up delay-200 text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Les r&egrave;gles qui encadrent l&apos;utilisation de la plateforme
            Kshare, pour une exp&eacute;rience transparente et s&eacute;curis&eacute;e
            pour tous
          </p>
        </div>
      </section>

      {/* ─────────────── CONTENT ─────────────── */}
      <section className="pb-20 bg-[#DDE2F2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="anim-hidden animate-fade-in-up bg-white rounded-3xl border border-[#e2e5f0]/60 overflow-hidden card-elevated">
            <div className="h-1.5 bg-gradient-to-r from-[#3744C8] via-[#5B6EF5] to-[#3744C8]" />

            <div className="p-8 md:p-12">
              {/* Last updated */}
              <div className="mb-10 pb-6 border-b border-gray-100">
                <p className="text-sm text-gray-400">
                  Derni&egrave;re mise &agrave; jour : 12 mars 2026
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

                      {section.definitions && (
                        <dl className="space-y-3 mt-2">
                          {section.definitions.map((def) => (
                            <div key={def.term}>
                              <dt className="text-sm font-semibold text-gray-700">
                                {def.term}
                              </dt>
                              <dd className="text-sm text-gray-500 leading-relaxed ml-4">
                                {def.definition}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {/* Contact */}
              <div className="mt-12 pt-8 border-t border-gray-100">
                <p className="text-sm text-gray-500 leading-relaxed">
                  Pour toute question relative aux pr&eacute;sentes Conditions
                  G&eacute;n&eacute;rales d&apos;Utilisation, vous pouvez nous
                  contacter &agrave; l&apos;adresse suivante :{" "}
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
