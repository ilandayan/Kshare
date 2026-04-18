/**
 * Resend email client + templates de réponses automatiques.
 *
 * Fournisseur : https://resend.com
 * Domaine expéditeur : k-share.fr (à configurer dans le dashboard Resend)
 *
 * Variables d'environnement :
 *   RESEND_API_KEY — clé API Resend (server only)
 */

import { Resend } from "resend";
import type { SupportCategory } from "./constants";

// ── Client singleton ─────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[resend] RESEND_API_KEY non configurée — emails désactivés.");
    return null;
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// ── HTML sanitization ────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Types ────────────────────────────────────────────────────────

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

interface SendEmailWithAttachmentParams extends SendEmailParams {
  attachments: { filename: string; content: Buffer }[];
}

// ── Envoi générique ──────────────────────────────────────────────

const FROM_ADDRESS = "Kshare <noreply@k-share.fr>";
const ADMIN_EMAIL = "contact@k-share.fr";

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: SendEmailParams): Promise<boolean> {
  const resend = getResend();

  if (!resend) {
    // Fallback : log en dev
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.info("📧 EMAIL (dev fallback)");
    console.info(`To: ${to}`);
    console.info(`Subject: ${subject}`);
    console.info(`Body: ${html.replace(/<[^>]*>/g, "").substring(0, 300)}`);
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      replyTo: replyTo ?? ADMIN_EMAIL,
    });

    if (error) {
      console.error("[resend] Send error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[resend] Unexpected error:", err);
    return false;
  }
}

/**
 * Envoie un email avec pièce(s) jointe(s).
 */
export async function sendEmailWithAttachment({
  to,
  subject,
  html,
  replyTo,
  attachments,
}: SendEmailWithAttachmentParams): Promise<boolean> {
  const resend = getResend();

  if (!resend) {
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.info("📧 EMAIL + PJ (dev fallback)");
    console.info(`To: ${to}`);
    console.info(`Subject: ${subject}`);
    console.info(`Attachments: ${attachments.map((a) => a.filename).join(", ")}`);
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      replyTo: replyTo ?? ADMIN_EMAIL,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) {
      console.error("[resend] Send with attachment error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[resend] Unexpected error:", err);
    return false;
  }
}

/**
 * Notifie l'admin (contact@k-share.fr) d'un nouveau ticket.
 */
export async function notifyAdmin({
  subject,
  html,
  replyTo,
}: Omit<SendEmailParams, "to">): Promise<boolean> {
  return sendEmail({ to: ADMIN_EMAIL, subject, html, replyTo });
}

// ── Wrapper HTML commun ──────────────────────────────────────────

