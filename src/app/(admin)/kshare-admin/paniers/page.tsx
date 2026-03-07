import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingBag, CheckCircle2, Clock } from "lucide-react";

export const metadata = { title: "Supervision paniers" };

const BASKET_TYPE_LABELS: Record<string, string> = {
  bassari: "🥩 Bassari",
  halavi: "🧀 Halavi",
  parve: "🌿 Parvé",
  shabbat: "🍷 Shabbat",
  mix: "➕ Mix",
};

const DAY_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  tomorrow: "Demain",
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  published: { label: "Publié", variant: "default" },
  sold_out: { label: "Épuisé", variant: "secondary" },
  expired: { label: "Expiré", variant: "outline" },
  disabled: { label: "Désactivé", variant: "destructive" },
};

export default async function AdminPaniersPage() {
  const supabase = createAdminClient();

  const { data: baskets } = await supabase
    .from("baskets")
    .select(`
      id,
      type,
      day,
      description,
      original_price,
      sold_price,
      quantity_total,
      quantity_reserved,
      quantity_sold,
      status,
      is_donation,
      created_at,
      commerces (name, city)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  const active = baskets?.filter((b) => b.status === "published").length ?? 0;
  const paused = baskets?.filter((b) => b.status === "disabled").length ?? 0;
  const donations = baskets?.filter((b) => b.is_donation).length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Supervision des paniers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vue d&apos;ensemble de tous les paniers publiés sur la plateforme
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paniers actifs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paniers pausés</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{paused}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paniers dons</CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{donations}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tous les paniers</CardTitle>
          <CardDescription>
            {baskets?.length ?? 0} paniers au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!baskets || baskets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Aucun panier publié pour le moment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commerce</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Jour</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Stock restant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Don</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baskets.map((basket) => {
                  const commerce = Array.isArray(basket.commerces)
                    ? basket.commerces[0]
                    : basket.commerces;
                  const statusInfo = STATUS_BADGE[basket.status] ?? { label: basket.status, variant: "outline" as const };
                  const discount = basket.original_price && basket.sold_price
                    ? Math.round((1 - basket.sold_price / basket.original_price) * 100)
                    : null;
                  const remaining = basket.quantity_total - (basket.quantity_reserved ?? 0) - (basket.quantity_sold ?? 0);

                  return (
                    <TableRow key={basket.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{commerce?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{commerce?.city ?? ""}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {BASKET_TYPE_LABELS[basket.type] ?? basket.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {DAY_LABELS[basket.day] ?? basket.day}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{basket.sold_price?.toFixed(2)}€</p>
                          {discount !== null && (
                            <p className="text-xs text-green-600">-{discount}%</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={remaining === 0 ? "text-destructive font-medium" : "text-foreground"}>
                          {remaining} / {basket.quantity_total}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {basket.is_donation ? (
                          <Badge variant="secondary">Don</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
