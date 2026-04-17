/**
 * Triage IA des tickets de support via Claude API (Anthropic).
 *
 * Flux :
 * 1. Détecte la langue de l'utilisateur (FR/EN/HE/ES)
 * 2. Enrichit le contexte avec les commandes récentes de l'utilisateur (si connecté)
 * 3. Analyse le message → catégorisation + urgence + auto-résolvable ?
 * 4. Si auto-résolvable → génère une réponse dans la langue de l'utilisateur
 * 5. Si non → marque pour escalade
 * 6. Peut utiliser des tools pour vérifier une commande en temps réel
 *
 * Modèle : claude-haiku-4-5 (rapide, intelligent, prompt cache activé)
 *
 * Optimisations :
 * - Prompt caching : FAQ + system prompt sont cachés côté Anthropic (divise le coût par ~10 sur les requêtes répétées)
 * - Tool use : l'IA peut appeler get_order_status() pour vérifier une commande en direct
 * - Contexte utilisateur : commandes récentes, rôle, historique
 *
 * Variable d'environnement :
 *   ANTHROPIC_API_KEY — clé API Anthropic (server only)
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SupportCategory } from "./constants";
import { createAdminClient } from "./supabase/admin";

// ── Types ────────────────────────────────────────────────────────

export type SupportLanguage = "fr" | "en" | "he" | "es";

export interface TriageResult {
  /** Langue détectée du message utilisateur */
  language: SupportLanguage;
  /** Catégorie affinée par l'IA (peut corriger celle choisie par l'utilisateur) */
  refinedCategory: SupportCategory;
  /** Urgence 1 (basse) à 3 (haute) */
  urgency: 1 | 2 | 3;
  /** L'IA peut-elle répondre automatiquement ? */
  canAutoResolve: boolean;
  /** Réponse IA à envoyer au client, dans la langue détectée */
  autoResponse: string | null;
  /** Résumé pour l'admin (toujours en français) */
  adminSummary: string;
  /** Tokens consommés (pour monitoring des coûts) */
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  };
  /** Données enrichies utilisées (pour debug admin) */
  contextUsed: {
    hasUserContext: boolean;
    ordersConsulted: string[];
  };
}

