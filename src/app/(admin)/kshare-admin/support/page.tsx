import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SupportTicketList from "./_ticket-list";

const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default async function SupportPage() {
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select(
      "id, category, description, status, created_at, updated_at, messages, commerces(name), profiles!support_tickets_client_id_fkey(full_name, email)"
    )
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false });

  // Tickets résolus par IA (dernier message sender = "ai")
  const { data: aiResolvedTickets } = await supabase
    .from("support_tickets")
    .select(
      "id, category, description, status, created_at, updated_at, messages, commerces(name), profiles!support_tickets_client_id_fkey(full_name, email)"
    )
    .eq("status", "resolved")
    .order("created_at", { ascending: false })
    .limit(50);

  const aiTickets = (aiResolvedTickets ?? []).filter((t) => {
    const msgs = t.messages as unknown as Array<{ sender: string }> | null;
    return msgs?.some((m) => m.sender === "ai");
  });

  const openCount = tickets?.filter((t) => t.status === "open").length ?? 0;
  const inProgressCount = tickets?.filter((t) => t.status === "in_progress").length ?? 0;
  const aiResolvedCount = aiTickets.length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Support tickets</h1>
        <p className="text-muted-foreground mt-1">Gérez les demandes d&apos;assistance</p>
      </div>

      {/* Stats rapides */}
      <div className="flex gap-4 mb-8">
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            {openCount} ouvert{openCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {inProgressCount} en cours
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-950 rounded-lg border border-violet-200 dark:border-violet-800">
          <span className="text-sm">🤖</span>
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
            {aiResolvedCount} résolu{aiResolvedCount !== 1 ? "s" : ""} par IA
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tickets ouverts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!tickets?.length ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm">Aucun ticket ouvert — tout va bien !</p>
            </div>
          ) : (
            <SupportTicketList
              tickets={tickets.map((t) => ({
                id: t.id,
                category: t.category,
                description: t.description,
                status: t.status as "open" | "in_progress" | "resolved",
                createdAt: t.created_at,
                messages: t.messages as unknown as Array<{ role: string; content: string; created_at: string }>,
                commerceName:
                  (t.commerces as { name: string } | null)?.name ?? null,
                clientName:
                  (t.profiles as { full_name: string | null; email: string | null } | null)?.full_name ??
                  (t.profiles as { full_name: string | null; email: string | null } | null)?.email ??
                  null,
              }))}
              statusLabels={TICKET_STATUS_LABELS}
              statusColors={TICKET_STATUS_COLORS}
            />
          )}
        </CardContent>
      </Card>

      {/* Tickets résolus par IA */}
      {aiTickets.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🤖 Résolus par IA
              <Badge variant="secondary" className="text-xs">{aiTickets.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SupportTicketList
              tickets={aiTickets.map((t) => ({
                id: t.id,
                category: t.category,
                description: t.description,
                status: t.status as "open" | "in_progress" | "resolved",
                createdAt: t.created_at,
                messages: t.messages as unknown as Array<{ role: string; content: string; created_at: string }>,
                commerceName:
                  (t.commerces as { name: string } | null)?.name ?? null,
                clientName:
                  (t.profiles as { full_name: string | null; email: string | null } | null)?.full_name ??
                  (t.profiles as { full_name: string | null; email: string | null } | null)?.email ??
                  null,
              }))}
              statusLabels={TICKET_STATUS_LABELS}
              statusColors={TICKET_STATUS_COLORS}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { Badge };
