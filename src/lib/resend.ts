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
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
        🧺 Kshare
      </h1>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;background:#f8f9fc;border-top:1px solid #e2e5f0;">
      <p style="margin:0;font-size:12px;color:#888;text-align:center;">
        Kshare — Ensemble contre le gaspillage, pour une alimentation casher accessible.<br/>
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
        Pour rappel, les <strong>50 premiers commerçants</strong> bénéficient de
        <strong>3 mois d'abonnement offerts</strong> et d'un taux de commission réduit à 10%.
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

  // Lignes pro optionnelles
  const proRows = isPro
    ? `
        ${safeCompanyName ? `<tr><td style="padding:8px 0;color:#888;width:120px;vertical-align:top;">${params.companyType === "association" ? "Association" : "Commerce"}</td><td style="padding:8px 0;color:#333;font-weight:600;">${safeCompanyName}</td></tr>` : ""}
      `
    : "";

  const phoneRow = safePhone
    ? `<tr><td style="padding:8px 0;color:#888;width:120px;vertical-align:top;">Téléphone</td><td style="padding:8px 0;color:#333;font-weight:500;">${safePhone}</td></tr>`
    : "";

  return {
    subject: `[Support Kshare] ${safeTicketRef} — ${spaceLabel} — ${params.categoryLabel}`,
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

export function emailCompteValide(name: string, type: "commerce" | "association"): {
  subject: string;
  html: string;
} {
  const espace = type === "commerce" ? "/shop/dashboard" : "/asso/paniers-dons";
  const safeName = escapeHtml(name);
  return {
    subject: `Kshare — Votre compte ${type} a été validé !`,
    html: wrapHtml(`
      <h2 style="color:#3744C8;margin:0 0 16px;">Bienvenue sur Kshare, ${safeName} !</h2>
      <p style="color:#333;line-height:1.7;">Votre compte <strong>${type}</strong> a été validé par notre équipe.</p>
      <p style="color:#333;line-height:1.7;">Vous pouvez désormais accéder à votre espace :</p>
      <a href="https://k-share.fr${espace}" style="display:inline-block;padding:12px 24px;background:#3744C8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
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