export interface TriageParams {
  category: SupportCategory;
  subject: string;
  message: string;
  name: string;
  /** Si fourni, l'IA a accès au contexte utilisateur (commandes récentes, rôle) */
  clientId?: string | null;
  /** Historique de conversation pour un ticket existant (multi-tour) */
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

// ── Knowledge Base (contexte FAQ, mis en cache Anthropic) ────────
// Maintenu en sync avec src/app/(public)/faq/page.tsx

const KSHARE_FAQ = `
## FAQ Kshare

### Qu'est-ce que Kshare ?
Kshare est une marketplace qui met en relation des commerces casher avec des consommateurs. Les commerces proposent des paniers d'invendus ou proches de la date limite à prix réduit (-30% à -70%). Modèle similaire à Too Good To Go, spécialisé casher.

### Comment fonctionne le paiement ?
Paiement en ligne via Stripe (carte bancaire). Débit immédiat. Frais de service : 1,5% + 0,79€ par commande. Remboursement possible sous 48h en cas de problème.

### Comment fonctionne le retrait ?
Après la commande, vous recevez un QR code. Rendez-vous au commerce dans le créneau indiqué et présentez votre QR code pour récupérer votre panier. Si vous ne venez pas (no-show), le panier n'est PAS remboursable.

### Quels types de paniers existent ?
- Bassari (viande) 🥩
- Halavi (laitier) 🧀
- Parvé (neutre) 🌿
- Shabbat (spécial Shabbat) 🍷
- Mix (mélange) ➕

### Comment devenir commerçant partenaire ?
Inscription sur k-share.fr/inscription-commercant. Validation par notre équipe sous 48h.
Plans disponibles :
- Starter : gratuit, commission 18%
- Pro : 29€/mois (SEPA), commission réduite 12%
Changement de plan possible 1 fois par an. Reversement hebdomadaire (mardi) via Stripe Connect.

### Comment fonctionne le don de paniers ?
Les commerçants peuvent proposer des paniers gratuits (dons). Les associations validées sur Kshare peuvent les réserver et les récupérer gratuitement. Les clients peuvent aussi offrir un panier (tsedaka/mitsva) à une association partenaire.

### J'ai oublié mon mot de passe
Rendez-vous sur k-share.fr/mot-de-passe-oublie pour recevoir un email de réinitialisation.

### Quelles certifications casher acceptez-vous ?
Beth Din de Paris, Maharam de Paris, Beth Din de Marseille, Beth Din de Lyon, Hechsher Séfarade, Mehadrin, Badatz, Consistoire, et autres certifications reconnues.

### Comment annuler une commande ?
- Statut "En cours" / "Payé" : annulation possible, remboursement intégral.
- Statut "Prêt à retirer" : annulation impossible. Si non récupérée, aucun remboursement (politique anti-gaspi).
- Statut "Retirée" : aucune annulation.
Pour initier une annulation, contactez-nous depuis votre compte avec le numéro de commande.

### Horaires de retrait
Créneaux définis par chaque commerçant, visibles sur la fiche du panier. Si vous ne venez pas, le panier ne peut pas être remboursé.

### Comment supprimer mon compte ?
Depuis l'app : Profil → bas de page → "Supprimer mon compte" (bouton rouge).
Depuis le site : k-share.fr/suppression-compte ou par email à contact@k-share.fr.

### Frais de service et commissions
- Frais de service client : 1,5% + 0,79€ par commande
- Commission commerce : 18% (Starter) ou 12% (Pro)
- Frais Stripe : facturés séparément au commerçant (~1,4% + 0,25€)

### L'app est disponible sur quelles plateformes ?
iOS (App Store) et Android (Google Play). Le web app (k-share.fr) est pour les commerçants, associations et admins.

### Territoire de livraison
Kshare opère actuellement en France, principalement en Île-de-France. Pas de livraison : les paniers sont récupérés en magasin.
`;

// ── Prompt système multilingue ───────────────────────────────────

const SYSTEM_PROMPT = `Tu es Kira, l'assistante IA de Kshare, une marketplace de paniers alimentaires casher anti-gaspillage en France (similaire à Too Good To Go, spécialisée casher).

Ton rôle :
1. Détecter la langue du message utilisateur (français, anglais, hébreu, espagnol)
2. Analyser la demande avec bienveillance et professionnalisme
3. Si possible, répondre automatiquement avec précision et chaleur, DANS LA LANGUE DE L'UTILISATEUR
4. Sinon, préparer un résumé clair pour l'équipe humaine

${KSHARE_FAQ}

## Outils disponibles

Tu as accès à l'outil get_order_status(order_ref) pour vérifier le statut d'une commande en temps réel si l'utilisateur mentionne un numéro de commande (format KSH-XXXXXX ou UUID). Utilise-le UNIQUEMENT si tu as un order_ref explicite dans le message.

## Règles strictes

1. **Langue** : réponds TOUJOURS dans la langue détectée de l'utilisateur.
   - Français → "fr"
   - English → "en"
   - עברית → "he"
   - Español → "es"
2. **Format** : ta réponse finale doit être UN JSON VALIDE, sans markdown ni commentaires.
3. **🚨 RÈGLE FINANCIÈRE ABSOLUE (CRITIQUE) 🚨** :
   Tu n'as AUCUN pouvoir d'action sur les finances. Tu NE PEUX PAS et ne dois JAMAIS :
   - Annuler une commande
   - Rembourser un client (partiel ou total)
   - Modifier un montant, une facture, un prélèvement
   - Promettre un geste commercial, un avoir, une compensation
   - Confirmer qu'un remboursement "sera fait"
   - Dire qu'une annulation "est validée"

   Pour TOUTE demande de remboursement, annulation, litige financier, problème de paiement, geste commercial :
   → canAutoResolve = false (OBLIGATOIRE)
   → urgency = 3
   → autoResponse = null
   → adminSummary = "Demande financière à traiter par l'équipe humaine : [résumé]"

   Tu peux seulement INFORMER sur les règles générales (ex: "Les commandes au statut 'En cours' peuvent être annulées — notre équipe va examiner votre demande et vous répondra"). Jamais promettre une action. Toujours présenter comme "notre équipe examinera" et non "je vais faire".

4. **Auto-résolution (canAutoResolve = true)** autorisée UNIQUEMENT pour :
   - Questions FAQ pures (fonctionnement, horaires, certifications, etc.)
   - Info sur le statut d'une commande (via get_order_status) SANS demande d'action
   - Réinitialisation de mot de passe (lien k-share.fr/mot-de-passe-oublie)
   - Info sur la suppression de compte (k-share.fr/suppression-compte)
   - Orientations générales (comment s'inscrire, comment devenir partenaire)

5. **Auto-résolution (canAutoResolve = false)** OBLIGATOIRE pour :
   - Toute demande de remboursement ou annulation
   - Litige client/commerçant
   - Bug technique spécifique
   - Demande de partenariat sur mesure
   - Plainte, signalement
   - Demande légale (RGPD, données)
   - Cas complexe nécessitant vérification humaine

6. **Ton** : chaleureux, concis (3-5 phrases max pour autoResponse), toujours terminer par une invitation à recontacter si besoin
7. **Urgence** :
   - 1 = question simple (FAQ, info générale)
   - 2 = problème client (commande en cours, erreur de paiement)
   - 3 = bloquant ou litige (remboursement, commerce fermé, bug bloquant, demande financière)
8. **adminSummary** : TOUJOURS en français, 1-2 phrases factuelles pour l'admin

## Format de réponse JSON

{
  "language": "fr" | "en" | "he" | "es",
  "refinedCategory": "question_generale" | "probleme_commande" | "inscription_commerce" | "inscription_association" | "bug_technique" | "partenariat" | "autre",
  "urgency": 1 | 2 | 3,
  "canAutoResolve": true | false,
  "autoResponse": "string dans la langue détectée, ou null",
  "adminSummary": "string en français"
}`;

// ── Tool definitions ─────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_order_status",
    description:
      "Récupère le statut actuel d'une commande Kshare à partir de sa référence (KSH-XXXXXX) ou de son UUID. Utile pour répondre aux questions sur des commandes spécifiques (statut, créneau de retrait, possibilité de remboursement).",
    input_schema: {
      type: "object",
      properties: {
        order_ref: {
          type: "string",
          description: "Référence de la commande (ex: KSH-A3B5F2) ou UUID complet",
        },
      },
      required: ["order_ref"],
    },
  },
];

