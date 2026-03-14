/**
 * Triage IA des tickets de support via Claude API (Anthropic).
 *
 * Flux :
 * 1. Analyse le message → catégorisation affinée + urgence + auto-résolvable ?
 * 2. Si auto-résolvable → génère une réponse utile
 * 3. Si non → marque pour escalade
 *
 * Modèle : claude-3-5-haiku (rapide, pas cher, ~0.001€/requête)
 *
 * Variable d'environnement :
 *   ANTHROPIC_API_KEY — clé API Anthropic (server only)
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SupportCategory } from "./constants";

// ── Types ────────────────────────────────────────────────────────

export interface TriageResult {
  /** Catégorie affinée par l'IA (peut corriger celle choisie par l'utilisateur) */
  refinedCategory: SupportCategory;
  /** Urgence 1 (basse) à 3 (haute) */
  urgency: 1 | 2 | 3;
  /** L'IA peut-elle répondre automatiquement ? */
  canAutoResolve: boolean;
  /** Réponse IA à envoyer au client (si canAutoResolve) */
  autoResponse: string | null;
  /** Résumé pour l'admin (toujours présent) */
  adminSummary: string;
}

// ── Knowledge Base (contexte FAQ injecté dans le prompt) ─────────

const KSHARE_FAQ = `
## FAQ Kshare

### Qu'est-ce que Kshare ?
Kshare est une marketplace qui met en relation des commerces casher avec des consommateurs. Les commerces proposent des paniers d'invendus ou proches de la date limite à prix réduit (-30% à -70%). C'est un modèle similaire à Too Good To Go, spécialisé dans l'alimentation casher.

### Comment fonctionne le paiement ?
Le paiement s'effectue en ligne via Stripe (carte bancaire). Le montant est débité immédiatement. En cas de problème, un remboursement est possible sous 48h.

### Comment fonctionne le retrait ?
Après la commande, vous recevez un QR code. Rendez-vous au commerce dans le créneau indiqué et présentez votre QR code pour récupérer votre panier.

### Quels types de paniers existent ?
- Bassari (viande) 🥩
- Halavi (laitier) 🧀
- Parvé (neutre) 🌿
- Shabbat (spécial Shabbat) 🍷
- Mix (mélange) ➕

### Comment devenir commerçant partenaire ?
Inscrivez-vous sur k-share.fr/inscription-commercant. Notre équipe valide votre compte sous 48h. Deux formules : Plan Starter (gratuit, commission 18%) ou Plan Pro (29€/mois, commission réduite à 12%). Le commerçant choisit son plan lors de l'inscription et peut en changer une fois par an.

### Comment fonctionne le don de paniers ?
Les commerçants peuvent proposer des paniers en don. Les associations validées sur Kshare peuvent les réserver et les récupérer gratuitement.

### J'ai oublié mon mot de passe
Rendez-vous sur k-share.fr/mot-de-passe-oublie pour réinitialiser votre mot de passe. Un email avec un lien sera envoyé.

### Quelles certifications casher acceptez-vous ?
Nous acceptons les commerces certifiés par : Beth Din de Paris, Maharam de Paris, Beth Din de Marseille, Beth Din de Lyon, Hechsher Séfarade, Mehadrin, Badatz, Consistoire, et autres certifications reconnues.

### Comment annuler une commande ?
Si le commerce n'a pas encore préparé votre panier (statut "En cours"), contactez-nous pour une annulation. Les paniers déjà prêts ne peuvent plus être annulés mais peuvent donner lieu à un remboursement si non récupérés.

### Horaires de retrait
Les créneaux de retrait sont définis par chaque commerçant. Consultez la fiche du panier pour voir le créneau disponible. Attention : si vous ne venez pas, le panier ne peut pas être remboursé.
`;

// ── Prompt système ───────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es l'assistant IA de Kshare, une marketplace de paniers alimentaires casher anti-gaspillage (similaire à Too Good To Go, spécialisé casher).

Ton rôle est de trier les demandes de support et, si possible, d'y répondre automatiquement.

${KSHARE_FAQ}

## Règles :
1. Réponds TOUJOURS en JSON valide, sans commentaire ni markdown.
2. Si tu peux répondre avec certitude grâce à la FAQ → canAutoResolve = true + fournis autoResponse en français, bienveillant et professionnel.
3. Si la demande est spécifique (numéro de commande, cas particulier, litige, remboursement spécifique, bug précis, partenariat) → canAutoResolve = false.
4. L'autoResponse doit être concise (3-5 phrases max), utile et se terminer par une invitation à recontacter si besoin.
5. Le adminSummary est un résumé en 1-2 phrases pour l'admin.
6. Urgence : 1 = question simple, 2 = problème client, 3 = bug bloquant ou litige.

## Format de réponse :
{
  "refinedCategory": "question_generale" | "probleme_commande" | "inscription_commerce" | "inscription_association" | "bug_technique" | "partenariat" | "autre",
  "urgency": 1 | 2 | 3,
  "canAutoResolve": true | false,
  "autoResponse": "string ou null",
  "adminSummary": "string"
}`;

// ── Triage IA ────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[support-ai] ANTHROPIC_API_KEY non configurée — triage IA désactivé.");
    return null;
  }
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

/**
 * Triage IA d'un ticket de support.
 * Retourne null si l'IA n'est pas configurée (fallback gracieux).
 */
export async function triageTicket(params: {
  category: SupportCategory;
  subject: string;
  message: string;
  name: string;
}): Promise<TriageResult | null> {
  const anthropic = getAnthropic();
  if (!anthropic) return null;

  try {
    const userMessage = `Catégorie choisie par l'utilisateur : ${params.category}
Nom : ${params.name}
Sujet : ${params.subject}
Message : ${params.message}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extraire le texte de la réponse
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Parser le JSON
    const parsed = JSON.parse(text) as {
      refinedCategory?: string;
      urgency?: number;
      canAutoResolve?: boolean;
      autoResponse?: string | null;
      adminSummary?: string;
    };

    // Valider les champs
    const validCategories: SupportCategory[] = [
      "question_generale",
      "probleme_commande",
      "inscription_commerce",
      "inscription_association",
      "bug_technique",
      "partenariat",
      "autre",
    ];

    const refinedCategory = validCategories.includes(parsed.refinedCategory as SupportCategory)
      ? (parsed.refinedCategory as SupportCategory)
      : params.category;

    const urgency = [1, 2, 3].includes(parsed.urgency ?? 0)
      ? (parsed.urgency as 1 | 2 | 3)
      : 1;

    return {
      refinedCategory,
      urgency,
      canAutoResolve: parsed.canAutoResolve === true,
      autoResponse: parsed.canAutoResolve ? (parsed.autoResponse ?? null) : null,
      adminSummary: parsed.adminSummary ?? "Pas d'analyse disponible.",
    };
  } catch (err) {
    console.error("[support-ai] Triage error:", err);
    return null;
  }
}