function wrapHtml(content: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f5f6fa;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e2e5f0;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#3744C8,#5B6EF5);padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;display:flex;align-items:center;gap:0;">
        <img src="https://k-share.fr/logo-k-blanc.png" alt="K" width="40" height="40" style="display:inline-block;vertical-align:middle;margin-left:-2px;" />
        <span style="position:relative;left:-5px;top:3px;">share</span>
      </h1>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;background:#f8f9fc;border-top:1px solid #e2e5f0;">
      <p style="margin:0 0 8px;text-align:center;">
        <img src="https://k-share.fr/logo.png" alt="Kshare" width="20" height="20" style="display:inline-block;vertical-align:middle;" />
        <span style="font-size:13px;font-weight:600;color:#3744C8;vertical-align:middle;margin-left:0;">share</span>
      </p>
      <p style="margin:0;font-size:12px;color:#888;text-align:center;">
        Ensemble contre le gaspillage, pour une alimentation casher accessible.<br/>
        <a href="https://k-share.fr" style="color:#3744C8;text-decoration:none;">k-share.fr</a>
        &nbsp;·&nbsp;
        <a href="mailto:contact@k-share.fr" style="color:#3744C8;text-decoration:none;">contact@k-share.fr</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Templates auto-réponse par catégorie ─────────────────────────

const AUTO_RESPONSE_TEMPLATES: Record<
  SupportCategory,
  {
    subject: string;
    body: (name: string, ticketRef: string) => string;
  }
> = {
  question_generale: {
    subject: "Kshare — Nous avons bien reçu votre question",
    body: (name, ref) => `
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${name},</h2>
      <p style="color:#333;line-height:1.7;">
        Merci pour votre message ! Votre demande a bien été enregistrée sous la référence <strong style="color:#3744C8;">${ref}</strong>.
      </p>
      <p style="color:#333;line-height:1.7;">
        Notre équipe vous répondra dans les <strong>24 heures ouvrées</strong>. En attendant, n'hésitez pas à consulter
        notre <a href="https://k-share.fr/faq" style="color:#3744C8;">FAQ</a> qui répond aux questions les plus fréquentes.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `,
  },

  probleme_commande: {
    subject: "Kshare — Votre signalement de commande a été pris en compte",
    body: (name, ref) => `
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${name},</h2>
      <p style="color:#333;line-height:1.7;">
        Nous avons bien reçu votre signalement concernant une commande.
        Référence de suivi : <strong style="color:#3744C8;">${ref}</strong>.
      </p>
      <div style="background:#fff8f0;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#92400e;font-size:14px;">
          ⚡ Notre équipe vérifie votre dossier et revient vers vous sous <strong>12 heures ouvrées</strong>.
          Si un remboursement est nécessaire, il sera traité automatiquement.
        </p>
      </div>
      <p style="color:#333;line-height:1.7;">
        Vous pouvez répondre directement à cet email pour ajouter des informations à votre dossier.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `,
  },

  inscription_commerce: {
    subject: "Kshare — Votre demande d'inscription commerçant est en cours",
    body: (name, ref) => `
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${name},</h2>
      <p style="color:#333;line-height:1.7;">
        Merci pour votre intérêt à rejoindre Kshare en tant que commerçant !
        Votre demande (réf. <strong style="color:#3744C8;">${ref}</strong>) est en cours de traitement.
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#166534;font-size:14px;">
          🕐 Délai de traitement : <strong>48 heures ouvrées</strong>.<br/>
          Vous recevrez un email de confirmation dès que votre compte sera validé.
        </p>
      </div>
      <p style="color:#333;line-height:1.7;">
        Pour rappel, Kshare propose deux formules : <strong>Plan Starter</strong> (gratuit, 18% de commission)
        ou <strong>Plan Pro</strong> (29€/mois, commission réduite à 12%).
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `,
  },

  inscription_association: {
    subject: "Kshare — Votre demande d'inscription association est en cours",
    body: (name, ref) => `
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${name},</h2>
      <p style="color:#333;line-height:1.7;">
        Merci pour votre engagement solidaire ! Votre demande d'inscription en tant qu'association
        a bien été enregistrée (réf. <strong style="color:#3744C8;">${ref}</strong>).
      </p>
      <div style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#6b21a8;font-size:14px;">
          💜 Notre équipe valide votre association sous <strong>48 heures ouvrées</strong>.
          Vous pourrez ensuite réserver des paniers dons directement depuis votre espace.
        </p>
      </div>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `,
  },

  abonnement_facturation: {
    subject: "Kshare — Votre demande concernant votre abonnement",
    body: (name, ref) => `
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${name},</h2>
      <p style="color:#333;line-height:1.7;">
        Nous avons bien reçu votre demande concernant votre abonnement ou votre facturation.
        Référence de suivi : <strong style="color:#3744C8;">${ref}</strong>.
      </p>
      <div style="background:#f0f4ff;border-left:4px solid #3744C8;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#1e3a8a;font-size:14px;">
          💳 Notre service comptabilité traite votre demande sous <strong>24 heures ouvrées</strong>.
          Vous recevrez un email détaillé avec les informations demandées.
        </p>
      </div>
      <p style="color:#333;line-height:1.7;">
        Pour toute question urgente, n'hésitez pas à répondre directement à cet email.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `,
  },

  bug_technique: {
    subject: "Kshare — Votre signalement technique a été enregistré",
    body: (name, ref) => `
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${name},</h2>
      <p style="color:#333;line-height:1.7;">
        Merci de nous avoir signalé ce problème technique.
        Votre signalement (réf. <strong style="color:#3744C8;">${ref}</strong>) a été transmis à notre équipe technique.
      </p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#991b1b;font-size:14px;">
          🔧 Notre équipe technique a été notifiée et traite votre signalement <strong>en priorité</strong>.
          Nous reviendrons vers vous dès que le problème sera résolu.
        </p>
      </div>
      <p style="color:#333;line-height:1.7;">
        Si possible, n'hésitez pas à répondre à cet email avec des captures d'écran
        ou des détails supplémentaires pour nous aider à résoudre le problème plus rapidement.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `,
  },

  partenariat: {
    subject: "Kshare — Votre demande de partenariat",
    body: (name, ref) => `
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${name},</h2>
      <p style="color:#333;line-height:1.7;">
        Merci pour votre intérêt pour un partenariat avec Kshare !
        Votre demande (réf. <strong style="color:#3744C8;">${ref}</strong>) a bien été enregistrée.
      </p>
      <p style="color:#333;line-height:1.7;">
        Notre responsable partenariats étudiera votre proposition et reviendra vers vous
        sous <strong>48 heures ouvrées</strong>.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `,
  },

  autre: {
    subject: "Kshare — Nous avons bien reçu votre message",
    body: (name, ref) => `
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${name},</h2>
      <p style="color:#333;line-height:1.7;">
        Merci pour votre message ! Votre demande a été enregistrée sous la référence <strong style="color:#3744C8;">${ref}</strong>.
      </p>
      <p style="color:#333;line-height:1.7;">
        Notre équipe analysera votre demande et vous répondra dans les <strong>24 à 48 heures ouvrées</strong>.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `,
  },
};

/**
 * Envoie un accusé de réception adapté à la catégorie de la demande.
 */
export function buildAutoResponse(
  category: SupportCategory,
  name: string,
  ticketRef: string
): { subject: string; html: string } {
  const tpl = AUTO_RESPONSE_TEMPLATES[category];
  return {
    subject: tpl.subject,
    html: wrapHtml(tpl.body(escapeHtml(name), escapeHtml(ticketRef))),
  };
}

/**
 * Construit l'email de notification admin pour un nouveau ticket.
 */
export function buildAdminNotification(params: {
  category: SupportCategory;
  categoryLabel: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  ticketRef: string;
  aiSummary?: string;
  aiAutoResolved?: boolean;
  space?: "client" | "pro";
  phone?: string;
  companyName?: string;
  companyType?: "commerce" | "association";
  /** Signaux de risque détectés sur le compte utilisateur (ex: abus, fraude) */
  riskFlags?: string[];
}): { subject: string; html: string } {
  // Sanitize all user-supplied values for HTML injection prevention
  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safeSubject = escapeHtml(params.subject);
  const safeMessage = escapeHtml(params.message);
  const safeTicketRef = escapeHtml(params.ticketRef);
  const safePhone = params.phone ? escapeHtml(params.phone) : undefined;
  const safeCompanyName = params.companyName ? escapeHtml(params.companyName) : undefined;
  const safeAiSummary = params.aiSummary ? escapeHtml(params.aiSummary) : undefined;

  const urgencyColor = params.category === "bug_technique" || params.category === "probleme_commande"
    ? "#ef4444"
    : "#3744C8";

  const isPro = params.space === "pro";
  const spaceLabel = isPro ? "🏪 PRO" : "👤 CLIENT";
  const spaceColor = isPro ? "#3744C8" : "#10b981";

  const aiBlock = safeAiSummary
    ? `
      <div style="background:#f0f4ff;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #c8cef5;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#3744C8;text-transform:uppercase;letter-spacing:0.5px;">
          🤖 Analyse IA
        </p>
        <p style="margin:0;font-size:14px;color:#333;white-space:pre-wrap;">${safeAiSummary}</p>
        ${params.aiAutoResolved ? '<p style="margin:8px 0 0;font-size:12px;color:#22c55e;font-weight:600;">✅ Réponse automatique IA envoyée au client</p>' : '<p style="margin:8px 0 0;font-size:12px;color:#f59e0b;font-weight:600;">⚠️ Escalade nécessaire — réponse manuelle requise</p>'}
      </div>
    `
    : "";

  // Bloc alerte signaux de risque (abus, fraude, patterns suspects)
  const riskBlock = params.riskFlags && params.riskFlags.length > 0
    ? `
      <div style="background:#fef2f2;border-radius:8px;padding:16px;margin:16px 0;border:2px solid #ef4444;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.5px;">
          🚨 Signaux de risque détectés sur ce compte
        </p>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#7f1d1d;line-height:1.8;">
          ${params.riskFlags.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
        </ul>
        <p style="margin:12px 0 0;font-size:12px;color:#991b1b;font-weight:600;font-style:italic;">
          💡 À examiner attentivement avant toute action commerciale (remboursement, avoir, geste).
        </p>
      </div>
    `
    : "";

  // Lignes pro optionnelles
  const proRows = isPro
    ? `
        ${safeCompanyName ? `<tr><td style="padding:8px 0;color:#888;width:120px;vertical-align:top;">${params.companyType === "association" ? "Association" : "Commerce"}</td><td style="padding:8px 0;color:#333;font-weight:600;">${safeCompanyName}</td></tr>` : ""}
      `
    : "";

  const phoneRow = safePhone
    ? `<tr><td style="padding:8px 0;color:#888;width:120px;vertical-align:top;">Téléphone</td><td style="padding:8px 0;color:#333;font-weight:500;">${safePhone}</td></tr>`
    : "";

  const riskPrefix = params.riskFlags && params.riskFlags.length > 0 ? "🚨 " : "";

  return {
    subject: `${riskPrefix}[Support Kshare] ${safeTicketRef} — ${spaceLabel} — ${params.categoryLabel}`,
    html: wrapHtml(`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${urgencyColor};"></span>
        <span style="font-size:13px;font-weight:600;color:${urgencyColor};text-transform:uppercase;letter-spacing:0.5px;">
          ${params.categoryLabel}
        </span>
        <span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;color:#fff;background:${spaceColor};margin-left:8px;">
          ${spaceLabel}
        </span>
        <span style="font-size:13px;color:#888;margin-left:auto;">${safeTicketRef}</span>
      </div>

      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        ${proRows}
        <tr>
          <td style="padding:8px 0;color:#888;width:120px;vertical-align:top;">De</td>
          <td style="padding:8px 0;color:#333;font-weight:500;">${safeName} &lt;${safeEmail}&gt;</td>
        </tr>
        ${phoneRow}
        <tr>
          <td style="padding:8px 0;color:#888;vertical-align:top;">Sujet</td>
          <td style="padding:8px 0;color:#333;font-weight:500;">${safeSubject}</td>
        </tr>
      </table>

      ${riskBlock}

      <div style="background:#f8f9fc;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e2e5f0;">
        <p style="margin:0;font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${safeMessage}</p>
      </div>

      ${aiBlock}

      <a href="mailto:${safeEmail}?subject=Re: ${encodeURIComponent(params.subject)}" style="display:inline-block;padding:10px 20px;background:#3744C8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Répondre au client
      </a>
    `),
  };
}

// ── Templates métier (réexportées depuis l'ancien email.ts) ──────

export function emailCompteValide(
  name: string,
  type: "commerce" | "association",
  passwordLink?: string
): {
  subject: string;
  html: string;
} {
  const espace = type === "commerce" ? "/shop/dashboard" : "/asso/paniers-dons";
  const safeName = escapeHtml(name);

  const ctaBlock = passwordLink
    ? `
      <p style="color:#333;line-height:1.7;">
        Pour commencer, créez votre mot de passe en cliquant sur le bouton ci-dessous :
      </p>
      <a href="${passwordLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:8px 0 16px;">
        🔐 Créer mon mot de passe
      </a>
      <p style="color:#888;font-size:12px;line-height:1.6;">
        Ce lien est valable 24 heures. Si vous ne l'avez pas utilisé à temps, contactez-nous à
        <a href="mailto:contact@k-share.fr" style="color:#3744C8;">contact@k-share.fr</a>.
      </p>
    `
    : `
      <p style="color:#333;line-height:1.7;">Vous pouvez désormais accéder à votre espace :</p>
      <a href="https://k-share.fr${espace}" style="display:inline-block;padding:12px 24px;background:#3744C8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Accéder à mon espace
      </a>
    `;

  return {
    subject: `Kshare — Votre compte ${type} a été validé !`,
    html: wrapHtml(`
      <h2 style="color:#3744C8;margin:0 0 16px;">Bienvenue sur Kshare, ${safeName} !</h2>
      <p style="color:#333;line-height:1.7;">Votre compte <strong>${type}</strong> a été validé par notre équipe. 🎉</p>
      ${ctaBlock}
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `),
  };
}

export function emailCharteSigne(assoName: string): {
  subject: string;
  html: string;
} {
  const safeName = escapeHtml(assoName);
  return {
    subject: "Kshare — Votre charte d'engagement signée",
    html: wrapHtml(`
      <h2 style="color:#9333ea;margin:0 0 16px;">Charte signée avec succès !</h2>
      <p style="color:#333;line-height:1.7;">
        Bonjour ${safeName},
      </p>
      <p style="color:#333;line-height:1.7;">
        Votre charte d'engagement Kshare a bien été signée électroniquement. Vous trouverez en pièce jointe
        une copie de la charte au format PDF pour vos archives.
      </p>
      <div style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#6b21a8;font-size:14px;">
          💜 Votre espace association est maintenant pleinement actif. Vous pouvez commencer à réserver des paniers dons !
        </p>
      </div>
      <a href="https://k-share.fr/asso/paniers-dons" style="display:inline-block;padding:12px 24px;background:#9333ea;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Accéder à mon espace
      </a>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `),
  };
}

export function emailCompteRefuse(name: string, type: "commerce" | "association"): {
  subject: string;
  html: string;
} {
  const safeName = escapeHtml(name);
  return {
    subject: `Kshare — Votre inscription ${type} n'a pas été retenue`,
    html: wrapHtml(`
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${safeName},</h2>
      <p style="color:#333;line-height:1.7;">
        Nous avons examiné votre demande d'inscription en tant que <strong>${type}</strong> et
        nous ne pouvons pas la valider pour le moment.
      </p>
      <p style="color:#333;line-height:1.7;">
        Si vous pensez qu'il s'agit d'une erreur, n'hésitez pas à nous contacter à
        <a href="mailto:contact@k-share.fr" style="color:#3744C8;">contact@k-share.fr</a>.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `),
  };
}

export function emailContratSigne(commerceName: string): {
  subject: string;
  html: string;
} {
  const safeName = escapeHtml(commerceName);
  return {
    subject: "Kshare — Votre contrat de partenariat signé",
    html: wrapHtml(`
      <h2 style="color:#3744C8;margin:0 0 16px;">Contrat signé avec succès !</h2>
      <p style="color:#333;line-height:1.7;">
        Bonjour ${safeName},
      </p>
      <p style="color:#333;line-height:1.7;">
        Votre contrat de partenariat Kshare a bien été signé électroniquement. Vous trouverez en pièce jointe
        une copie du contrat au format PDF pour vos archives.
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#166534;font-size:14px;">
          ✅ Votre espace commerçant est maintenant pleinement actif. Vous pouvez commencer à publier vos paniers !
        </p>
      </div>
      <a href="https://k-share.fr/shop/dashboard" style="display:inline-block;padding:12px 24px;background:#3744C8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Accéder à mon espace
      </a>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `),
  };
}

export function emailPaiementEchoue(
  commerceName: string,
  invoiceAmount: string = "29,00 €"
): {
  subject: string;
  html: string;
} {
  const safeName = escapeHtml(commerceName);
  return {
    subject: "Kshare — Échec du prélèvement de votre abonnement Pro",
    html: wrapHtml(`
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${safeName},</h2>
      <p style="color:#333;line-height:1.7;">
        Nous vous informons que le prélèvement SEPA de <strong>${invoiceAmount} HT</strong>
        correspondant à votre abonnement <strong>Plan Pro</strong> n'a pas pu être effectué.
      </p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#991b1b;font-size:14px;">
          ⚠️ Sans régularisation, votre accès à la plateforme pourra être suspendu
          conformément à l'article 6 de votre contrat de partenariat.
        </p>
      </div>
      <p style="color:#333;line-height:1.7;font-weight:600;">Comment régulariser votre paiement :</p>
      <ol style="color:#333;line-height:2;padding-left:20px;">
        <li>Connectez-vous à votre <a href="https://k-share.fr/shop/parametres" style="color:#3744C8;font-weight:600;">espace commerçant</a></li>
        <li>Rendez-vous dans la section <strong>Paramètres → Abonnement</strong></li>
        <li>Vérifiez que vos informations bancaires (IBAN) sont à jour</li>
        <li>Le prélèvement sera automatiquement retenté dans les prochains jours</li>
      </ol>
      <a href="https://k-share.fr/shop/parametres" style="display:inline-block;padding:12px 24px;background:#3744C8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0 16px;">
        Accéder à mes paramètres
      </a>
      <p style="color:#333;line-height:1.7;">
        Si vous rencontrez des difficultés ou souhaitez changer de formule, contactez-nous à
        <a href="mailto:contact@k-share.fr" style="color:#3744C8;">contact@k-share.fr</a>.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `),
  };
}

export function emailRappelPaiement(
  commerceName: string,
  joursRestants: number = 2
): {
  subject: string;
  html: string;
} {
  const safeName = escapeHtml(commerceName);
  return {
    subject: "Kshare — Rappel : régularisez votre abonnement Pro",
    html: wrapHtml(`
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${safeName},</h2>
      <p style="color:#333;line-height:1.7;">
        Nous vous avons contacté il y a quelques jours concernant l'échec du prélèvement
        de votre abonnement <strong>Plan Pro</strong>.
      </p>
      <p style="color:#333;line-height:1.7;">
        À ce jour, votre paiement n'a toujours pas été régularisé.
      </p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#991b1b;font-size:14px;">
          🚨 <strong>Attention :</strong> sans régularisation dans les <strong>${joursRestants} jour${joursRestants > 1 ? "s" : ""}</strong>,
          votre accès à la plateforme sera automatiquement suspendu conformément à l'article 6
          de votre contrat de partenariat.
        </p>
      </div>
      <p style="color:#333;line-height:1.7;font-weight:600;">Comment régulariser votre paiement :</p>
      <ol style="color:#333;line-height:2;padding-left:20px;">
        <li>Connectez-vous à votre <a href="https://k-share.fr/shop/parametres" style="color:#3744C8;font-weight:600;">espace commerçant</a></li>
        <li>Rendez-vous dans la section <strong>Paramètres → Abonnement</strong></li>
        <li>Vérifiez que vos informations bancaires (IBAN) sont à jour</li>
        <li>Assurez-vous que votre compte dispose des fonds nécessaires</li>
        <li>Le prélèvement sera automatiquement retenté dans les prochains jours</li>
      </ol>
      <a href="https://k-share.fr/shop/parametres" style="display:inline-block;padding:12px 24px;background:#3744C8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0 16px;">
        Régulariser mon abonnement
      </a>
      <p style="color:#333;line-height:1.7;">
        Si vous rencontrez des difficultés ou souhaitez changer de formule, contactez-nous à
        <a href="mailto:contact@k-share.fr" style="color:#3744C8;">contact@k-share.fr</a>.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `),
  };
}

export function emailSuspensionCompte(
  commerceName: string
): {
  subject: string;
  html: string;
} {
  const safeName = escapeHtml(commerceName);
  return {
    subject: "Kshare — Votre accès a été suspendu",
    html: wrapHtml(`
      <h2 style="color:#ef4444;margin:0 0 16px;">Bonjour ${safeName},</h2>
      <p style="color:#333;line-height:1.7;">
        Suite à l'absence de régularisation du paiement de votre abonnement <strong>Plan Pro</strong>,
        votre accès à la plateforme Kshare a été <strong>suspendu</strong> conformément à l'article 6
        de votre contrat de partenariat.
      </p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#991b1b;font-size:14px;">
          🔒 Votre compte est suspendu. Vos paniers ne sont plus visibles sur la plateforme
          et vous ne pouvez plus recevoir de commandes.
        </p>
      </div>
      <p style="color:#333;line-height:1.7;">
        <strong>Votre accès sera rétabli automatiquement dès régularisation de votre paiement.</strong>
      </p>
      <p style="color:#333;line-height:1.7;font-weight:600;">Comment régulariser votre paiement :</p>
      <ol style="color:#333;line-height:2;padding-left:20px;">
        <li>Connectez-vous à votre <a href="https://k-share.fr/shop/parametres" style="color:#3744C8;font-weight:600;">espace commerçant</a></li>
        <li>Rendez-vous dans la section <strong>Paramètres → Abonnement</strong></li>
        <li>Vérifiez que vos informations bancaires (IBAN) sont à jour</li>
        <li>Assurez-vous que votre compte dispose des fonds nécessaires</li>
        <li>Le prélèvement sera automatiquement retenté dans les prochains jours</li>
      </ol>
      <a href="https://k-share.fr/shop/parametres" style="display:inline-block;padding:12px 24px;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0 16px;">
        Régulariser mon abonnement
      </a>
      <p style="color:#333;line-height:1.7;">
        Si vous rencontrez des difficultés ou souhaitez changer de formule, contactez-nous à
        <a href="mailto:contact@k-share.fr" style="color:#3744C8;">contact@k-share.fr</a>.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `),
  };
}

// ── Templates transactionnels client ──────────────────────────────

const BASKET_TYPE_EMOJIS: Record<string, string> = {
  bassari: "\u{1F969}",
  halavi: "\u{1F9C0}",
  parve: "\u{1F33F}",
  shabbat: "\u{1F377}",
  mix: "\u{2795}",
};

const BASKET_TYPE_LABELS: Record<string, string> = {
  bassari: "Bassari (Viande)",
  halavi: "Halavi (Laitier)",
  parve: "Parv\u00e9 (Neutre)",
  shabbat: "Shabbat",
  mix: "Mix",
};

export function emailConfirmationCommande(params: {
  clientName: string;
  commerceName: string;
  basketType: string;
  quantity: number;
  totalAmount: number;
  serviceFeeAmount: number;
  pickupDate: string;
  pickupStart: string;
  pickupEnd: string;
  orderId: string;
}): { subject: string; html: string } {
  const safeName = escapeHtml(params.clientName);
  const safeCommerce = escapeHtml(params.commerceName);
  const emoji = BASKET_TYPE_EMOJIS[params.basketType] ?? "\u{1F4E6}";
  const typeLabel = BASKET_TYPE_LABELS[params.basketType] ?? params.basketType;
  const totalDisplay = params.totalAmount.toFixed(2).replace(".", ",");
  const feeDisplay = params.serviceFeeAmount.toFixed(2).replace(".", ",");
  const grandTotal = (params.totalAmount + params.serviceFeeAmount).toFixed(2).replace(".", ",");

  // Format date: "2026-03-19" → "19 mars 2026"
  const dateObj = new Date(params.pickupDate + "T00:00:00");
  const dateDisplay = dateObj.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    subject: `Kshare \u2014 Votre commande est confirm\u00e9e !`,
    html: wrapHtml(`
      <h2 style="color:#22c55e;margin:0 0 16px;">\u2705 Commande confirm\u00e9e !</h2>
      <p style="color:#333;line-height:1.7;">
        Bonjour ${safeName},
      </p>
      <p style="color:#333;line-height:1.7;">
        Votre commande chez <strong>${safeCommerce}</strong> a bien \u00e9t\u00e9 enregistr\u00e9e et pay\u00e9e.
      </p>

      <div style="background:#f8f9fc;border-radius:12px;padding:20px;margin:16px 0;border:1px solid #e2e5f0;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#888;">Panier</td>
            <td style="padding:8px 0;color:#333;font-weight:600;text-align:right;">${emoji} ${escapeHtml(typeLabel)} \u00d7${params.quantity}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;">Sous-total</td>
            <td style="padding:8px 0;color:#333;text-align:right;">${totalDisplay} \u20ac</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;">Frais de service</td>
            <td style="padding:8px 0;color:#333;text-align:right;">${feeDisplay} \u20ac</td>
          </tr>
          <tr style="border-top:1px solid #e2e5f0;">
            <td style="padding:12px 0 8px;color:#333;font-weight:700;">Total pay\u00e9</td>
            <td style="padding:12px 0 8px;color:#3744C8;font-weight:700;font-size:16px;text-align:right;">${grandTotal} \u20ac</td>
          </tr>
        </table>
      </div>

      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#166534;font-size:14px;">
          \u{1F4C5} <strong>Retrait le ${dateDisplay}</strong><br/>
          \u{1F552} De <strong>${escapeHtml(params.pickupStart)}</strong> \u00e0 <strong>${escapeHtml(params.pickupEnd)}</strong><br/>
          \u{1F3EA} Chez <strong>${safeCommerce}</strong>
        </p>
      </div>

      <p style="color:#333;line-height:1.7;">
        Pr\u00e9sentez votre <strong>QR code</strong> en magasin pour r\u00e9cup\u00e9rer votre panier.
        Vous le trouverez dans l\u2019onglet <strong>\u00ab\u00a0Mes paniers\u00a0\u00bb</strong> de l\u2019application.
      </p>

      <p style="color:#888;font-size:13px;margin-top:24px;">L\u2019\u00e9quipe Kshare</p>
    `),
  };
}

