import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ShoppingBag, TrendingUp, Euro, Plus } from "lucide-react";
import { BASKET_STATUS_LABELS } from "@/lib/constants";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, name, status, commission_rate")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) redirect("/inscription-commercant");

  // Fetch today's baskets
  const { data: baskets } = await supabase
    .from("baskets")
    .select("*")
    .eq("commerce_id", commerce.id)
    .in("day", ["today", "tomorrow"])
    .neq("status", "disabled")
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch recent orders
  const { data: orders } = await supabase
    .from("orders")
    .select("id, total_amount, net_amount, status, created_at")
    .eq("commerce_id", commerce.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.net_amount || 0), 0) ?? 0;
  const totalOrders = orders?.length ?? 0;
  const activeBaskets = baskets?.filter((b) => b.status === "published").length ?? 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Bienvenue, {commerce.name}</p>
        </div>
        <Button asChild>
          <Link href="/shop/paniers/nouveau">
            <Plus className="mr-2 h-4 w-4" /> Nouveau panier
          </Link>
        </Button>
      </div>

      {commerce.status === "pending" && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Votre compte est en attente de validation. Vous ne pouvez pas encore publier de paniers.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CA net (récent)</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground mt-1">Commission {commerce.commission_rate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commandes récentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Sur les dernières entrées</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paniers actifs</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBaskets}</div>
            <p className="text-xs text-muted-foreground mt-1">Publiés aujourd&apos;hui/demain</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Baskets */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Paniers du jour</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/shop/paniers">Voir tout</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!baskets?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="mx-auto h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Aucun panier pour aujourd&apos;hui ou demain</p>
              <Button className="mt-4" size="sm" asChild>
                <Link href="/shop/paniers/nouveau">Créer un panier</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {baskets.map((basket) => (
                <div key={basket.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {basket.type === "bassari" ? "🥩" : basket.type === "halavi" ? "🧀" : basket.type === "parve" ? "🌿" : basket.type === "shabbat" ? "🍷" : "➕"}
                    </span>
                    <div>
                      <div className="font-medium text-sm capitalize">{basket.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {basket.day === "today" ? "Aujourd&apos;hui" : "Demain"} · {basket.pickup_start} – {basket.pickup_end}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-sm">{basket.sold_price} €</div>
                      <div className="text-xs text-muted-foreground">{basket.quantity_sold}/{basket.quantity_total} vendus</div>
                    </div>
                    <Badge variant={basket.status === "published" ? "default" : "secondary"} className="text-xs">
                      {BASKET_STATUS_LABELS[basket.status] ?? basket.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
