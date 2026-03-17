/**
 * Génération de la charte d'engagement association Kshare au format PDF.
 */

import { jsPDF } from "jspdf";

export interface CharterPdfParams {
  assoName: string;
  assoAddress: string;
  assoCity: string;
  contactName: string;
  contactEmail: string;
  signedAt: string;
  signerIp: string;
}

function getCharterArticles(): { title: string; content: string }[] {
  return [
    {
      title: "Article 1 — Objet de la charte",
      content:
        "La presente charte definit les engagements reciproques entre l'association partenaire et Kshare dans le cadre de la recuperation de paniers alimentaires casher issus de dons via la plateforme Kshare. L'objectif commun est de lutter contre le gaspillage alimentaire et de rendre l'alimentation casher accessible aux personnes en situation de precarite.",
    },
    {
      title: "Article 2 — Engagements de l'association",
      content:
        "L'association partenaire s'engage a :\n- Recuperer les paniers dons reserves exclusivement pour les distribuer a des beneficiaires dans le besoin.\n- Ne jamais revendre les paniers recus via la plateforme Kshare.\n- Respecter les creneaux de retrait indiques lors de la reservation des paniers.\n- Prevenir le commerce ou Kshare en cas d'impossibilite de retrait au moins 2 heures avant le creneau.\n- Garantir le respect de la chaine du froid et des conditions d'hygiene lors du transport et de la distribution.\n- Utiliser la plateforme de maniere loyale et conforme a son objet social.\n- Informer Kshare de toute modification de ses statuts, de sa dissolution ou de tout changement impactant son activite.",
    },
    {
      title: "Article 3 — Engagements de Kshare",
      content:
        "Kshare s'engage a :\n- Mettre a disposition un espace association fonctionnel et securise.\n- Notifier l'association des paniers dons disponibles dans sa zone geographique.\n- Garantir la gratuite du service pour les associations partenaires.\n- Assurer un support technique et operationnel dans un delai raisonnable.\n- Proteger les donnees de l'association conformement a la reglementation en vigueur.",
    },
    {
      title: "Article 4 — Paniers dons",
      content:
        "Les paniers dons sont offerts par les commerces partenaires ou par les clients via la plateforme Kshare. Ils sont composes de produits alimentaires casher invendus ou proches de leur date limite de consommation.\n\nL'association s'engage a ne pas selectionner les paniers en fonction de leur contenu et a accepter la variabilite des produits proposes.\n\nLes paniers dons sont strictement gratuits. Aucune contrepartie financiere ne peut etre demandee aux beneficiaires finaux.",
    },
    {
      title: "Article 5 — Retrait et logistique",
      content:
        "L'association designe un ou plusieurs referents habilites a effectuer les retraits en magasin.\n\nLors du retrait, le referent doit presenter le QR code de reservation genere par la plateforme.\n\nEn cas d'absences repetees sans prevenir (plus de 3 retraits manques sans annulation prealable), Kshare se reserve le droit de suspendre temporairement l'acces de l'association a la plateforme.",
    },
    {
      title: "Article 6 — Confidentialite et donnees personnelles",
      content:
        "Kshare traite les donnees de l'association conformement au Reglement General sur la Protection des Donnees (RGPD).\n\nLes donnees collectees sont utilisees exclusivement pour la gestion de la relation partenariale et l'amelioration du service.\n\nL'association dispose d'un droit d'acces, de rectification et de suppression de ses donnees. Toute demande peut etre adressee a contact@k-share.fr.\n\nL'association s'engage a ne pas divulguer les coordonnees des commerces partenaires obtenues via la plateforme.",
    },
    {
      title: "Article 7 — Responsabilite",
      content:
        "Kshare ne saurait etre tenu responsable :\n- De la qualite ou de la composition des paniers dons proposes par les commerces.\n- Des interruptions temporaires de la plateforme.\n- Des consequences liees a un retrait non effectue par l'association.\n\nL'association est responsable de la bonne conservation et de la distribution des paniers recus.",
    },
    {
      title: "Article 8 — Duree et resiliation",
      content:
        "La presente charte est conclue pour une duree indeterminee a compter de sa signature electronique.\n\nChaque partie peut y mettre fin a tout moment, par notification ecrite (email), sans preavis.\n\nKshare se reserve le droit de suspendre ou resilier l'acces de l'association en cas de manquement grave a la presente charte, notamment en cas de revente de paniers dons ou d'utilisation frauduleuse de la plateforme.",
    },
    {
      title: "Article 9 — Droit applicable",
      content:
        "La presente charte est regie par le droit francais.\n\nEn cas de litige, les parties s'engagent a rechercher une solution amiable. A defaut, le litige sera soumis aux tribunaux competents de Paris.",
    },
  ];
}

export function generateCharterPdf(params: CharterPdfParams): Buffer {
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

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > 270) {
      doc.addPage();
      y = 20;
    }
  }

  // ── Header ──
  y = 20;
  doc.setFillColor(147, 51, 234); // purple-600
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Kshare", margin, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Charte d'engagement Association", margin, 28);
  y = 45;

  // ── Parties ──
  doc.setTextColor(147, 51, 234);
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
    `${params.assoName}`,
    `${params.assoAddress}, ${params.assoCity}`,
    `Representee par : ${params.contactName} (${params.contactEmail})`,
    "ci-apres denommee \"l'Association partenaire\".",
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
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Articles ──
  const articles = getCharterArticles();
  for (const article of articles) {
    checkPageBreak(30);

    doc.setTextColor(147, 51, 234);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(article.title, margin, y);
    y += 7;

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

  doc.setFillColor(250, 245, 255); // purple-50
  doc.roundedRect(margin, y, contentWidth, 40, 3, 3, "F");

  doc.setTextColor(147, 51, 234);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Signature electronique", margin + 8, y + 10);

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Signe par : ${params.contactName}`, margin + 8, y + 18);
  doc.text(`Email : ${params.contactEmail}`, margin + 8, y + 24);
  doc.text(`Date : ${formattedDate}`, margin + 8, y + 30);
  doc.text(`Adresse IP : ${params.signerIp}`, margin + 8, y + 36);

  // ── Footer ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text(
      `Kshare — Charte d'engagement Association — Page ${i}/${totalPages}`,
      pageWidth / 2,
      287,
      { align: "center" }
    );
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
