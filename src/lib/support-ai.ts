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
  /** Signaux de risque détectés sur le compte utilisateur */
  riskFlags: string[];
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
    learningsUsed: string[];
  };
}

export interface TriageParams {
  category: SupportCategory;
  subject: string;
  message: string;
  name: string;
  /** Email utilisé pour détecter les patterns même si non connecté */
  email: string;
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

## Signaux de risque (SI présents dans le contexte utilisateur)

Si le contexte utilisateur contient des "⚠️" ou "🚨" (signaux de risque : demandes de remboursement répétées, no-show multiples, compte très récent avec plainte, etc.) :

- canAutoResolve = false OBLIGATOIREMENT
- urgency = 3
- adminSummary DOIT mentionner explicitement les signaux détectés
- autoResponse = null
- L'admin doit traiter manuellement ce cas pour éviter l'abus

Exemples de patterns suspects :
- 3+ demandes de remboursement en 30 jours
- 3+ commandes déjà remboursées
- 3+ no-show
- Compte créé il y a <7 jours + demande de remboursement
- 5+ tickets en 30 jours

## Format de réponse JSON

{
  "language": "fr" | "en" | "he" | "es",
  "refinedCategory": "question_generale" | "probleme_commande" | "inscription_commerce" | "inscription_association" | "bug_technique" | "partenariat" | "autre",
  "urgency": 1 | 2 | 3,
  "canAutoResolve": true | false,
  "autoResponse": "string dans la langue détectée, ou null",
  "adminSummary": "string en français (inclure les signaux de risque si présents)"
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

// ── Learnings (RAG depuis résolutions admin) ─────────────────────

/**
 * Récupère les apprentissages pertinents pour la requête actuelle.
 * Matching simple par catégorie + keywords (pas besoin d'embeddings pour commencer).
 * Retourne les 5 learnings les plus pertinents à injecter dans le prompt.
 */
async function fetchRelevantLearnings(params: {
  category: SupportCategory;
  message: string;
  subject: string;
}): Promise<Array<{ question: string; response: string; language: string; id: string }>> {
  try {
    const supabase = createAdminClient();

    // Extraire les mots-clés significatifs (mots de 4+ lettres, en minuscules)
    const text = `${params.subject} ${params.message}`.toLowerCase();
    const keywords = Array.from(
      new Set(
        text
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 4)
      )
    ).slice(0, 10);

    // 1. Learnings de la même catégorie (priorité)
    const { data: sameCat } = await supabase
      .from("support_ai_learnings")
      .select("id, user_question, admin_response, language, tags, usage_count")
      .eq("category", params.category)
      .eq("active", true)
      .order("usage_count", { ascending: false })
      .limit(5);

    // 2. Learnings qui matchent par tags/keywords (toutes catégories)
    const { data: byKeywords } =
      keywords.length > 0
        ? await supabase
            .from("support_ai_learnings")
            .select("id, user_question, admin_response, language, tags, usage_count")
            .eq("active", true)
            .neq("category", params.category)
            .overlaps("tags", keywords)
            .order("usage_count", { ascending: false })
            .limit(5)
        : { data: [] };

    // Dédupliquer et limiter à 5 au total
    const allLearnings = [...(sameCat ?? []), ...(byKeywords ?? [])];
    const seen = new Set<string>();
    const deduped = allLearnings.filter((l) => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });

    return deduped.slice(0, 5).map((l) => ({
      id: l.id,
      question: l.user_question,
      response: l.admin_response,
      language: l.language,
    }));
  } catch (err) {
    console.error("[support-ai] fetchRelevantLearnings error:", err);
    return [];
  }
}

/**
 * Incrémente le compteur d'usage d'un learning (appelé quand l'IA l'a utilisé).
 */
