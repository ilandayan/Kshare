import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";
import Link from "next/link";
import { BASKET_TYPES } from "@/lib/constants";

export default async function PaniersDonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: baskets } = await supabase
    .from("baskets")
    .select("*, commerces(name, city, hashgakha)")
    .eq("status", "published")
    .eq("is_donation", true)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Paniers dons disponibles</h1>
        <p className="text-muted-foreground mt-1">Réservez les paniers offerts par les commerçants partenaires</p>
      </div>
      {!baskets?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <Gift className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>Aucun panier don disponible pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {baskets.map((basket) => {
            const typeConfig = BASKET_TYPES.find((t) => t.value === basket.type);
            const commerce = basket.commerces as { name: string; city: string; hashgakha: string } | null;
            return (
              <Card key={basket.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{typeConfig?.emoji}</span>
                      <CardTitle className="text-base">{typeConfig?.label}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">Don 🤝</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="font-medium text-foreground">{commerce?.name}</div>
                    <div>{commerce?.city} · {commerce?.hashgakha}</div>
                    <div>Retrait : {basket.pickup_start} – {basket.pickup_end}</div>
                    <div>Quantité : {basket.quantity_total - basket.quantity_sold} disponible(s)</div>
                  </div>
                  <Button className="w-full" size="sm" asChild>
                    <Link href={`/asso/paniers-dons/${basket.id}`}>Réserver ce panier</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
