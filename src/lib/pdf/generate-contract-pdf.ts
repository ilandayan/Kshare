/**
 * Génération du contrat de partenariat Kshare au format PDF.
 *
 * Utilise jsPDF (server-side) pour produire un Buffer prêt à être
 * uploadé dans Supabase Storage ou envoyé en pièce jointe via Resend.
 *
 * Le texte est accentué : la police standard helvetica de jsPDF utilise
 * l'encodage WinAnsi, qui couvre les caractères latins accentués.
 */

import { jsPDF } from "jspdf";

export interface ContractPdfParams {
  commerceName: string;
  commerceAddress: string;
  commerceCity: string;
  commercePostalCode: string;
  signerName: string;
  signerEmail: string;
  signedAt: string; // ISO date
  signerIp: string;
}

// ── Contenu des articles ─────────────────────────────────────────

function getContractArticles(): { title: string; content: string }[] {
  return [
    {
      title: "Article 1 — Objet du contrat",
      content:
        "Le présent contrat a pour objet de définir les conditions dans lesquelles le Commerce partenaire utilise la plateforme Kshare pour proposer à la vente des paniers alimentaires casher composés de produits invendus ou proches de leur date limite de consommation, dans le but de réduire le gaspillage alimentaire et de rendre l'alimentation casher plus accessible.",
    },
    {
      title: "Article 2 — Définitions",
      content:
        "\"Kshare\" désigne l'exploitant de la plateforme accessible à l'adresse k-share.fr et via l'application mobile Kshare.\n\"Commerce partenaire\" désigne l'établissement identifié ci-dessus.\n\"Panier\" désigne un lot de produits alimentaires casher proposé à la vente via la plateforme.\n\"Client\" désigne toute personne physique achetant un Panier via la plateforme.\n\"Commission\" désigne le pourcentage prélevé par Kshare sur chaque vente.\n\"Prix de vente\" désigne le prix toutes taxes comprises payé par le Client pour un Panier, tel que fixé par le Commerce partenaire.",
    },
    {
      title: "Article 3 — Obligations du Commerce partenaire",
      content:
        "Le Commerce partenaire s'engage à :\n- Proposer uniquement des produits alimentaires conformes aux normes de casherout en vigueur et respectant la réglementation sanitaire applicable.\n- Garantir la fraîcheur et la qualité des produits inclus dans les paniers.\n- Respecter les créneaux de retrait indiqués lors de la publication des paniers.\n- Préparer les paniers commandés dans les délais impartis.\n- Informer Kshare de toute modification impactant son activité (fermeture, changement d'adresse, perte de certification casher).\n- Ne pas utiliser la plateforme pour vendre des produits non conformes ou périmés.",
    },
    {
      title: "Article 4 — Obligations de Kshare",
      content:
        "Kshare s'engage à :\n- Mettre à disposition une plateforme fonctionnelle et sécurisée.\n- Assurer le traitement des paiements via un prestataire certifié (Stripe).\n- Permettre le versement au Commerce des sommes qui lui sont dues selon les modalités prévues à l'article 7.\n- Fournir un espace de gestion (tableau de bord) permettant le suivi des ventes et des paniers.\n- Assurer un support technique et commercial dans un délai raisonnable.",
    },
    {
      title: "Article 5 — Plans tarifaires et commission",
      content:
        "La plateforme Kshare propose deux formules au Commerce partenaire :\n\n- Plan Starter (gratuit) : aucun abonnement. Une commission de 18% est prélevée sur le prix de vente de chaque panier vendu via la plateforme.\n\n- Plan Pro : abonnement mensuel de 29 EUR (vingt-neuf euros), prélevé par prélèvement SEPA. Une commission réduite de 12% est prélevée sur le prix de vente de chaque panier vendu.\n\nLe prix de vente s'entend du prix toutes taxes comprises payé par le Client pour le panier, tel que fixé librement par le Commerce partenaire lors de la publication. La ventilation des taux de TVA applicables aux produits composant le panier relève de la seule responsabilité du Commerce partenaire, vendeur des produits.\n\nTVA non applicable, article 293 B du code général des impôts. En cas d'assujettissement ultérieur de Kshare à la TVA, celle-ci sera facturée en sus des montants indiqués au présent article, après information écrite du Commerce partenaire respectant un préavis de 30 jours.\n\nDes frais de service, égaux à 1,5% du prix du panier majorés de 0,79 EUR, sont facturés au Client en supplément du prix de vente et conservés par Kshare. Ils n'affectent pas le montant versé au Commerce partenaire.\n\nLe Commerce partenaire fixe librement le prix de ses paniers, dans les limites suivantes : prix minimum de 5 EUR, et réduction comprise entre 40% et 70% par rapport à la valeur annoncée des produits.\n\nLe Commerce choisit son plan lors de son inscription. Un changement de plan est possible une fois par an, depuis l'espace commerçant. Le nouveau plan prend effet au début de la période de facturation suivante.\n\nLa commission est automatiquement calculée et prélevée lors de chaque transaction. Le montant net revient au Commerce selon les modalités de l'article 7.",
    },
    {
      title: "Article 6 — Abonnement et paiement",
      content:
        "Le plan Starter est gratuit et ne nécessite aucun moyen de paiement pour l'abonnement.\n\nLe plan Pro est soumis à un abonnement mensuel de 29 EUR, prélevé par prélèvement SEPA. Le Commerce autorise Kshare à effectuer ce prélèvement de manière récurrente. TVA non applicable, article 293 B du code général des impôts.\n\nEn cas de non-paiement de l'abonnement Pro, Kshare se réserve le droit de suspendre l'accès à la plateforme jusqu'à régularisation complète du paiement de l'abonnement en cours.",
    },
    {
      title: "Article 7 — Encaissement et versements",
      content:
        "Le paiement du Client est encaissé par Kshare, via son prestataire de paiement Stripe, pour le compte du Commerce partenaire. Kshare intervient à ce titre comme intermédiaire : elle n'est pas vendeur des produits, qui demeurent la propriété et sous la responsabilité du Commerce partenaire jusqu'à leur remise au Client.\n\nLors de chaque transaction, la commission définie à l'article 5 est prélevée automatiquement, et le solde est reversé sans délai sur le compte de paiement du Commerce partenaire.\n\nLes sommes figurant sur ce compte sont virées vers le compte bancaire renseigné par le Commerce partenaire de manière hebdomadaire, chaque mardi.\n\nLe retrait d'une commande est confirmé par le Client lui-même, depuis l'application, au moment où il récupère son panier auprès du Commerce partenaire. Cette confirmation atteste de la bonne exécution de la commande.\n\nEn cas de litige, de remboursement client ou d'annulation, le montant concerné sera déduit du versement suivant.",
    },
    {
      title: "Article 8 — Durée et résiliation",
      content:
        "Le présent contrat est conclu pour une durée indéterminée à compter de sa signature électronique.\n\nChaque partie peut résilier le contrat à tout moment, sous réserve d'un préavis de 30 jours, notifié par email à l'adresse de l'autre partie.\n\nKshare se réserve le droit de résilier le contrat sans préavis en cas de :\n- Manquement grave aux obligations du présent contrat.\n- Non-respect des normes de casherout ou de la réglementation sanitaire.\n- Fraude ou comportement portant atteinte à l'image de Kshare.\n- Non-paiement de l'abonnement après mise en demeure.",
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
        "Kshare ne saurait être tenu responsable :\n- Des interruptions temporaires de la plateforme pour maintenance ou cas de force majeure.\n- De la qualité des produits proposés par le Commerce.\n- Des litiges entre le Commerce et ses fournisseurs.\n- Des pertes de chiffre d'affaires liées à l'utilisation ou à la non-utilisation de la plateforme.\n\nLa responsabilité de Kshare est limitée au montant des commissions perçues au cours des 12 derniers mois.",
    },
    {
      title: "Article 12 — Droit applicable et juridiction",
      content:
        "Le présent contrat est régi par le droit français.\n\nEn cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut d'accord dans un délai de 30 jours, le litige sera soumis aux tribunaux compétents de Paris.",
    },
  ];
}