async function incrementLearningUsage(learningIds: string[]): Promise<void> {
  if (learningIds.length === 0) return;
  try {
    const supabase = createAdminClient();
    for (const id of learningIds) {
      await supabase.rpc("increment_learning_usage", { learning_id: id }).then(
        () => {},
        async () => {
          // Fallback si la RPC n'existe pas : update direct
          const { data } = await supabase
            .from("support_ai_learnings")
            .select("usage_count")
            .eq("id", id)
            .maybeSingle();
          if (data) {
            await supabase
              .from("support_ai_learnings")
              .update({ usage_count: (data.usage_count ?? 0) + 1 })
              .eq("id", id);
          }
        }
      );
    }
  } catch (err) {
    console.error("[support-ai] incrementLearningUsage error:", err);
  }
}

// ── Contexte utilisateur + détection de patterns suspects ────────

async function buildUserContext(clientId: string, currentEmail: string): Promise<{
  text: string;
  riskFlags: string[];
} | null> {
  try {
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, created_at")
      .eq("id", clientId)
      .maybeSingle();

    if (!profile) return null;

    // Commandes récentes
    const { data: recentOrders } = await supabase
      .from("orders")
      .select(
        "id, status, total_amount, pickup_date, created_at, baskets(type, commerces(name))"
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Historique tickets : 90 jours pour remboursement, 30 jours pour activité
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: ticketsLast90d } = await supabase
      .from("support_tickets")
      .select("id, category, description, status, created_at, metadata")
      .or(`client_id.eq.${clientId},metadata->>sender_email.eq.${currentEmail}`)
      .gte("created_at", ninetyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(30);

    // Remboursements passés (tout historique)
    const { data: refundedOrders } = await supabase
      .from("orders")
      .select("id, total_amount, status, created_at")
      .eq("client_id", clientId)
      .eq("status", "refunded");

    // ── Détection des patterns suspects ─────────────────────
    const riskFlags: string[] = [];

    // Règle 1 : 3+ demandes de remboursement en 90 jours
    const refundKeywords = /rembours|refund|annul|cancel|reimburs/i;
    const refundRequests90d = (ticketsLast90d ?? []).filter(
      (t) => refundKeywords.test(t.description) || refundKeywords.test(t.category)
    );
    if (refundRequests90d.length >= 3) {
      riskFlags.push(
        `🚨 ABUS POTENTIEL — Règle franchie : 3+ demandes de remboursement/annulation en 90 jours (${refundRequests90d.length} détectées)`
      );
    } else if (refundRequests90d.length === 2) {
      riskFlags.push(
        `⚠️ À SURVEILLER — Signal faible : 2 demandes de remboursement/annulation en 90 jours (seuil d'alerte : 3)`
      );
    }

    // Règle 2 : 3+ commandes déjà remboursées (signal fort)
    if ((refundedOrders?.length ?? 0) >= 3) {
      riskFlags.push(
        `🚨 SIGNAL FORT — Règle franchie : 3+ commandes déjà remboursées dans l'historique (${refundedOrders?.length} détectées). Ce client a déjà obtenu plusieurs remboursements par le passé.`
      );
    }

    // Règle 3 : compte créé <7 jours + demande de remboursement → suspect
    const accountAgeDays = profile.created_at
      ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    const hasVeryRecentRefundTicket = refundRequests90d.some(
      (t) => new Date(t.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    );
    if (accountAgeDays < 7 && hasVeryRecentRefundTicket) {
      riskFlags.push(
        `⚠️ COMPTE SUSPECT — Règle franchie : compte créé il y a moins de 7 jours (${Math.round(accountAgeDays)} jours) AVEC demande de remboursement/annulation récente. Possible création de compte pour abus.`
      );
    }

    // Règle 4 : 3+ tickets en 30 jours (client très actif)
    const ticketsLast30d = (ticketsLast90d ?? []).filter(
      (t) => new Date(t.created_at).toISOString() >= thirtyDaysAgo
    );
    if (ticketsLast30d.length >= 3) {
      riskFlags.push(
        `⚠️ CLIENT TRÈS ACTIF — Règle franchie : 3+ tickets support en 30 jours (${ticketsLast30d.length} détectés). À vérifier si usage normal ou sollicitations excessives.`
      );
    }

    // Note : pas de règle no-show (politique Kshare = pas de remboursement en cas de no-show).

    // ── Construction du texte de contexte ────────────────────
    const ordersText = (recentOrders ?? [])
      .map((o) => {
        const b = o.baskets as { type?: string; commerces?: { name?: string } } | null;
        return `- Commande ${o.id.slice(0, 8)} | ${b?.commerces?.name ?? "?"} | ${b?.type ?? "?"} | ${o.total_amount}€ | statut: ${o.status} | retrait: ${o.pickup_date ?? "?"}`;
      })
      .join("\n");

    const ticketsText = (ticketsLast90d ?? [])
      .slice(0, 5)
      .map(
        (t) =>
          `- ${new Date(t.created_at).toLocaleDateString("fr-FR")} | ${t.category} | ${t.status} | ${t.description.slice(0, 80)}`
      )
      .join("\n");

    const riskSection = riskFlags.length > 0
      ? `\n## ⚠️ Signaux de risque détectés\n${riskFlags.map((f) => `- ${f}`).join("\n")}\n`
      : "";

    const text = `## Contexte utilisateur
- Nom : ${profile.full_name ?? "non renseigné"}
- Rôle : ${profile.role ?? "client"}
- Inscrit depuis : ${profile.created_at} (${Math.round(accountAgeDays)} jours)
- Commandes totales (10 dernières) : ${recentOrders?.length ?? 0}
- Remboursements historiques : ${refundedOrders?.length ?? 0}
- Tickets support 30j : ${ticketsLast30d.length}
- Tickets support 90j : ${ticketsLast90d?.length ?? 0}
${riskSection}
## Commandes récentes (10 dernières)
${ordersText || "Aucune commande."}

## Tickets récents (90 jours — 5 derniers affichés)
${ticketsText || "Aucun ticket récent."}`;

    return { text, riskFlags };
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
    // 1. Enrichissement : contexte utilisateur + risk flags
    const userContextData = params.clientId
      ? await buildUserContext(params.clientId, params.email)
      : null;
    const riskFlags = userContextData?.riskFlags ?? [];

    // 2. Enrichissement : learnings pertinents (apprentissages admin)
    const learnings = await fetchRelevantLearnings({
      category: params.category,
      message: params.message,
      subject: params.subject,
    });

    const learningsText = learnings.length > 0
      ? `\n## 📚 Résolutions passées similaires (apprises depuis les réponses admin)
Utilise ces cas comme INSPIRATION pour ta réponse si applicable :

${learnings
  .map(
    (l, i) => `### Cas ${i + 1} (langue: ${l.language})
Question utilisateur : "${l.question}"
Réponse admin validée : "${l.response}"`
  )
  .join("\n\n")}

Adapte le ton et la réponse à la question actuelle. Ne copie jamais mot pour mot.`
      : "";

    // 3. Construction du message utilisateur
    const userMessageParts = [
      `Catégorie choisie : ${params.category}`,
      `Nom : ${params.name}`,
      `Email : ${params.email}`,
      `Sujet : ${params.subject}`,
      `Message : ${params.message}`,
    ];
    if (userContextData) userMessageParts.push("", userContextData.text);
    if (learningsText) userMessageParts.push("", learningsText);
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

    // Incrémenter l'usage des learnings utilisés (non-bloquant)
    if (learnings.length > 0 && parsed.canAutoResolve === true) {
      void incrementLearningUsage(learnings.map((l) => l.id));
    }

    return {
      language,
      refinedCategory,
      urgency,
      canAutoResolve: parsed.canAutoResolve === true,
      autoResponse: parsed.canAutoResolve ? (parsed.autoResponse ?? null) : null,
      adminSummary: parsed.adminSummary ?? "Pas d'analyse disponible.",
      riskFlags,
      usage: {
        inputTokens: totalInputTokens,
        cachedInputTokens: totalCachedTokens,
        outputTokens: totalOutputTokens,
      },
      contextUsed: {
        hasUserContext: !!userContextData,
        ordersConsulted,
        learningsUsed: learnings.map((l) => l.id),
      },
    };
  } catch (err) {
    console.error("[support-ai] Triage error:", err);
    return null;
  }
}
