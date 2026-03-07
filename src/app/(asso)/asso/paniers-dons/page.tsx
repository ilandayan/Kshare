import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, MapPin, Clock, Package } from "lucide-react";
import Link from "next/link";
import { BASKET_TYPES } from "@/lib/constants";

const BASKET_COLORS: Record<string, string> = {
  bassari: "bg-red-500",
  halavi:  "bg-blue-500",
  parve:   "bg-green-600",
  shabbat: "bg-yellow-500",
  mix:     "bg-purple-600",
};

export default async function PaniersDonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: baskets } = await supabase
    .from("baskets")
    .select("*, commerces(name, city, hashgakha, address)")
    .eq("status", "published")
    .eq("is_donation", true)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-[#3744C8] rounded-xl flex items-center justify-center">
            <Gift className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Paniers dons disponibles</h1>
        </div>
        <p className="text-gray-500 mt-1 ml-12">
          Réservez les paniers offerts par les commerçants partenaires
        </p>
      </div>

      {/* Empty state */}
      {!baskets?.length ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-16 text-center">
          <div className="w-16 h-16 bg-[#EEF0F8] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift className="h-8 w-8 text-[#3744C8] opacity-50" />
          </div>
          <p className="text-gray-500 font-medium">Aucun panier don disponible pour le moment</p>
          <p className="text-gray-400 text-sm mt-1">Revenez bientôt, les commerçants publient de nouveaux paniers chaque jour</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {baskets.map((basket) => {
            const typeConfig = BASKET_TYPES.find((t) => t.value === basket.type);
            const colorClass = BASKET_COLORS[basket.type] ?? "bg-gray-500";
            const commerce = basket.commerces as {
              name: string; city: string; hashgakha: string; address?: string;
            } | null;
            const remaining = basket.quantity_total - basket.quantity_sold - (basket.quantity_reserved ?? 0);

            return (
              <div
                key={basket.id}
                className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Top color strip */}
                <div className={`${colorClass} h-1.5 w-full`} />

                <div className="p-6">
                  {/* Type badge + Don tag */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{typeConfig?.emoji}</span>
                      <span className="font-semibold text-gray-900">{typeConfig?.label}</span>
                    </div>
                    <Badge className="bg-[#EEF0F8] text-[#3744C8] border-0 text-xs font-medium">
                      🤝 Don
                    </Badge>
                  </div>

                  {/* Commerce info */}
                  <div className="space-y-2 text-sm text-gray-500 mb-5">
                    <div className="font-semibold text-gray-900 text-base">{commerce?.name}</div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {commerce?.city} · {commerce?.hashgakha}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      Retrait : {basket.pickup_start} – {basket.pickup_end}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 shrink-0" />
                      <span className={remaining <= 2 ? "text-orange-500 font-medium" : ""}>
                        {remaining} disponible{remaining > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <Button className="w-full bg-[#3744C8] hover:bg-[#2B38B8] text-white rounded-xl" size="sm" asChild>
                    <Link href={`/asso/paniers-dons/${basket.id}`}>
                      Réserver ce panier
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
