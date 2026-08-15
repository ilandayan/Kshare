import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, ShoppingBag, TrendingUp, Gift } from "lucide-react";
import { CAPTURES_ENCAISSEES } from "@/lib/revenus";

export default async function StatistiquesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase.from("commerces").select("id, commission_rate").eq("profile_id", user.id).single();
  if (!commerce) redirect("/inscription-commercant");

  // Mêmes règles que le tableau de bord et que la facture : seules les
  // commandes encaissées comptent, et les remboursements se déduisent.
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "total_amount, captured_amount, refunded_amount, commission_amount, commission_refunded, status, created_at, is_donation, capture_status",
    )
    .eq("commerce_id", commerce.id);

  const paidOrders =
    orders?.filter((o) =>
      (CAPTURES_ENCAISSEES as unknown as string[]).includes(o.capture_status),
    ) ?? [];
  const cabrut = paidOrders.reduce(
    (s, o) => s + Number(o.captured_amount ?? o.total_amount ?? 0) - Number(o.refunded_amount ?? 0),
    0,
  );
  const canet = paidOrders.reduce(
    (s, o) =>
      s +
      Number(o.captured_amount ?? o.total_amount ?? 0) -
      Number(o.refunded_amount ?? 0) -
      (Number(o.commission_amount ?? 0) - Number(o.commission_refunded ?? 0)),
    0,
  );
  const paniersVendus = paidOrders.filter((o) => !o.is_donation).length;
  const donations = orders?.filter((o) => o.is_donation).length ?? 0;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-8">Statistiques</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "CA brut TTC", value: `${cabrut.toFixed(2)} €`, icon: TrendingUp },
          { label: "CA net", value: `${canet.toFixed(2)} €`, icon: Euro },
          { label: "Paniers vendus", value: paniersVendus.toString(), icon: ShoppingBag },
          { label: "Paniers dons", value: donations.toString(), icon: Gift },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Commandes récentes</CardTitle></CardHeader>
        <CardContent>
          {!paidOrders.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="mx-auto h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Aucune commande pour le moment</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paidOrders.slice(0, 20).map((o, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0 text-sm">
                  <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR")}</span>
                  <span className="font-medium">
                    {(
                      Number(o.captured_amount ?? o.total_amount ?? 0) -
                      Number(o.refunded_amount ?? 0)
                    ).toFixed(2)}{" "}
                    €
                  </span>
                  <span className="text-muted-foreground">
                    Net :{" "}
                    {(
                      Number(o.captured_amount ?? o.total_amount ?? 0) -
                      Number(o.refunded_amount ?? 0) -
                      (Number(o.commission_amount ?? 0) - Number(o.commission_refunded ?? 0))
                    ).toFixed(2)}{" "}
                    €
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
