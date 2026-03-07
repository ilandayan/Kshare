import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingBag, CheckCircle } from "lucide-react";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database.types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusLabels: Record<OrderStatus, string> = {
  created: "Créée",
  paid: "Payée",
  ready_for_pickup: "Prête",
  picked_up: "Récupérée",
  no_show: "Non venu",
  refunded: "Remboursée",
  cancelled_admin: "Annulée",
};

const statusVariants: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  created: "outline",
  paid: "default",
  ready_for_pickup: "secondary",
  picked_up: "secondary",
  no_show: "destructive",
  refunded: "destructive",
  cancelled_admin: "destructive",
};

const basketTypeEmojis: Record<string, string> = {
  bassari: "🥩",
  halavi: "🧀",
  parve: "🌿",
  shabbat: "🍷",
  mix: "➕",
};

function maskClientName(name: string | null): string {
  if (!name || name.length < 2) return "Client K***";
  return `${name.charAt(0)}*** K***`;
}

async function markOrderCompleted(orderId: string): Promise<void> {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) return;

  await supabase
    .from("orders")
    .update({ status: "picked_up", picked_up_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("commerce_id", commerce.id)
    .in("status", ["paid", "ready_for_pickup"]);

  revalidatePath("/shop/paniers/orders");
}

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, name")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) redirect("/connexion");

  // Fetch today's orders
  const today = new Date().toISOString().split("T")[0];

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      quantity,
      total_amount,
      qr_code_token,
      pickup_start,
      pickup_end,
      created_at,
      basket_id,
      client_id,
      baskets!inner(type),
      profiles!orders_client_id_fkey(full_name)
    `
    )
    .eq("commerce_id", commerce.id)
    .eq("pickup_date", today)
    .in("status", ["paid", "ready_for_pickup", "picked_up"])
    .order("created_at", { ascending: false });

  const activeOrders =
    orders?.filter(
      (o) => o.status === "paid" || o.status === "ready_for_pickup"
    ) ?? [];

  const completedOrders =
    orders?.filter((o) => o.status === "picked_up") ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commandes du jour</h1>
        <p className="text-muted-foreground mt-1">
          Gérez les retraits de paniers d'aujourd'hui.
        </p>
      </div>

      {/* Active orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Commandes en attente
            {activeOrders.length > 0 && (
              <Badge variant="default" className="ml-2">
                {activeOrders.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Commandes payées en attente de retrait
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune commande en attente pour aujourd'hui.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qté</TableHead>
                  <TableHead>Code retrait</TableHead>
                  <TableHead>Créneau</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeOrders.map((order) => {
                  const profile = order.profiles as { full_name: string | null } | null;
                  const basket = order.baskets as { type: string } | null;
                  const maskedName = maskClientName(profile?.full_name ?? null);
                  const emoji = basketTypeEmojis[basket?.type ?? ""] ?? "🛒";
                  const status = order.status as OrderStatus;

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{maskedName}</TableCell>
                      <TableCell>
                        <span className="text-lg" title={basket?.type ?? ""}>
                          {emoji}
                        </span>
                      </TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-primary text-lg tracking-widest">
                          {order.qr_code_token ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.pickup_start} – {order.pickup_end}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[status]}>
                          {statusLabels[status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={markOrderCompleted.bind(null, order.id)}>
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="gap-1"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Marquer récupéré
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Completed orders */}
      {completedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Commandes récupérées
              <Badge variant="outline" className="ml-2">
                {completedOrders.length}
              </Badge>
            </CardTitle>
            <CardDescription>Paniers déjà remis aujourd'hui</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qté</TableHead>
                  <TableHead>Code retrait</TableHead>
                  <TableHead>Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedOrders.map((order) => {
                  const profile = order.profiles as { full_name: string | null } | null;
                  const basket = order.baskets as { type: string } | null;
                  const maskedName = maskClientName(profile?.full_name ?? null);
                  const emoji = basketTypeEmojis[basket?.type ?? ""] ?? "🛒";

                  return (
                    <TableRow key={order.id} className="opacity-60">
                      <TableCell className="font-medium">{maskedName}</TableCell>
                      <TableCell>
                        <span className="text-lg" title={basket?.type ?? ""}>
                          {emoji}
                        </span>
                      </TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-muted-foreground tracking-widest">
                          {order.qr_code_token ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>{order.total_amount.toFixed(2)} €</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