export function emailBienvenue(params: {
  name: string;
  confirmationLink: string;
}): { subject: string; html: string } {
  const safeName = escapeHtml(params.name);
  return {
    subject: "Kshare \u2014 Bienvenue ! Validez votre email",
    html: wrapHtml(`
      <h2 style="color:#3744C8;margin:0 0 16px;">Bienvenue sur Kshare, ${safeName} ! \u{1F389}</h2>
      <p style="color:#333;line-height:1.7;">
        Merci de rejoindre la communaut\u00e9 Kshare ! Pour activer votre compte et commencer
        \u00e0 r\u00e9server des paniers casher anti-gaspi \u00e0 prix r\u00e9duit, validez votre adresse email :
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${params.confirmationLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3744C8,#5B6EF5);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
          \u2709\uFE0F Valider mon email
        </a>
      </div>

      <p style="color:#333;line-height:1.7;">
        <strong>Comment \u00e7a marche ?</strong>
      </p>
      <ol style="color:#333;line-height:2;padding-left:20px;">
        <li>Parcourez les commerces casher autour de vous</li>
        <li>R\u00e9servez un panier surprise \u00e0 prix r\u00e9duit</li>
        <li>R\u00e9cup\u00e9rez-le en magasin avec votre QR code</li>
      </ol>

      <p style="color:#888;font-size:12px;margin-top:24px;line-height:1.6;">
        Ce lien est valable <strong>24 heures</strong>. Si vous n\u2019avez pas demand\u00e9 la cr\u00e9ation
        de ce compte, ignorez simplement cet email.
      </p>

      <p style="color:#888;font-size:13px;margin-top:16px;">L\u2019\u00e9quipe Kshare</p>
    `),
  };
}

export function emailDemandeComplements(
  name: string,
  type: "commerce" | "association",
  message: string
): { subject: string; html: string } {
  const safeName = escapeHtml(name);
  const safeMessage = escapeHtml(message);
  return {
    subject: "Kshare — Compléments d'information requis",
    html: wrapHtml(`
      <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${safeName},</h2>
      <p style="color:#333;line-height:1.7;">
        Pour finaliser la validation de votre compte <strong>${type}</strong>, nous avons besoin d'informations complémentaires :
      </p>
      <div style="background:#f8f9fc;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e2e5f0;">
        <p style="margin:0;white-space:pre-wrap;color:#333;">${safeMessage}</p>
      </div>
      <p style="color:#333;line-height:1.7;">
        Vous pouvez répondre directement à cet email ou nous contacter à
        <a href="mailto:contact@k-share.fr" style="color:#3744C8;">contact@k-share.fr</a>.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">L'équipe Kshare</p>
    `),
  };
}
