"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  // Fetch existing messages from DB (never trust client-provided data)
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("messages")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { success: false, error: "Ticket introuvable." };

  const existingMessages = (ticket.messages ?? []) as Array<Record<string, unknown>>;

  const newMessage = {
    role: "admin",
    author_id: user.id,
    content: content.trim(),
    created_at: new Date().toISOString(),
  };

  const updatedMessages = [...existingMessages, newMessage] as unknown as Json;

  const { error } = await supabase
    .from("support_tickets")
    .update({
      messages: updatedMessages,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    return { success: false, error: "Erreur lors de l'envoi de la réponse." };
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
