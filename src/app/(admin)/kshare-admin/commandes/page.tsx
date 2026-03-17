import { createClient }      from "@/lib/supabase/server";
import { AdminOrdersClient } from "@/components/admin/admin-orders-client";
import type { AdminOrder }   from "@/components/admin/admin-orders-client";

function formatOrderNumber(id: string, createdAt: string): string {
  const year  = new Date(createdAt).getFullYear();
  const short = id.replace(/-/g, "").slice(-4).toUpperCase();
  return `CMD-${year}-${short}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function AdminCommandesPage() {
  const supabase = await createClient();

  const [{ data: raw }, { data: ratingsRaw }] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        id, status, quantity, total_amount, created_at, is_donation,
        baskets!inner(sold_price, type),
        profiles!orders_client_id_fkey(full_name, email, phone),
        commerces(name, commerce_type),
        associations(name, profiles!associations_profile_id_fkey(email, phone))
      `)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("ratings")
      .select("order_id, score"),
  ]);

  const ratingsMap = new Map<string, number>();
  for (const r of ratingsRaw ?? []) {
    ratingsMap.set(r.order_id, r.score);
  }

  const orders: AdminOrder[] = (raw ?? []).map((o) => {
    const basket    = o.baskets    as { sold_price: number; type: string } | null;
    const profile   = o.profiles  as { full_name: string | null; email: string | null; phone: string | null } | null;
    const commerce  = o.commerces as { name: string; commerce_type: string | null } | null;
    const asso      = o.associations as { name: string; profiles: { email: string | null; phone: string | null } | null } | null;
    return {
      id:               o.id,
      orderNumber:      formatOrderNumber(o.id, o.created_at),
      status:           o.status,
      date:             formatDate(o.created_at),
      quantity:         o.quantity ?? 1,
      pricePerBasket:   basket?.sold_price ?? 0,
      total:            o.total_amount ?? 0,
      isDonation:       o.is_donation ?? false,
      clientName:       profile?.full_name ?? "Client",
      clientEmail:      profile?.email     ?? "",
      clientPhone:      profile?.phone     ?? "",
      commerceName:     commerce?.name     ?? "Commerce",
      commerceType:     commerce?.commerce_type ?? "Commerce",
      associationName:  asso?.name,
      associationEmail: asso?.profiles?.email ?? undefined,
      associationPhone: asso?.profiles?.phone ?? undefined,
      rating:           ratingsMap.get(o.id) ?? null,
    };
  });

  const totalCommandes  = orders.length;
  const revenuTotal     = orders.reduce((s, o) => s + (o.isDonation ? 0 : o.total), 0);
  const paniersVendus   = orders.reduce((s, o) => s + o.quantity, 0);
  const dons            = orders.filter((o) => o.isDonation).length;

  const kpis = [
    { label: "Total Commandes", value: totalCommandes.toString(),       borderColor: "border-l-blue-500",   icon: "ShoppingCart" },
    { label: "Revenu Total",    value: `${revenuTotal.toFixed(2)}€`,    borderColor: "border-l-green-500",  icon: "Wallet" },
    { label: "Paniers Vendus",  value: paniersVendus.toString(),         borderColor: "border-l-orange-500", icon: "ShoppingBag" },
    { label: "Dons (Mitzvot)",  value: dons.toString(),                  borderColor: "border-l-purple-500", icon: "Handshake" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Commandes</h1>
        <p className="text-sm text-gray-400 mt-0.5">Toutes les commandes de la plateforme</p>
      </div>
      <AdminOrdersClient orders={orders} kpis={kpis} />
    </div>
  );
}
