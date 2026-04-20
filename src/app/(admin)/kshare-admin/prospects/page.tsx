import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProspectsList from "./_list";

const COMMERCE_TYPE_LABELS: Record<string, string> = {
  boucherie: "Boucherie",
  boulangerie: "Boulangerie",
  epicerie: "Épicerie",
  supermarche: "Supermarché",
  restaurant: "Restaurant",
  traiteur: "Traiteur",
  autre: "Autre",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  undecided: "Indécis",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  demo_scheduled: "RDV prévu",
  converted: "Converti",
  rejected: "Refusé",
  no_response: "Sans réponse",
};

export default async function ProspectsPage() {
  const supabase = await createClient();

  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false });

  const total = prospects?.length ?? 0;
  const newCount = prospects?.filter((p) => p.status === "new").length ?? 0;
  const contactedCount = prospects?.filter((p) => p.status === "contacted").length ?? 0;
  const convertedCount = prospects?.filter((p) => p.status === "converted").length ?? 0;
  const conversionRate = total > 0 ? Math.round((convertedCount / total) * 100) : 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">🎯 Prospects commerçants</h1>
        <p className="text-muted-foreground mt-1">
          Leads reçus via le formulaire de demande d&apos;infos (/je-suis-commercant/demande-infos)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-3xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Nouveaux</div>
            <div className="text-3xl font-bold text-red-500">{newCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Contactés</div>
            <div className="text-3xl font-bold text-blue-500">{contactedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Convertis</div>
            <div className="text-3xl font-bold text-emerald-600">{convertedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Taux conversion</div>
            <div className="text-3xl font-bold text-violet-600">{conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste des prospects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!prospects?.length ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm">Aucun prospect pour le moment.</p>
              <p className="text-xs mt-2">
                Les demandes d&apos;infos arrivent via
                <Badge variant="secondary" className="mx-1">k-share.fr/je-suis-commercant</Badge>
              </p>
            </div>
          ) : (
            <ProspectsList
              prospects={prospects.map((p) => ({
                id: p.id,
                firstName: p.first_name,
                lastName: p.last_name,
                email: p.email,
                phone: p.phone,
                companyName: p.company_name,
                commerceType: p.commerce_type,
                commerceTypeLabel: COMMERCE_TYPE_LABELS[p.commerce_type] ?? p.commerce_type,
                city: p.city,
                postalCode: p.postal_code,
                planInterest: p.plan_interest,
                planLabel: PLAN_LABELS[p.plan_interest ?? "undecided"] ?? "—",
                message: p.message,
                status: p.status,
                statusLabel: STATUS_LABELS[p.status] ?? p.status,
                adminNotes: p.admin_notes,
                createdAt: p.created_at,
                contactedAt: p.contacted_at,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
