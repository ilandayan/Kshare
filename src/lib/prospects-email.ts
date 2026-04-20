/**
 * Templates email pour les prospects commerçants.
 * Basé sur email-demarchage-commerces-v2.html (version raccourcie pour l'envoi auto).
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COMMERCE_TYPE_LABELS: Record<string, string> = {
  boucherie: "Boucherie",
  boulangerie: "Boulangerie / Pâtisserie",
  epicerie: "Épicerie",
  supermarche: "Supermarché",
  restaurant: "Restaurant",
  traiteur: "Traiteur",
  autre: "Autre",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter (gratuit)",
  pro: "Pro (29 €/mois)",
  undecided: "À déterminer",
};

/**
 * Email envoyé au prospect après sa demande d'infos.
 * Plaquette HTML avec avantages, fonctionnement, offres, CTA.
 */
export function buildProspectWelcomeEmail(params: {
  firstName: string;
  companyName: string;
  commerceType: string;
}): { subject: string; html: string } {
  const safeFirstName = escapeHtml(params.firstName);
  const safeCompany = escapeHtml(params.companyName);

  return {
    subject: `${params.firstName}, vos informations Kshare sont prêtes`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kshare - Marketplace casher anti-gaspi</title>
<style>
  body, table, td, p, a, li { margin: 0; padding: 0; }
  body { width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f6fa; color: #1F2937; line-height: 1.6; }
  img { border: 0; outline: none; text-decoration: none; max-width: 100%; }
  @media only screen and (max-width: 480px) {
    .section { padding: 24px 20px !important; }
  }
</style>
</head>
<body>
<center>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f6fa;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e5f0;overflow:hidden;">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#3744C8,#1E2A9E);padding:36px 32px 32px;text-align:center;">
          <h1 style="margin:0 0 14px;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.3px;">
            Kshare
          </h1>
          <div style="width:40px;height:2px;background:rgba(255,255,255,0.3);margin:0 auto 14px;"></div>
          <p style="color:#fff;font-size:16px;margin:0;font-weight:500;letter-spacing:0.3px;">Transformez vos invendus en revenus.</p>
        </td>
      </tr>

      <!-- INTRO -->
      <tr>
        <td class="section" style="padding:32px;">
          <p style="font-size:15px;color:#374151;margin:0 0 14px;line-height:1.7;">Bonjour <strong>${safeFirstName}</strong>,</p>
          <p style="font-size:15px;color:#374151;margin:0 0 14px;line-height:1.7;">Merci pour votre intérêt pour <strong>Kshare</strong> ! Voici toutes les informations pour comprendre comment notre marketplace peut aider <strong>${safeCompany}</strong> à valoriser ses invendus.</p>
          <p style="font-size:15px;color:#374151;margin:0 0 14px;line-height:1.7;">Chaque jour, des produits casher de qualité sont jetés. Avec Kshare, ces produits trouvent preneurs et génèrent du revenu supplémentaire pour votre commerce.</p>
        </td>
      </tr>

      <tr><td><div style="height:1px;background:#e2e5f0;margin:0 32px;"></div></td></tr>

      <!-- BENEFITS -->
      <tr>
        <td class="section" style="padding:32px;">
          <h2 style="font-size:20px;font-weight:700;color:#1F2937;margin:0 0 20px;">Pourquoi rejoindre Kshare ?</h2>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
            <tr>
              <td style="vertical-align:top;width:44px;">
                <div style="width:40px;height:40px;background:#E8EEFF;border-radius:10px;text-align:center;line-height:40px;font-size:20px;">&#128176;</div>
              </td>
              <td style="vertical-align:top;padding-left:14px;">
                <h3 style="font-size:16px;font-weight:600;color:#1F2937;margin:0 0 4px;">Chiffre d'affaires supplémentaire</h3>
                <p style="font-size:14px;color:#6B7280;margin:0;line-height:1.5;">Vos invendus du jour deviennent des paniers vendus. Au lieu de jeter, vous vendez.</p>
              </td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
            <tr>
              <td style="vertical-align:top;width:44px;">
                <div style="width:40px;height:40px;background:#E8EEFF;border-radius:10px;text-align:center;line-height:40px;font-size:20px;">&#128101;</div>
              </td>
              <td style="vertical-align:top;padding-left:14px;">
                <h3 style="font-size:16px;font-weight:600;color:#1F2937;margin:0 0 4px;">Nouveaux clients</h3>
                <p style="font-size:14px;color:#6B7280;margin:0;line-height:1.5;">Des clients qui ne vous connaissaient pas viennent récupérer un panier et découvrent vos produits. Beaucoup reviennent au prix normal.</p>
              </td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
            <tr>
              <td style="vertical-align:top;width:44px;">
                <div style="width:40px;height:40px;background:#E8EEFF;border-radius:10px;text-align:center;line-height:40px;font-size:20px;">&#9201;</div>
              </td>
              <td style="vertical-align:top;padding-left:14px;">
                <h3 style="font-size:16px;font-weight:600;color:#1F2937;margin:0 0 4px;">Simple et rapide</h3>
                <p style="font-size:14px;color:#6B7280;margin:0;line-height:1.5;">Publiez un panier en quelques secondes depuis votre espace commerce. Les clients réservent et paient en ligne.</p>
              </td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:0;">
            <tr>
              <td style="vertical-align:top;width:44px;">
                <div style="width:40px;height:40px;background:#E8EEFF;border-radius:10px;text-align:center;line-height:40px;font-size:20px;">&#128200;</div>
              </td>
              <td style="vertical-align:top;padding-left:14px;">
                <h3 style="font-size:16px;font-weight:600;color:#1F2937;margin:0 0 4px;">Suivi en temps réel</h3>
                <p style="font-size:14px;color:#6B7280;margin:0;line-height:1.5;">Tableau de bord dédié avec vos ventes, taux de réservation, statistiques détaillées.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr><td><div style="height:1px;background:#e2e5f0;margin:0 32px;"></div></td></tr>

      <!-- HOW IT WORKS -->
      <tr>
        <td class="section" style="padding:32px;">
          <h2 style="font-size:20px;font-weight:700;color:#1F2937;margin:0 0 20px;">Comment ça marche ?</h2>
          ${[1, 2, 3, 4, 5].map((n, i) => {
            const steps = [
              "<strong>Inscrivez-vous gratuitement</strong> sur k-share.fr (5 min).",
              "<strong>Publiez vos paniers</strong> : type, prix, créneau de retrait.",
              "<strong>Les clients réservent et paient</strong> directement sur l'app.",
              "<strong>Le client récupère</strong> son panier chez vous avec son QR code.",
              "<strong>Vous êtes payé chaque semaine</strong> sur votre compte bancaire.",
            ];
            return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:${n < 5 ? "14px" : "0"};">
              <tr>
                <td style="vertical-align:top;width:36px;">
                  <div style="width:32px;height:32px;background:#3744C8;color:#fff;border-radius:50%;text-align:center;line-height:32px;font-size:15px;font-weight:700;">${n}</div>
                </td>
                <td style="vertical-align:middle;padding-left:12px;">
                  <p style="font-size:15px;color:#374151;margin:0;">${steps[i]}</p>
                </td>
              </tr>
            </table>`;
          }).join("")}
        </td>
      </tr>

      <tr><td><div style="height:1px;background:#e2e5f0;margin:0 32px;"></div></td></tr>

      <!-- PRICING -->
      <tr>
        <td class="section" style="padding:32px;">
          <h2 style="font-size:20px;font-weight:700;color:#1F2937;margin:0 0 8px;">Nos offres</h2>
          <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.7;">Aucun engagement. Choisissez la formule qui vous convient.</p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              <td style="width:50%;padding-right:6px;vertical-align:top;">
                <div style="background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:20px;text-align:center;">
                  <p style="font-size:13px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 6px;">Starter</p>
                  <p style="font-size:24px;font-weight:800;color:#1F2937;margin:0 0 4px;">Gratuit</p>
                  <p style="font-size:13px;color:#6B7280;margin:0 0 12px;">Aucun abonnement</p>
                  <p style="font-size:14px;font-weight:600;color:#374151;margin:0;">Commission : <strong>18 %</strong></p>
                </div>
              </td>
              <td style="width:50%;padding-left:6px;vertical-align:top;">
                <div style="background:#E8EEFF;border:2px solid #3744C8;border-radius:12px;padding:20px;text-align:center;">
                  <p style="font-size:13px;font-weight:600;color:#3744C8;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 6px;">Pro</p>
                  <p style="font-size:24px;font-weight:800;color:#1F2937;margin:0 0 4px;">29 €/mois</p>
                  <p style="font-size:13px;color:#6B7280;margin:0 0 12px;">Prélèvement SEPA</p>
                  <p style="font-size:14px;font-weight:600;color:#374151;margin:0;">Commission : <strong>12 %</strong></p>
                </div>
              </td>
            </tr>
          </table>
          <p style="font-size:13px;color:#9CA3AF;text-align:center;margin-top:10px;">Reversement hebdomadaire sur votre compte bancaire chaque mardi.</p>
        </td>
      </tr>

      <tr><td><div style="height:1px;background:#e2e5f0;margin:0 32px;"></div></td></tr>

      <!-- SOLIDARITY -->
      <tr>
        <td class="section" style="padding:32px;">
          <div style="background:#f0fdf4;border:1px solid #BBF7D0;border-radius:12px;padding:24px;">
            <h3 style="font-size:17px;font-weight:700;color:#166534;margin:0 0 10px;">&#10084;&#65039; Un engagement solidaire</h3>
            <p style="font-size:14px;color:#15803D;margin:0 0 8px;line-height:1.6;">Au-delà de la vente, Kshare vous permet de <strong>donner vos invendus</strong> à des associations partenaires directement depuis votre espace commerce.</p>
            <p style="font-size:14px;color:#15803D;margin:0;line-height:1.6;">Un geste de <strong>tsedaka</strong> concret, facilité par la technologie : une <strong>mitzvah</strong> au quotidien.</p>
          </div>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="text-align:center;padding:32px;background:#F9FAFB;">
          <h2 style="font-size:20px;font-weight:700;color:#1F2937;margin:0 0 8px;">Prêt à rejoindre Kshare ?</h2>
          <p style="color:#6B7280;font-size:15px;margin:0 0 20px;">L'inscription est gratuite et ne prend que quelques minutes.</p>
          <a href="https://k-share.fr/inscription-commercant" style="display:inline-block;background:linear-gradient(135deg,#3744C8,#1E2A9E);color:#fff !important;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:10px;">Je m'inscris sur Kshare</a>
          <p style="font-size:13px;color:#9CA3AF;margin-top:12px;">Aucun engagement &bull; Inscription en 5 minutes</p>

          <p style="font-size:13px;color:#6B7280;margin:24px 0 0;padding-top:18px;border-top:1px solid #E5E7EB;">
            Des questions ? Répondez simplement à cet email.<br/>
            Ou écrivez-nous à <a href="mailto:contact@k-share.fr" style="color:#3744C8;">contact@k-share.fr</a>
          </p>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:20px 32px;background:linear-gradient(135deg,#3744C8,#1E2A9E);">
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#fff;text-align:center;">Kshare</p>
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.8);text-align:center;">
            Ensemble contre le gaspillage, pour une alimentation casher accessible.<br/>
            <a href="https://k-share.fr" style="color:#fff;text-decoration:none;">k-share.fr</a> &middot; <a href="mailto:contact@k-share.fr" style="color:#fff;text-decoration:none;">contact@k-share.fr</a>
          </p>
          <p style="margin:12px 0 0;font-size:11px;color:rgba(255,255,255,0.5);text-align:center;line-height:1.6;">
            Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données en nous contactant à contact@k-share.fr.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</center>
</body>
</html>`,
  };
}

/**
 * Notification admin : nouveau prospect.
 */
export function buildProspectAdminNotification(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName: string;
  commerceType: string;
  city: string;
  postalCode?: string;
  planInterest: string;
  message?: string;
}): { subject: string; html: string } {
  const s = {
    firstName: escapeHtml(params.firstName),
    lastName: escapeHtml(params.lastName),
    email: escapeHtml(params.email),
    phone: params.phone ? escapeHtml(params.phone) : undefined,
    companyName: escapeHtml(params.companyName),
    commerceTypeLabel: COMMERCE_TYPE_LABELS[params.commerceType] ?? params.commerceType,
    city: escapeHtml(params.city),
    postalCode: params.postalCode ? escapeHtml(params.postalCode) : undefined,
    planLabel: PLAN_LABELS[params.planInterest] ?? params.planInterest,
    message: params.message ? escapeHtml(params.message) : undefined,
  };

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;color:#888;width:140px;vertical-align:top;font-size:13px;">${label}</td>
      <td style="padding:8px 0;color:#333;font-weight:500;font-size:14px;">${value}</td>
    </tr>`;

  return {
    subject: `[Kshare · Prospect] ${s.firstName} ${s.lastName} — ${s.companyName}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3744C8;"></span>
          <span style="font-size:13px;font-weight:700;color:#3744C8;text-transform:uppercase;letter-spacing:0.5px;">
            Nouveau prospect commerçant
          </span>
        </div>

        <h1 style="margin:0 0 4px;color:#111;font-size:22px;">${s.firstName} ${s.lastName}</h1>
        <p style="margin:0 0 20px;color:#666;font-size:15px;">${s.companyName} &middot; ${s.commerceTypeLabel}</p>

        <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
          ${row("Email", `<a href="mailto:${s.email}" style="color:#3744C8;">${s.email}</a>`)}
          ${s.phone ? row("Téléphone", `<a href="tel:${s.phone}" style="color:#3744C8;">${s.phone}</a>`) : ""}
          ${row("Commerce", `${s.companyName} (${s.commerceTypeLabel})`)}
          ${row("Ville", s.postalCode ? `${s.city} (${s.postalCode})` : s.city)}
          ${row("Plan intéressé", s.planLabel)}
        </table>

        ${s.message ? `
        <div style="background:#f8f9fc;border-left:3px solid #3744C8;border-radius:6px;padding:14px 18px;margin:16px 0;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#3744C8;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
          <p style="margin:0;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${s.message}</p>
        </div>
        ` : ""}

        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e5f0;">
          <a href="mailto:${s.email}?subject=Kshare — Bienvenue ${s.firstName}" style="display:inline-block;padding:10px 18px;background:#3744C8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-right:8px;">
            Répondre
          </a>
          <a href="https://k-share.fr/kshare-admin/prospects" style="display:inline-block;padding:10px 18px;background:#fff;color:#3744C8;border:1px solid #3744C8;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Voir dans l'admin
          </a>
        </div>

        <p style="margin-top:24px;font-size:12px;color:#999;">
          Email automatique de plaquette déjà envoyé au prospect.
        </p>
      </div>
    `,
  };
}
