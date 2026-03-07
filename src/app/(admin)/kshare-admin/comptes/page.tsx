import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Users } from "lucide-react";

export default async function ComptesPage() {
  const supabase = await createClient();

  const [{ data: commerces }, { data: associations }] = await Promise.all([
    supabase.from("commerces").select("id, name, city, email, status, created_at").eq("status", "pending").order("created_at"),
    supabase.from("associations").select("id, name, city, contact, status, created_at").eq("status", "pending").order("created_at"),
  ]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      validated: "bg-green-100 text-green-800",
      refused: "bg-red-100 text-red-800",
      complement_required: "bg-orange-100 text-orange-800",
    };
    const labels: Record<string, string> = { pending: "En attente", validated: "Validé", refused: "Refusé", complement_required: "Complément requis" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? ""}`}>{labels[status] ?? status}</span>;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Validation des comptes</h1>
        <p className="text-muted-foreground mt-1">Gérez les inscriptions en attente de validation</p>
      </div>

      <div className="space-y-8">
        {/* Commerces */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Commerces en attente ({commerces?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!commerces?.length ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Aucun commerce en attente</p>
            ) : (
              <div className="space-y-3">
                {commerces.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <div className="font-semibold text-foreground">{c.name}</div>
                      <div className="text-sm text-muted-foreground">{c.city} · {c.email}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Inscrit le {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(c.status)}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/kshare-admin/comptes/${c.id}?type=commerce`}>Voir la fiche</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Associations */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Associations en attente ({associations?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!associations?.length ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Aucune association en attente</p>
            ) : (
              <div className="space-y-3">
                {associations.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <div className="font-semibold text-foreground">{a.name}</div>
                      <div className="text-sm text-muted-foreground">{a.city} · {a.contact}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(a.status)}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/kshare-admin/comptes/${a.id}?type=association`}>Voir la fiche</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
