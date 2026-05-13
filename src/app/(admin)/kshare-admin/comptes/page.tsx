import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Users } from "lucide-react";

type StatusFilter = "pending" | "validated" | "refused" | "complement_required" | "all";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "En attente" },
  { value: "validated", label: "Validés" },
  { value: "complement_required", label: "Complément requis" },
  { value: "refused", label: "Refusés" },
  { value: "all", label: "Tous" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  validated: "Validé",
  refused: "Refusé",
  complement_required: "Complément requis",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  validated: "bg-green-100 text-green-800",
  refused: "bg-red-100 text-red-800",
  complement_required: "bg-orange-100 text-orange-800",
};

export default async function ComptesPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const activeStatus: StatusFilter = (
    ["pending", "validated", "refused", "complement_required", "all"].includes(status ?? "")
      ? status
      : "pending"
  ) as StatusFilter;

  const supabase = await createClient();

  const commerceQuery = supabase
    .from("commerces")
    .select("id, name, city, email, status, created_at")
    .order("created_at", { ascending: false });
  const assoQuery = supabase
    .from("associations")
    .select("id, name, city, contact, status, created_at")
    .order("created_at", { ascending: false });

  if (activeStatus !== "all") {
    commerceQuery.eq("status", activeStatus);
    assoQuery.eq("status", activeStatus);
  }

  const [{ data: commerces }, { data: associations }] = await Promise.all([
    commerceQuery,
    assoQuery,
  ]);

  const statusBadge = (s: string) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s] ?? ""}`}>
      {STATUS_LABELS[s] ?? s}
    </span>
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Validation des comptes</h1>
        <p className="text-muted-foreground mt-1">Gérez les inscriptions commerces et associations</p>
      </div>

      {/* Tabs filtre */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value === activeStatus;
          return (
            <Link
              key={tab.value}
              href={tab.value === "pending" ? "/kshare-admin/comptes" : `/kshare-admin/comptes?status=${tab.value}`}
              className={`px-4 py-2 -mb-px text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="space-y-8">
        {/* Commerces */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Commerces ({commerces?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!commerces?.length ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Aucun commerce dans cette catégorie.</p>
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
            <CardTitle className="text-base">Associations ({associations?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!associations?.length ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Aucune association dans cette catégorie.</p>
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
