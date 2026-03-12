import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrdersTabs, type OrderData } from "@/components/client/orders-tabs";
import { CheckCircle2, Heart } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ success?: string; donation?: string }>;
}

export default async function ClientCommandesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Fetch all orders (including donations)
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, quantity, qr_code_token, created_at, pickup_start, pickup_end, pickup_date, is_donation, baskets!inner(type), commerces!inner(name, city)"
    )
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const mapOrder = (o: (typeof orders extends (infer T)[] | null ? T : never)): OrderData => {
    const basket = o.baskets as unknown as { type: string };
    const commerce = o.commerces as unknown as { name: string; city: string };
    return {
      id: o.id,
      status: o.status,
      total_amount: o.total_amount,
      quantity: o.quantity,
      qr_code_token: o.qr_code_token,
      created_at: o.created_at,
      pickup_start: o.pickup_start,
      pickup_end: o.pickup_end,
      pickup_date: o.pickup_date,
      basket_type: basket.type,
      commerce_name: commerce.name,
      commerce_city: commerce.city,
    };
  };

  const allOrders = (orders ?? []).map(mapOrder);

  // Split into 3 groups
  const regularOrders = allOrders.filter((o) => !(orders ?? []).find((raw) => raw.id === o.id && raw.is_donation));
  const donationOrders = allOrders.filter((o) => (orders ?? []).find((raw) => raw.id === o.id && raw.is_donation));

  const activeOrders = regularOrders.filter((o) =>
    ["paid", "ready_for_pickup"].includes(o.status)
  );
  const pastOrders = regularOrders.filter(
    (o) => !["paid", "ready_for_pickup"].includes(o.status)
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes commandes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Retrouvez toutes vos commandes et codes de retrait
        </p>
      </div>

      {/* Success banner after checkout */}
      {params.success === "1" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Commande confirmee !</p>
            <p className="text-sm text-emerald-600">
              Votre code de retrait est disponible ci-dessous.
            </p>
          </div>
        </div>
      )}

      {/* Donation success banner */}
      {params.donation === "1" && (
        <div className="bg-pink-50 border border-pink-200 text-pink-700 rounded-xl px-5 py-4 flex items-center gap-3">
          <Heart className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Merci pour votre don !</p>
            <p className="text-sm text-pink-600">
              Votre generossite aide une association a nourrir ceux qui en ont besoin.
            </p>
          </div>
        </div>
      )}

      <OrdersTabs
        activeOrders={activeOrders}
        pastOrders={pastOrders}
        donationOrders={donationOrders}
        useMock
      />
    </div>
  );
}