// ── Génération du PDF ────────────────────────────────────────────

export function generateContractPdf(params: ContractPdfParams): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const signDate = new Date(params.signedAt);
  const formattedDate = signDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Helper: check page break ──
  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > 270) {
      doc.addPage();
      y = 20;
    }
  }

  // ── Header ──
  y = 20;
  doc.setFillColor(55, 68, 200); // #3744C8
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Kshare", margin, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Contrat de partenariat Commerce", margin, 28);
  y = 45;

  // ── Parties ──
  doc.setTextColor(55, 68, 200);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES PARTIES", margin, y);
  y += 8;

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const parties = [
    "Kshare, exploitant la plateforme accessible à l'adresse k-share.fr,",
    "ci-après dénommé \"Kshare\",",
    "",
    "ET",
    "",
    `${params.commerceName}`,
    `${params.commerceAddress}, ${params.commercePostalCode} ${params.commerceCity}`,
    `Représenté par : ${params.signerName} (${params.signerEmail})`,
    "ci-après dénommé \"le Commerce partenaire\".",
  ];

  for (const line of parties) {
    if (line === "ET") {
      doc.setFont("helvetica", "bold");
      doc.text(line, margin, y);
      doc.setFont("helvetica", "normal");
    } else {
      doc.text(line, margin, y);
    }
    y += line === "" ? 4 : 5.5;
  }

  y += 6;

  // ── Separator ──
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Articles ──
  const articles = getContractArticles();
  for (const article of articles) {
    checkPageBreak(30);

    // Title
    doc.setTextColor(55, 68, 200);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(article.title, margin, y);
    y += 7;

    // Content
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");

    const lines = doc.splitTextToSize(article.content, contentWidth) as string[];
    for (const line of lines) {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 6;
  }

  // ── Signature block ──
  checkPageBreak(50);

  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFillColor(248, 249, 252); // #f8f9fc
  doc.roundedRect(margin, y, contentWidth, 40, 3, 3, "F");

  doc.setTextColor(55, 68, 200);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Signature électronique", margin + 8, y + 10);

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Signé par : ${params.signerName}`, margin + 8, y + 18);
  doc.text(`Email : ${params.signerEmail}`, margin + 8, y + 24);
  doc.text(`Date : ${formattedDate}`, margin + 8, y + 30);
  doc.text(`Adresse IP : ${params.signerIp}`, margin + 8, y + 36);

  // ── Footer on each page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text(
      `Kshare — Contrat de partenariat — Page ${i}/${totalPages}`,
      pageWidth / 2,
      287,
      { align: "center" }
    );
  }

  // ── Return as Buffer ──
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
