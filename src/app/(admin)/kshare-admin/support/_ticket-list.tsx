"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { replyToTicket, resolveTicket, teachKira } from "./_actions";
import { Brain } from "lucide-react";

type TicketMessage = {
  role: string;
  sender?: string;
  content: string;
  created_at: string;
};

type Ticket = {
  id: string;
  category: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  messages: TicketMessage[];
  commerceName: string | null;
  clientName: string | null;
  riskFlags?: string[];
  aiSummary?: string;
  aiAutoResolved?: boolean;
};

interface SupportTicketListProps {
  tickets: Ticket[];
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
}

export default function SupportTicketList({
  tickets,
  statusLabels,
  statusColors,
}: SupportTicketListProps) {
  const router = useRouter();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [teaching, setTeaching] = useState(false);

  async function handleReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setSending(true);
    try {
      const result = await replyToTicket(
        selectedTicket.id,
        replyText,
        selectedTicket.messages ?? []
      );
      if (result.success) {
        toast.success("Réponse envoyée.");
        setReplyText("");
        router.refresh();
        setSelectedTicket(null);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setSending(false);
    }
  }

  async function handleTeachKira() {
    if (!selectedTicket || !replyText.trim()) {
      toast.error("Rédige d'abord ta réponse, elle servira d'exemple à Kira.");
      return;
    }
    setTeaching(true);
    try {
      const result = await teachKira({
        ticketId: selectedTicket.id,
        userQuestion: selectedTicket.description,
        adminResponse: replyText.trim(),
        category: selectedTicket.category,
      });
      if (result.success) {
        toast.success("🧠 Kira a appris ce cas ! Elle l'utilisera pour les futures demandes similaires.");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setTeaching(false);
    }
  }

  async function handleResolve() {
    if (!selectedTicket) return;
    setResolving(true);
    try {
      const result = await resolveTicket(selectedTicket.id);
      if (result.success) {
        toast.success("Ticket marqué comme résolu.");
        setSelectedTicket(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">ID</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Émetteur</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Catégorie</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => setSelectedTicket(ticket)}
            >
              <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                #{ticket.id.slice(0, 8)}
              </td>
              <td className="py-3 px-4">
                <div className="font-medium text-foreground">
                  {ticket.commerceName ?? ticket.clientName ?? "—"}
                </div>
              </td>
              <td className="py-3 px-4 text-muted-foreground">{ticket.category}</td>
              <td className="py-3 px-4 text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleDateString("fr-FR")}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status] ?? ""}`}
                >
                  {statusLabels[ticket.status] ?? ticket.status}
                </span>
                {ticket.status === "resolved" && ticket.messages?.some((m) => m.sender === "ai") && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200">
                    🤖 IA
                  </span>
                )}
              </td>
              <td className="py-3 px-4">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Voir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Dialog ticket */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) { setSelectedTicket(null); setReplyText(""); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-4 flex-wrap">
                  <span>Ticket #{selectedTicket.id.slice(0, 8)}</span>
                  <Badge variant="outline">{selectedTicket.category}</Badge>
                </DialogTitle>
              </DialogHeader>

              {/* Description initiale */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* ── Bloc risk flags (si présents) ── */}
                {selectedTicket.riskFlags && selectedTicket.riskFlags.length > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-lg">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400 mb-2">
                      🚨 Signaux de risque détectés sur ce compte
                    </p>
                    <ul className="space-y-1 text-sm text-red-900 dark:text-red-200">
                      {selectedTicket.riskFlags.map((flag, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span>•</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs italic text-red-700 dark:text-red-300">
                      💡 À examiner attentivement avant toute action commerciale (remboursement, avoir, geste).
                    </p>
                  </div>
                )}

                {/* ── Analyse IA (résumé admin) ── */}
                {selectedTicket.aiSummary && (
                  <div className="p-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-lg text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400 mb-1">
                      🤖 Analyse de Kira
                    </p>
                    <p className="text-violet-900 dark:text-violet-200 whitespace-pre-wrap">
                      {selectedTicket.aiSummary}
                    </p>
                    {selectedTicket.aiAutoResolved && (
                      <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        ✅ Kira a déjà répondu automatiquement au client
                      </p>
                    )}
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg text-sm">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    {selectedTicket.commerceName ?? selectedTicket.clientName ?? "Utilisateur"} •{" "}
                    {new Date(selectedTicket.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="text-foreground leading-relaxed">{selectedTicket.description}</p>
                </div>

                {/* Messages du fil */}
                {(selectedTicket.messages ?? []).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      {selectedTicket.messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg text-sm ${
                            msg.role === "admin"
                              ? "bg-primary/10 border border-primary/20 ml-8"
                              : "bg-muted/50 mr-8"
                          }`}
                        >
                          <p className="text-xs text-muted-foreground mb-1 font-medium">
                            {msg.role === "admin" ? "Équipe Kshare" : "Utilisateur"} •{" "}
                            {new Date(msg.created_at).toLocaleDateString("fr-FR")}
                          </p>
                          <p className="leading-relaxed">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Separator />

                {/* Formulaire de réponse */}
                <div className="space-y-3">
                  <Label htmlFor="replyText">Répondre</Label>
                  <Textarea
                    id="replyText"
                    rows={4}
                    placeholder="Votre réponse..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={handleReply}
                      disabled={sending || !replyText.trim()}
                      className="flex-1"
                    >
                      {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Envoyer la réponse
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleTeachKira}
                      disabled={teaching || !replyText.trim()}
                      className="gap-2"
                      title="Ajouter ce cas aux apprentissages de Kira"
                    >
                      {teaching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4 text-violet-500" />
                      )}
                      Enseigner à Kira
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleResolve}
                      disabled={resolving}
                      className="gap-2"
                    >
                      {resolving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      Résoudre
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
