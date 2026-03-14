/**
 * Contenu du contrat de partenariat Kshare (12 articles).
 * Composant Server — utilisé dans la page contrat.
 */

interface ContractContentProps {
  commerceName: string;
}

const ARTICLES = [
  {
    title: "Article 1 — Objet du contrat",
    content:
      "Le présent contrat a pour objet de définir les conditions dans lesquelles le Commerce partenaire utilise la plateforme Kshare pour proposer à la vente des paniers alimentaires casher composés de produits invendus ou proches de leur date limite de consommation, dans le but de réduire le gaspillage alimentaire et de rendre l'alimentation casher plus accessible.",
  },
  {
    title: "Article 2 — Définitions",
    content:
      "« Kshare » désigne la société exploitant la plateforme accessible à l'adresse k-share.fr et via l'application mobile Kshare.\n« Commerce partenaire » désigne l'établissement identifié dans les informations du présent contrat.\n« Panier » désigne un lot de produits alimentaires casher proposé à la vente via la plateforme.\n« Client » désigne toute personne physique achetant un Panier via la plateforme.\n« Commission » désigne le pourcentage prélevé par Kshare sur chaque vente.",
  },
  {
    title: "Article 3 — Obligations du Commerce partenaire",
    content:
      "Le Commerce partenaire s'engage à :\n• Proposer uniquement des produits alimentaires conformes aux normes de cacherout en vigueur et respectant la réglementation sanitaire applicable.\n• Garantir la fraîcheur et la qualité des produits inclus dans les paniers.\n• Respecter les créneaux de retrait indiqués lors de la publication des paniers.\n• Préparer les paniers commandés dans les délais impartis.\n• Informer Kshare de toute modification impactant son activité (fermeture, changement d'adresse, perte de certification casher).\n• Ne pas utiliser la plateforme pour vendre des produits non conformes ou périmés.",
  },
  {
    title: "Article 4 — Obligations de Kshare",
    content:
      "Kshare s'engage à :\n• Mettre à disposition une plateforme fonctionnelle et sécurisée.\n• Assurer le traitement des paiements via un prestataire certifié (Stripe).\n• Reverser au Commerce les sommes dues selon les modalités prévues.\n• Fournir un espace de gestion (tableau de bord) permettant le suivi des ventes et des paniers.\n• Assurer un support technique et commercial dans un délai raisonnable.",
  },
  {
    title: "Article 5 — Plans tarifaires et commission",
    content:
      "La plateforme Kshare propose deux formules d'abonnement au Commerce partenaire :\n\n• Plan Starter (gratuit) : aucun abonnement mensuel. Une commission de 18% (hors taxes) est prélevée sur le prix de vente de chaque panier vendu via la plateforme.\n\n• Plan Pro (29 € HT/mois) : abonnement mensuel de 29 € (vingt-neuf euros) hors taxes, prélevé par prélèvement SEPA. Une commission réduite de 12% (hors taxes) est prélevée sur le prix de vente de chaque panier vendu.\n\nLe Commerce choisit son plan lors de son inscription. Un changement de plan est possible une fois par an, depuis l'espace commerçant. Le nouveau plan prend effet au début de la période de facturation suivante.\n\nLa commission est automatiquement calculée et prélevée lors de chaque transaction. Le montant net (prix de vente moins commission) est reversé au Commerce selon les modalités de l'article 7.",
  },
  {
    title: "Article 6 — Abonnement et paiement",
    content:
      "Le plan Starter est gratuit et ne nécessite aucun moyen de paiement pour l'abonnement.\n\nLe plan Pro est soumis à un abonnement mensuel de 29 € HT, prélevé par prélèvement SEPA. Le Commerce autorise Kshare à effectuer ce prélèvement de manière récurrente.\n\nEn cas de non-paiement de l'abonnement Pro, Kshare se réserve le droit de suspendre l'accès à la plateforme après mise en demeure restée sans effet pendant 15 jours. Le Commerce sera alors automatiquement basculé sur le plan Starter.",
  },
  {
    title: "Article 7 — Reversements",
    content:
      "Les sommes dues au Commerce partenaire sont reversées de manière hebdomadaire, chaque mardi, via Stripe Connect sur le compte bancaire renseigné par le Commerce.\n\nLe reversement correspond au montant total des ventes de la semaine précédente, déduction faite de la commission Kshare.\n\nEn cas de litige, remboursement client ou annulation, le montant concerné sera déduit du prochain reversement.",
  },
  {
    title: "Article 8 — Durée et résiliation",
    content:
      "Le présent contrat est conclu pour une durée indéterminée à compter de sa signature électronique.\n\nChaque partie peut résilier le contrat à tout moment, sous réserve d'un préavis de 30 jours, notifié par email à l'adresse de l'autre partie.\n\nKshare se réserve le droit de résilier le contrat sans préavis en cas de :\n• Manquement grave aux obligations du présent contrat.\n• Non-respect des normes de cacherout ou de la réglementation sanitaire.\n• Fraude ou comportement portant atteinte à l'image de Kshare.\n• Non-paiement de l'abonnement après mise en demeure.",
  },
  {
    title: "Article 9 — Propriété intellectuelle",
    content:
      "Chaque partie conserve la propriété de ses éléments de propriété intellectuelle respectifs.\n\nLe Commerce autorise Kshare à utiliser son nom, son logo et ses photos de produits aux fins de promotion sur la plateforme et les supports de communication de Kshare.\n\nLe Commerce s'interdit de reproduire, copier ou utiliser les éléments de la plateforme Kshare (logo, design, code) sans autorisation écrite préalable.",
  },
  {
    title: "Article 10 — Protection des données (RGPD)",
    content:
      "Kshare traite les données personnelles du Commerce partenaire conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.\n\nLes données collectées sont utilisées exclusivement pour la gestion de la relation contractuelle, le traitement des paiements et l'amélioration du service.\n\nLe Commerce dispose d'un droit d'accès, de rectification, de suppression et de portabilité de ses données. Toute demande peut être adressée à contact@k-share.fr.\n\nLes données des clients finaux sont traitées par Kshare en qualité de responsable de traitement et ne sont pas transmises au Commerce au-delà de ce qui est nécessaire à la préparation des commandes.",
  },
  {
    title: "Article 11 — Limitation de responsabilité",
    content:
      "Kshare ne saurait être tenu responsable :\n• Des interruptions temporaires de la plateforme pour maintenance ou cas de force majeure.\n• De la qualité des produits proposés par le Commerce.\n• Des litiges entre le Commerce et ses fournisseurs.\n• Des pertes de chiffre d'affaires liées à l'utilisation ou à la non-utilisation de la plateforme.\n\nLa responsabilité de Kshare est limitée au montant des commissions perçues au cours des 12 derniers mois.",
  },
  {
    title: "Article 12 — Droit applicable et juridiction",
    content:
      "Le présent contrat est régi par le droit français.\n\nEn cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut d'accord dans un délai de 30 jours, le litige sera soumis aux tribunaux compétents de Paris.",
  },
];

export default function ContractContent({ commerceName }: ContractContentProps) {
  return (
    <div className="space-y-8">
      {/* ── En-tête ── */}
      <div className="text-center pb-6 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground mb-2">Contrat de partenariat</h1>
        <p className="text-sm text-muted-foreground">
          Entre <strong>Kshare</strong> et <strong>{commerceName}</strong>
        </p>
      </div>

      {/* ── Articles ── */}
      {ARTICLES.map((article, index) => (
        <section key={index}>
          <h2 className="text-base font-bold text-primary mb-3">{article.title}</h2>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {article.content}
          </div>
        </section>
      ))}
    </div>
  );
}
