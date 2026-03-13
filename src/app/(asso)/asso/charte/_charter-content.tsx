/**
 * Contenu de la charte d'engagement association Kshare (9 articles).
 */

interface CharterContentProps {
  assoName: string;
}

const ARTICLES = [
  {
    title: "Article 1 — Objet de la charte",
    content:
      "La présente charte définit les engagements réciproques entre l'association partenaire et Kshare dans le cadre de la récupération de paniers alimentaires casher issus de dons via la plateforme Kshare. L'objectif commun est de lutter contre le gaspillage alimentaire et de rendre l'alimentation casher accessible aux personnes en situation de précarité.",
  },
  {
    title: "Article 2 — Engagements de l'association",
    content:
      "L'association partenaire s'engage à :\n• Récupérer les paniers dons réservés exclusivement pour les distribuer à des bénéficiaires dans le besoin.\n• Ne jamais revendre les paniers reçus via la plateforme Kshare.\n• Respecter les créneaux de retrait indiqués lors de la réservation des paniers.\n• Prévenir le commerce ou Kshare en cas d'impossibilité de retrait au moins 2 heures avant le créneau.\n• Garantir le respect de la chaîne du froid et des conditions d'hygiène lors du transport et de la distribution.\n• Utiliser la plateforme de manière loyale et conforme à son objet social.\n• Informer Kshare de toute modification de ses statuts, de sa dissolution ou de tout changement impactant son activité.",
  },
  {
    title: "Article 3 — Engagements de Kshare",
    content:
      "Kshare s'engage à :\n• Mettre à disposition un espace association fonctionnel et sécurisé.\n• Notifier l'association des paniers dons disponibles dans sa zone géographique.\n• Garantir la gratuité du service pour les associations partenaires.\n• Assurer un support technique et opérationnel dans un délai raisonnable.\n• Protéger les données de l'association conformément à la réglementation en vigueur.",
  },
  {
    title: "Article 4 — Paniers dons",
    content:
      "Les paniers dons sont offerts par les commerces partenaires via la plateforme Kshare. Ils sont composés de produits alimentaires casher invendus ou proches de leur date limite de consommation.\n\nL'association s'engage à ne pas sélectionner les paniers en fonction de leur contenu et à accepter la variabilité des produits proposés.\n\nLes paniers dons sont strictement gratuits. Aucune contrepartie financière ne peut être demandée aux bénéficiaires finaux.",
  },
  {
    title: "Article 5 — Retrait et logistique",
    content:
      "L'association désigne un ou plusieurs référents habilités à effectuer les retraits en magasin.\n\nLors du retrait, le référent doit présenter le QR code de réservation généré par la plateforme.\n\nEn cas d'absences répétées sans prévenir (plus de 3 retraits manqués sans annulation préalable), Kshare se réserve le droit de suspendre temporairement l'accès de l'association à la plateforme.",
  },
  {
    title: "Article 6 — Confidentialité et données personnelles",
    content:
      "Kshare traite les données de l'association conformément au Règlement Général sur la Protection des Données (RGPD).\n\nLes données collectées sont utilisées exclusivement pour la gestion de la relation partenariale et l'amélioration du service.\n\nL'association dispose d'un droit d'accès, de rectification et de suppression de ses données. Toute demande peut être adressée à contact@k-share.fr.\n\nL'association s'engage à ne pas divulguer les coordonnées des commerces partenaires obtenues via la plateforme.",
  },
  {
    title: "Article 7 — Responsabilité",
    content:
      "Kshare ne saurait être tenu responsable :\n• De la qualité ou de la composition des paniers dons proposés par les commerces.\n• Des interruptions temporaires de la plateforme.\n• Des conséquences liées à un retrait non effectué par l'association.\n\nL'association est responsable de la bonne conservation et de la distribution des paniers reçus.",
  },
  {
    title: "Article 8 — Durée et résiliation",
    content:
      "La présente charte est conclue pour une durée indéterminée à compter de sa signature électronique.\n\nChaque partie peut y mettre fin à tout moment, par notification écrite (email), sans préavis.\n\nKshare se réserve le droit de suspendre ou résilier l'accès de l'association en cas de manquement grave à la présente charte, notamment en cas de revente de paniers dons ou d'utilisation frauduleuse de la plateforme.",
  },
  {
    title: "Article 9 — Droit applicable",
    content:
      "La présente charte est régie par le droit français.\n\nEn cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, le litige sera soumis aux tribunaux compétents de Paris.",
  },
];

export default function CharterContent({ assoName }: CharterContentProps) {
  return (
    <div className="space-y-8">
      <div className="text-center pb-6 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground mb-2">Charte d&apos;engagement</h1>
        <p className="text-sm text-muted-foreground">
          Entre <strong>Kshare</strong> et <strong>{assoName}</strong>
        </p>
      </div>

      {ARTICLES.map((article, index) => (
        <section key={index}>
          <h2 className="text-base font-bold text-purple-600 mb-3">{article.title}</h2>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {article.content}
          </div>
        </section>
      ))}
    </div>
  );
}
