import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPORT_CATEGORIES, type SupportCategory } from "@/lib/constants";
import {
  sendEmail,
  notifyAdmin,
  buildAutoResponse,
  buildAdminNotification,
} from "@/lib/resend";
import { triageTicket } from "@/lib/support-ai";
import { checkRateLimit, getClientIp, PUBLIC_RATE_LIMIT } from "@/lib/rate-limit";

/**
 * POST /api/contact
 *
 * Flux complet :
 * 1. Valide les champs + catégorie (distincts client / pro)
 * 2. Génère une référence ticket (KSH-XXXXXX)
 * 3. Stocke le ticket dans Supabase
 * 4. Lance le triage IA (Claude Haiku) en parallèle
 * 5. Envoie l'accusé de réception adapté à l'expéditeur
 * 6. Si l'IA peut auto-résoudre → envoie aussi la réponse IA
 * 7. Notifie contact@k-share.fr avec le détail + analyse IA
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — 10 requests/minute per IP
    const ip = getClientIp(request);
    const { allowed, remaining, resetAt } = checkRateLimit(`contact:${ip}`, PUBLIC_RATE_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer dans quelques instants." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
    const body = (await request.json()) as {
      space?: string;
      firstName?: string;
      lastName?: string;
      name?: string;
      email?: string;
      phone?: string;
      companyName?: string;
      companyType?: string;
      subject?: string;
      message?: string;
      category?: string;
    };

    const {
      space,
      firstName,
      lastName,
      email,
      phone,
      companyName,
      companyType,
      subject,
      message,
      category,
    } = body;

    // Construire le nom complet depuis les champs séparés
    const name =
      body.name ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      "";

    // ── Validation ──────────────────────────────────────────────

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: "Le nom et le prénom sont requis." },
        { status: 400 }
      );
    }

    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: "Email, sujet et message sont requis." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Adresse email invalide." },
        { status: 400 }
      );
    }

    // Validation pro spécifique
    const isPro = space === "commerce" || space === "association";
    if (isPro && !companyName?.trim()) {
      return NextResponse.json(
        { error: space === "association"
            ? "Le nom de l'association est requis."
            : "Le nom du commerce est requis." },
        { status: 400 }
      );
    }

    // Valider la catégorie (fallback "autre")
    const validCategories = SUPPORT_CATEGORIES.map((c) => c.value);
    const safeCategory: SupportCategory = validCategories.includes(
      category as SupportCategory
    )
      ? (category as SupportCategory)
      : "autre";

    const categoryLabel =
      SUPPORT_CATEGORIES.find((c) => c.value === safeCategory)?.label ?? "Autre";

    // ── Référence ticket ────────────────────────────────────────

    const ticketRef = `KSH-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    // ── Stockage Supabase ───────────────────────────────────────

    const supabase = createAdminClient();

    const initialMessages = [
      {
        sender: "user",
        name,
        email,
        text: message,
        date: new Date().toISOString(),
      },
    ];

    // ── Lookup client_id par email (si utilisateur connu) ───────

    let clientId: string | null = null;
    {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (profile?.id) clientId = profile.id;
    }

    const { error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        client_id: clientId,
        category: safeCategory,
        description: `[${categoryLabel}] ${subject} — ${ticketRef}`,
        status: "open",
        metadata: {
          ticket_ref: ticketRef,
          space: space ?? "client",
          sender_first_name: firstName?.trim(),
          sender_last_name: lastName?.trim(),
          sender_name: name,
          sender_email: email,
          sender_phone: phone?.trim() || undefined,
          company_name: isPro ? companyName?.trim() : undefined,
          company_type: isPro ? companyType : undefined,
          original_subject: subject,
        },
        messages: initialMessages,
      });

    if (insertError) {
      console.error("[contact] Insert error:", insertError.message);
    }

    // ── Triage IA (non-bloquant, en parallèle avec l'accusé) ───

    const triagePromise = triageTicket({
      category: safeCategory,
      subject,
      message,
      name,
      email,
      clientId,
    });

    // ── Accusé de réception adapté → expéditeur ─────────────────

    const displayName = firstName?.trim() || name;
    const autoResp = buildAutoResponse(safeCategory, displayName, ticketRef);
    const ackPromise = sendEmail({
      to: email,
      subject: autoResp.subject,
      html: autoResp.html,
    });

    // ── Attendre les deux en parallèle ──────────────────────────

    const [triage] = await Promise.all([triagePromise, ackPromise]);

    // ── Si l'IA peut auto-résoudre → envoyer la réponse IA ─────

    let aiAutoResolved = false;

    if (triage?.canAutoResolve && triage.autoResponse) {
      aiAutoResolved = true;

      // Sanitize user-supplied values before HTML interpolation
      const safeDisplayName = displayName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeAutoResponse = triage.autoResponse.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const aiResponseHtml = `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#3744C8;margin:0 0 16px;">Bonjour ${safeDisplayName},</h2>
          <p style="color:#333;line-height:1.7;">${safeAutoResponse}</p>
          <p style="color:#333;line-height:1.7;margin-top:16px;">
            Si cette réponse ne répond pas entièrement à votre question, n'hésitez pas à répondre
            à cet email et un membre de notre équipe prendra le relais.
          </p>
          <p style="color:#888;font-size:13px;margin-top:24px;">
            🤖 Réponse assistée par IA — Réf. ${ticketRef}<br/>
            L'équipe Kshare
          </p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: `Re: ${autoResp.subject}`,
        html: aiResponseHtml,
      });

      // Mettre à jour le ticket en base avec la réponse IA + statut + metrics
      if (!insertError) {
        await supabase
          .from("support_tickets")
          .update({
            status: "resolved" as const,
            messages: [
              ...initialMessages,
              {
                sender: "ai",
                name: "Kira (IA Kshare)",
                text: triage.autoResponse,
                date: new Date().toISOString(),
              },
            ],
            metadata: {
              ticket_ref: ticketRef,
              space: space ?? "client",
              sender_first_name: firstName?.trim(),
              sender_last_name: lastName?.trim(),
              sender_name: name,
              sender_email: email,
              sender_phone: phone?.trim() || undefined,
              company_name: isPro ? companyName?.trim() : undefined,
              company_type: isPro ? companyType : undefined,
              original_subject: subject,
              // Métriques IA
              ai_auto_resolved: true,
              ai_language: triage.language,
              ai_refined_category: triage.refinedCategory,
              ai_urgency: triage.urgency,
              ai_tokens_input: triage.usage.inputTokens,
              ai_tokens_cached: triage.usage.cachedInputTokens,
              ai_tokens_output: triage.usage.outputTokens,
              ai_orders_consulted: triage.contextUsed.ordersConsulted,
              ai_had_user_context: triage.contextUsed.hasUserContext,
              ai_learnings_used: triage.contextUsed.learningsUsed,
              ai_risk_flags: triage.riskFlags,
            },
          })
          .like("description", `%${ticketRef}%`);
      }
    } else if (triage && !insertError) {
      // Même si non auto-résolu, on stocke les métriques IA pour analyse
      await supabase
        .from("support_tickets")
        .update({
          metadata: {
            ticket_ref: ticketRef,
            space: space ?? "client",
            sender_first_name: firstName?.trim(),
            sender_last_name: lastName?.trim(),
            sender_name: name,
            sender_email: email,
            sender_phone: phone?.trim() || undefined,
            company_name: isPro ? companyName?.trim() : undefined,
            company_type: isPro ? companyType : undefined,
            original_subject: subject,
            ai_auto_resolved: false,
            ai_language: triage.language,
            ai_refined_category: triage.refinedCategory,
            ai_urgency: triage.urgency,
            ai_admin_summary: triage.adminSummary,
            ai_tokens_input: triage.usage.inputTokens,
            ai_tokens_cached: triage.usage.cachedInputTokens,
            ai_tokens_output: triage.usage.outputTokens,
            ai_orders_consulted: triage.contextUsed.ordersConsulted,
            ai_had_user_context: triage.contextUsed.hasUserContext,
          },
        })
        .like("description", `%${ticketRef}%`);
    }

    // ── Notification admin → contact@k-share.fr ─────────────────

    const adminNotif = buildAdminNotification({
      category: triage?.refinedCategory ?? safeCategory,
      categoryLabel,
      name,
      email,
      subject,
      message,
      ticketRef,
      aiSummary: triage?.adminSummary,
      aiAutoResolved,
      space: isPro ? "pro" : "client",
      phone: phone?.trim(),
      companyName: isPro ? companyName?.trim() : undefined,
      companyType: isPro ? (space as "commerce" | "association") : undefined,
      riskFlags: triage?.riskFlags ?? [],
    });

    await notifyAdmin({
      subject: adminNotif.subject,
      html: adminNotif.html,
      replyTo: email,
    });

    // ── Réponse API ─────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      ticketRef,
      aiAutoResolved,
    });
  } catch (err) {
    console.error("[contact] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur serveur. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
