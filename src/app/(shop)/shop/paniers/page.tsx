import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ShoppingBag } from "lucide-react";
import { BASKET_STATUS_LABELS, BASKET_TYPES } from "@/lib/constants";

export default async function PaniersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase.from("commerces").select("id, status").eq("profile_id", user.id).single();
  if (!commerce) redirect("/inscription-commercant");

  const { data: baskets } = await supabase
    .from("baskets")
    .select("*")
    .eq("commerce_id", commerce.id)
    .order("created_at", { ascending: false });

  const todayBaskets = baskets?.filter((b) => b.day === "today") ?? [];
  const tomorrowBaskets = baskets?.filter((b) => b.day === "tomorrow") ?? [];

  type Basket = NonNullable<typeof baskets>[number];

  const BasketCard = ({ basket }: { basket: Basket }) => {
    const typeConfig = BASKET_TYPES.find((t) => t.value === basket.type);
    return (
      <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-4">
          <span className="text-2xl">{typeConfig?.emoji}</span>
          <div>
            <div className="font-semibold text-foreground">{typeConfig?.label}</div>
            <div className="text-sm text-muted-foreground">
              {basket.pickup_start} – {basket.pickup_end} · {basket.sold_price} € (original : {basket.original_price} €)
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {basket.quantity_sold} vendu(s) / {basket.quantity_total} total
              {basket.is_donation && " · 🤝 Don activé"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={basket.status === "published" ? "default" : basket.status === "sold_out" ? "secondary" : "outline"}>
            {BASKET_STATUS_LABELS[basket.status] ?? basket.status}
          </Badge>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/shop/paniers/${basket.id}`}>Modifier</Link>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">Mes paniers</h1>
        <Button asChild disabled={commerce.status !== "validated"}>
          <Link href="/shop/paniers/nouveau">
            <Plus className="mr-2 h-4 w-4" /> Nouveau panier
          </Link>
        </Button>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aujourd&apos;hui</CardTitle>
          </CardHeader>
          <CardContent>
            {todayBaskets.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <ShoppingBag className="mx-auto h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Aucun panier pour aujourd&apos;hui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayBaskets.map((b) => <BasketCard key={b.id} basket={b} />)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demain</CardTitle>
          </CardHeader>
          <CardContent>
            {tomorrowBaskets.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <ShoppingBag className="mx-auto h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Aucun panier pour demain</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tomorrowBaskets.map((b) => <BasketCard key={b.id} basket={b} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