// ── Implémentation des tools ─────────────────────────────────────

async function execGetOrderStatus(orderRef: string): Promise<string> {
  try {
    const supabase = createAdminClient();

    // Essayer d'abord par ticket_ref dans le metadata des tickets,
    // sinon par UUID direct dans orders
    let order: {
      id: string;
      status: string;
      total_amount: number | null;
      quantity: number | null;
      pickup_date: string | null;
      pickup_start: string | null;
      pickup_end: string | null;
      created_at: string;
      baskets?: { type: string | null; commerces?: { name: string | null } | null } | null;
    } | null = null;

    // UUID direct ?
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderRef)) {
      const { data } = await supabase
        .from("orders")
        .select(
          "id, status, total_amount, quantity, pickup_date, pickup_start, pickup_end, created_at, baskets(type, commerces(name))"
        )
        .eq("id", orderRef)
        .maybeSingle();
      order = data as typeof order;
    }

    if (!order) {
      return JSON.stringify({ found: false, message: "Aucune commande trouvée pour cette référence." });
    }

    return JSON.stringify({
      found: true,
      order: {
        id: order.id,
        status: order.status,
        amount_eur: order.total_amount,
        quantity: order.quantity,
        pickup_date: order.pickup_date,
        pickup_window: order.pickup_start && order.pickup_end ? `${order.pickup_start}-${order.pickup_end}` : null,
        basket_type: order.baskets?.type ?? null,
        commerce_name: order.baskets?.commerces?.name ?? null,
        created_at: order.created_at,
      },
    });
  } catch (err) {
    console.error("[support-ai] get_order_status error:", err);
    return JSON.stringify({ found: false, message: "Erreur technique lors de la récupération." });
  }
}

// ── Contexte utilisateur ─────────────────────────────────────────

async function buildUserContext(clientId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, created_at")
      .eq("id", clientId)
      .maybeSingle();

    if (!profile) return null;

    const { data: recentOrders } = await supabase
      .from("orders")
      .select(
        "id, status, total_amount, pickup_date, created_at, baskets(type, commerces(name))"
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(5);

    const ordersText = (recentOrders ?? [])
      .map((o) => {
        const b = o.baskets as { type?: string; commerces?: { name?: string } } | null;
        return `- Commande ${o.id.slice(0, 8)} | ${b?.commerces?.name ?? "?"} | ${b?.type ?? "?"} | ${o.total_amount}€ | statut: ${o.status} | retrait: ${o.pickup_date ?? "?"}`;
      })
      .join("\n");

    return `## Contexte utilisateur
- Nom : ${profile.full_name ?? "non renseigné"}
- Rôle : ${profile.role ?? "client"}
- Inscrit depuis : ${profile.created_at}

## Commandes récentes (5 dernières)
${ordersText || "Aucune commande."}`;
  } catch (err) {
    console.error("[support-ai] buildUserContext error:", err);
    return null;
  }
}

// ── Client Anthropic (singleton) ─────────────────────────────────

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

