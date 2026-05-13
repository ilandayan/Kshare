import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Rocket } from "lucide-react";
import LaunchControls from "./LaunchControls";

export default async function LancementPage() {
  const supabase = await createClient();
  const { data: config } = await supabase
    .from("platform_config")
    .select("launched, launch_date, launched_at, launched_by, emails_sent_j7, emails_sent_j1, emails_sent_j0")
    .eq("id", true)
    .maybeSingle();

  const [{ count: commercesCount }, { count: clientsCount }] = await Promise.all([
    supabase
      .from("commerces")
      .select("id", { count: "exact", head: true })
      .eq("status", "validated")
      .not("email", "ilike", "%@kshare.fr"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "client")
      .not("email", "ilike", "%@kshare.fr"),
  ]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="rounded-full bg-primary/10 p-3">
          <Rocket className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lancement plateforme</h1>
          <p className="text-muted-foreground mt-1">
            Gérer l'ouverture officielle et la campagne d'emails.
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">État actuel</CardTitle>
          <CardDescription>
            {config?.launched ? (
              <span className="text-emerald-600 font-medium">
                🚀 Plateforme ouverte depuis le{" "}
                {config.launched_at
                  ? new Date(config.launched_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            ) : (
              <span className="text-amber-600 font-medium">
                ⏸ Publication des paniers bloquée pour les commerces réels (les comptes de démo @kshare.fr peuvent publier).
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Commerces validés (réels)</p>
              <p className="text-lg font-semibold">{commercesCount ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clients inscrits (réels)</p>
              <p className="text-lg font-semibold">{clientsCount ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <LaunchControls
        launched={config?.launched ?? false}
        launchDate={config?.launch_date ?? ""}
        commercesCount={commercesCount ?? 0}
        clientsCount={clientsCount ?? 0}
        sentJ7={config?.emails_sent_j7 ?? null}
        sentJ1={config?.emails_sent_j1 ?? null}
        sentJ0={config?.emails_sent_j0 ?? null}
      />
    </div>
  );
}
