/**
 * Génération du contrat de partenariat Kshare au format PDF.
 *
 * Utilise jsPDF (server-side) pour produire un Buffer prêt à être
 * uploadé dans Supabase Storage ou envoyé en pièce jointe via Resend.
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
        "Le present contrat a pour objet de definir les conditions dans lesquelles le Commerce partenaire utilise la plateforme Kshare pour proposer a la vente des paniers alimentaires casher composes de produits invendus ou proches de leur date limite de consommation, dans le but de reduire le gaspillage alimentaire et de rendre l'alimentation casher plus accessible.",
    },
    {
      title: "Article 2 — Definitions",
      content:
        "\"Kshare\" designe la societe exploitant la plateforme accessible a l'adresse k-share.fr et via l'application mobile Kshare.\n\"Commerce partenaire\" designe l'etablissement identifie ci-dessous.\n\"Panier\" designe un lot de produits alimentaires casher propose a la vente via la plateforme.\n\"Client\" designe toute personne physique achetant un Panier via la plateforme.\n\"Commission\" designe le pourcentage preleve par Kshare sur chaque vente.",
    },
    {
      title: "Article 3 — Obligations du Commerce partenaire",
      content:
        "Le Commerce partenaire s'engage a :\n- Proposer uniquement des produits alimentaires conformes aux normes de casherout en vigueur et respectant la reglementation sanitaire applicable.\n- Garantir la fraicheur et la qualite des produits inclus dans les paniers.\n- Respecter les creneaux de retrait indiques lors de la publication des paniers.\n- Preparer les paniers commandes dans les delais impartis.\n- Informer Kshare de toute modification impactant son activite (fermeture, changement d'adresse, perte de certification casher).\n- Ne pas utiliser la plateforme pour vendre des produits non conformes ou perimes.",
    },
    {
      title: "Article 4 — Obligations de Kshare",
      content:
        "Kshare s'engage a :\n- Mettre a disposition une plateforme fonctionnelle et securisee.\n- Assurer le traitement des paiements via un prestataire certifie (Stripe).\n- Reverser au Commerce les sommes dues selon les modalites prevues.\n- Fournir un espace de gestion (tableau de bord) permettant le suivi des ventes et des paniers.\n- Assurer un support technique et commercial dans un delai raisonnable.",
    },
    {
      title: "Article 5 — Plans tarifaires et commission",
      content:
        "La plateforme Kshare propose deux formules d'abonnement au Commerce partenaire :\n\n- Plan Starter (gratuit) : aucun abonnement mensuel. Une commission de 18% (hors taxes) est prelevee sur le prix de vente de chaque panier vendu via la plateforme.\n\n- Plan Pro (29 EUR HT/mois) : abonnement mensuel de 29 EUR (vingt-neuf euros) hors taxes, preleve par prelevement SEPA. Une commission reduite de 12% (hors taxes) est prelevee sur le prix de vente de chaque panier vendu.\n\nLe Commerce choisit son plan lors de son inscription. Un changement de plan est possible une fois par an, depuis l'espace commercant. Le nouveau plan prend effet au debut de la periode de facturation suivante.\n\nLa commission est automatiquement calculee et prelevee lors de chaque transaction. Le montant net (prix de vente moins commission) est reverse au Commerce selon les modalites de l'article 7.",
    },
    {
      title: "Article 6 — Abonnement et paiement",
      content:
        "Le plan Starter est gratuit et ne necessite aucun moyen de paiement pour l'abonnement.\n\nLe plan Pro est soumis a un abonnement mensuel de 29 EUR HT, preleve par prelevement SEPA. Le Commerce autorise Kshare a effectuer ce prelevement de maniere recurrente.\n\nEn cas de non-paiement de l'abonnement Pro, Kshare se reserve le droit de suspendre l'acces a la plateforme jusqu'a regularisation complete du paiement de l'abonnement en cours.",
    },
    {
      title: "Article 7 — Reversements",
      content:
        "Les sommes dues au Commerce partenaire sont reversees de maniere hebdomadaire, chaque mardi, via Stripe Connect sur le compte bancaire renseigne par le Commerce.\n\nLe reversement correspond au montant total des ventes de la semaine precedente, deduction faite de la commission Kshare.\n\nEn cas de litige, remboursement client ou annulation, le montant concerne sera deduit du prochain reversement.",
    },
    {
      title: "Article 8 — Duree et resiliation",
      content:
        "Le present contrat est conclu pour une duree indeterminee a compter de sa signature electronique.\n\nChaque partie peut resilier le contrat a tout moment, sous reserve d'un preavis de 30 jours, notifie par email a l'adresse de l'autre partie.\n\nKshare se reserve le droit de resilier le contrat sans preavis en cas de :\n- Manquement grave aux obligations du present contrat.\n- Non-respect des normes de casherout ou de la reglementation sanitaire.\n- Fraude ou comportement portant atteinte a l'image de Kshare.\n- Non-paiement de l'abonnement apres mise en demeure.",
    },
    {
      title: "Article 9 — Propriete intellectuelle",
      content:
        "Chaque partie conserve la propriete de ses elements de propriete intellectuelle respectifs.\n\nLe Commerce autorise Kshare a utiliser son nom, son logo et ses photos de produits aux fins de promotion sur la plateforme et les supports de communication de Kshare.\n\nLe Commerce s'interdit de reproduire, copier ou utiliser les elements de la plateforme Kshare (logo, design, code) sans autorisation ecrite prealable.",
    },
    {
      title: "Article 10 — Protection des donnees (RGPD)",
      content:
        "Kshare traite les donnees personnelles du Commerce partenaire conformement au Reglement General sur la Protection des Donnees (RGPD) et a la loi Informatique et Libertes.\n\nLes donnees collectees sont utilisees exclusivement pour la gestion de la relation contractuelle, le traitement des paiements et l'amelioration du service.\n\nLe Commerce dispose d'un droit d'acces, de rectification, de suppression et de portabilite de ses donnees. Toute demande peut etre adressee a contact@k-share.fr.\n\nLes donnees des clients finaux sont traitees par Kshare en qualite de responsable de traitement et ne sont pas transmises au Commerce au-dela de ce qui est necessaire a la preparation des commandes.",
    },
    {
      title: "Article 11 — Limitation de responsabilite",
      content:
        "Kshare ne saurait etre tenu responsable :\n- Des interruptions temporaires de la plateforme pour maintenance ou cas de force majeure.\n- De la qualite des produits proposes par le Commerce.\n- Des litiges entre le Commerce et ses fournisseurs.\n- Des pertes de chiffre d'affaires liees a l'utilisation ou a la non-utilisation de la plateforme.\n\nLa responsabilite de Kshare est limitee au montant des commissions percues au cours des 12 derniers mois.",
    },
    {
      title: "Article 12 — Droit applicable et juridiction",
      content:
        "Le present contrat est regi par le droit francais.\n\nEn cas de litige, les parties s'engagent a rechercher une solution amiable. A defaut d'accord dans un delai de 30 jours, le litige sera soumis aux tribunaux competents de Paris.",
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
    "La societe Kshare, exploitant la plateforme accessible a l'adresse k-share.fr,",
    "ci-apres denommee \"Kshare\",",
    "",
    "ET",
    "",
    `${params.commerceName}`,
    `${params.commerceAddress}, ${params.commercePostalCode} ${params.commerceCity}`,
    `Represente par : ${params.signerName} (${params.signerEmail})`,
    "ci-apres denomme \"le Commerce partenaire\".",
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
  doc.text("Signature electronique", margin + 8, y + 10);

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Signe par : ${params.signerName}`, margin + 8, y + 18);
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