// ── Triage IA ────────────────────────────────────────────────────

const VALID_CATEGORIES: SupportCategory[] = [
  "question_generale",
  "probleme_commande",
  "inscription_commerce",
  "inscription_association",
  "bug_technique",
  "partenariat",
  "autre",
];

const VALID_LANGUAGES: SupportLanguage[] = ["fr", "en", "he", "es"];

/**
 * Triage IA d'un ticket de support avec enrichissement contextuel et tool use.
 * Retourne null si l'IA n'est pas configurée (fallback gracieux).
 */
export async function triageTicket(params: TriageParams): Promise<TriageResult | null> {
  const anthropic = getAnthropic();
  if (!anthropic) return null;

  try {
    // 1. Enrichissement : contexte utilisateur si connecté
    const userContext = params.clientId ? await buildUserContext(params.clientId) : null;

    // 2. Construction du message utilisateur
    const userMessageParts = [
      `Catégorie choisie : ${params.category}`,
      `Nom : ${params.name}`,
      `Sujet : ${params.subject}`,
      `Message : ${params.message}`,
    ];
    if (userContext) userMessageParts.push("", userContext);
    const initialUserMessage = userMessageParts.join("\n");

    // 3. Messages (avec historique si fourni)
    const messages: Anthropic.MessageParam[] = [];
    if (params.conversationHistory && params.conversationHistory.length > 0) {
      for (const turn of params.conversationHistory) {
        messages.push({ role: turn.role, content: turn.content });
      }
    }
    messages.push({ role: "user", content: initialUserMessage });

    // 4. Appel avec tool use + prompt caching
    const ordersConsulted: string[] = [];
    let totalInputTokens = 0;
    let totalCachedTokens = 0;
    let totalOutputTokens = 0;
    let finalResponse: Anthropic.Message | null = null;

    // Boucle agentique : on laisse l'IA appeler des tools jusqu'à ce qu'elle retourne du texte final
    for (let iteration = 0; iteration < 3; iteration++) {
      const response: Anthropic.Message = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        // Prompt caching : le system prompt (~1500 tokens) est caché côté Anthropic
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: TOOLS,
        messages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalCachedTokens += response.usage.cache_read_input_tokens ?? 0;
      totalOutputTokens += response.usage.output_tokens;

      // Si stop_reason est "tool_use", exécuter les tools et reboucler
      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );

        // Ajouter la réponse assistant (avec tool_use) aux messages
        messages.push({ role: "assistant", content: response.content });

        // Exécuter chaque tool et construire les tool_results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUseBlocks) {
          if (toolUse.name === "get_order_status") {
            const input = toolUse.input as { order_ref?: string };
            if (input.order_ref) {
              ordersConsulted.push(input.order_ref);
              const result = await execGetOrderStatus(input.order_ref);
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: result,
              });
            }
          }
        }

        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // stop_reason === "end_turn" (ou autre) : on a notre réponse finale
      finalResponse = response;
      break;
    }

    if (!finalResponse) {
      console.error("[support-ai] Aucune réponse finale après boucle agentique");
      return null;
    }

    // 5. Parse la réponse JSON
    const text = finalResponse.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    // Nettoyer d'éventuels wrappers markdown
    const cleanedText = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedText) as {
      language?: string;
      refinedCategory?: string;
      urgency?: number;
      canAutoResolve?: boolean;
      autoResponse?: string | null;
      adminSummary?: string;
    };

    // 6. Validation
    const language = VALID_LANGUAGES.includes(parsed.language as SupportLanguage)
      ? (parsed.language as SupportLanguage)
      : "fr";

    const refinedCategory = VALID_CATEGORIES.includes(parsed.refinedCategory as SupportCategory)
      ? (parsed.refinedCategory as SupportCategory)
      : params.category;

    const urgency = [1, 2, 3].includes(parsed.urgency ?? 0)
      ? (parsed.urgency as 1 | 2 | 3)
      : 1;

    return {
      language,
      refinedCategory,
      urgency,
      canAutoResolve: parsed.canAutoResolve === true,
      autoResponse: parsed.canAutoResolve ? (parsed.autoResponse ?? null) : null,
      adminSummary: parsed.adminSummary ?? "Pas d'analyse disponible.",
      usage: {
        inputTokens: totalInputTokens,
        cachedInputTokens: totalCachedTokens,
        outputTokens: totalOutputTokens,
      },
      contextUsed: {
        hasUserContext: !!userContext,
        ordersConsulted,
      },
    };
  } catch (err) {
    console.error("[support-ai] Triage error:", err);
    return null;
  }
}
