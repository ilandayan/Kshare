"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, buildAdminReplyEmail } from "@/lib/resend";
import type { Database } from "@/types/database.types";

type Json = Database["public"]["Tables"]["support_tickets"]["Row"]["messages"];

export type ReplyResult =
  | { success: true }
  | { success: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return { supabase, user };
}

export async function replyToTicket(
  ticketId: string,
  content: string,
  _existingMessages?: Array<{ role: string; content: string; created_at: string }>
): Promise<ReplyResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  if (!content.trim()) return { success: false, error: "Le message est requis." };

  const { supabase, user } = ctx;

  // Fetch le ticket complet pour récupérer les infos destinataire
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, messages, metadata, description")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { success: false, error: "Ticket introuvable." };

  const existingMessages = (ticket.messages ?? []) as Array<Record<string, unknown>>;

  const trimmedContent = content.trim();
  const now = new Date().toISOString();

  const newMessage = {
    role: "admin",
    sender: "admin",
    name: "Équipe Kshare",
    author_id: user.id,
    content: trimmedContent,
    text: trimmedContent,
    created_at: now,
    date: now,
  };

  const updatedMessages = [...existingMessages, newMessage] as unknown as Json;

  const { error } = await supabase
    .from("support_tickets")
    .update({
      messages: updatedMessages,
      status: "in_progress",
      updated_at: now,
    })
    .eq("id", ticketId);

  if (error) {
    return { success: false, error: "Erreur lors de l'envoi de la réponse." };
  }

  // ── Envoyer un email au client avec la réponse admin ──
  try {
    const meta = (ticket.metadata ?? {}) as {
      ticket_ref?: string;
      sender_email?: string;
      sender_first_name?: string;
      sender_name?: string;
      original_subject?: string;
    };

    const clientEmail = meta.sender_email;
    const ticketRef = meta.ticket_ref ?? `#${ticket.id.slice(0, 8).toUpperCase()}`;

    if (clientEmail) {
      const clientName = meta.sender_first_name || meta.sender_name || "Bonjour";
      const email = buildAdminReplyEmail({
        clientName,
        adminMessage: trimmedContent,
        ticketRef,
        originalSubject: meta.original_subject,
      });

      await sendEmail({
        to: clientEmail,
        subject: email.subject,
        html: email.html,
        replyTo: "contact@k-share.fr",
      });
    }
  } catch (emailErr) {
    // Non-bloquant : on ne veut pas faire échouer la réponse si l'email plante
    console.error("[support] Admin reply email failed:", emailErr);
  }

  revalidatePath("/kshare-admin/support");
  return { success: true };
}

export type TeachResult =
  | { success: true; learningId: string }
  | { success: false; error: string };

/**
 * Ajoute une Q/R aux apprentissages de Kira (IA support).
 * Kira consultera ces cas pour améliorer ses futures réponses.
 */
export async function teachKira(params: {
  ticketId: string;
  userQuestion: string;
  adminResponse: string;
  category: string;
  language?: "fr" | "en" | "he" | "es";
  tags?: string[];
}): Promise<TeachResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  if (!params.userQuestion.trim() || !params.adminResponse.trim()) {
    return { success: false, error: "Question et réponse requises." };
  }

  const { supabase, user } = ctx;

  // Extraire tags automatiquement depuis la question (mots-clés 4+ lettres)
  const autoTags = Array.from(
    new Set(
      params.userQuestion
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4)
    )
  ).slice(0, 10);

  const tags = Array.from(new Set([...(params.tags ?? []), ...autoTags])).slice(0, 15);

  const { data, error } = await supabase
    .from("support_ai_learnings")
    .insert({
      source_ticket_id: params.ticketId,
      category: params.category,
      language: params.language ?? "fr",
      user_question: params.userQuestion.trim(),
      admin_response: params.adminResponse.trim(),
      tags,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Erreur lors de l'ajout de l'apprentissage." };
  }

  revalidatePath("/kshare-admin/support");
  revalidatePath("/kshare-admin/support/learnings");
  return { success: true, learningId: data.id };
}

export async function deleteLearning(learningId: string): Promise<ReplyResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;
  const { error } = await supabase
    .from("support_ai_learnings")
    .delete()
    .eq("id", learningId);

  if (error) return { success: false, error: "Erreur lors de la suppression." };

  revalidatePath("/kshare-admin/support/learnings");
  return { success: true };
}

export async function toggleLearningActive(
  learningId: string,
  active: boolean
): Promise<ReplyResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase } = ctx;
  const { error } = await supabase
    .from("support_ai_learnings")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", learningId);

  if (error) return { success: false, error: "Erreur lors de la mise à jour." };

  revalidatePath("/kshare-admin/support/learnings");
  return { success: true };
}

export async function resolveTicket(ticketId: string): Promise<ReplyResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", ticketId);

  if (error) {
    return { success: false, error: "Erreur lors de la résolution du ticket." };
  }

  revalidatePath("/kshare-admin/support");
  return { success: true };
}
