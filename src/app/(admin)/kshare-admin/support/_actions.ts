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
  existingMessages: Array<{ role: string; content: string; created_at: string }>
): Promise<ReplyResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { success: false, error: "Non autorisé." };

  if (!content.trim()) return { success: false, error: "Le message est requis." };

  const { supabase, user } = ctx;

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
