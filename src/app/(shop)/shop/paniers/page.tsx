import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ShoppingBag, Pencil, Trash2, UtensilsCrossed, Milk, Leaf, Wine, Layers, ShoppingCart, Handshake, Heart, type LucideIcon } from "lucide-react";
import { BASKET_TYPES } from "@/lib/constants";

const TYPE_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  bassari: { label: "Bassari", Icon: UtensilsCrossed },
  halavi:  { label: "Halavi",  Icon: Milk },
  parve:   { label: "Parvé",   Icon: Leaf },
  shabbat: { label: "Shabbat", Icon: Wine },
  mix:     { label: "Mix",     Icon: Layers },
};

function StatusBadge({ status, isDonation }: { status: string; isDonation?: boolean }) {
  if (isDonation) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Handshake className="h-3.5 w-3.5" /> Don (Mitzva)
    </span>
  );
  if (status === "published") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
      Actif
    </span>
  );
  if (status === "draft") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
      Planifié
    </span>
  );
  if (status === "sold_out") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Épuisé
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      {status}
    </span>
  );
}

function BasketTable({
  title,
  baskets,
}: {
  title: string;
  baskets: Array<{
    id: string; type: string; pickup_start: string; pickup_end: string;
    sold_price: number; quantity_total: number; quantity_sold: number;
    status: string; is_donation: boolean;
  }>;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-hidden mb-5">
      <div className="px-6 py-4 border-b border-[#e2e5f0]">
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {baskets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <ShoppingBag className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Aucun panier</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[14%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#e2e5f0]">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Heure retrait</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-3">Prix</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-3">Quantité</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-3">Vente</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-3">Restant</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Statut</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f1f5]">
              {baskets.map((b) => {
                const t = TYPE_ICONS[b.type] ?? { label: b.type, Icon: ShoppingCart };
                return (
                  <tr key={b.id} className="hover:bg-[#fafbff] transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <t.Icon className="h-5 w-5 text-[#3744C8] shrink-0" />
                        <span className="font-medium text-gray-900 text-sm">{t.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {b.pickup_start?.slice(0, 5)} – {b.pickup_end?.slice(0, 5)}
                    </td>
                    <td className="px-2 py-4 text-center">
                      <span className="font-semibold text-gray-900 text-sm">
                        {b.is_donation ? "Don" : `${b.sold_price}€`}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-600 text-center">
                      {b.quantity_total}
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-600 text-center">
                      {b.quantity_sold}
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-600 text-center">
                      {b.quantity_total - b.quantity_sold}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={b.status} isDonation={b.is_donation} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/shop/paniers/${b.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3744C8] border border-[#3744C8]/30 rounded-lg hover:bg-[#3744C8]/5 transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Modifier
                        </Link>
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                          <Trash2 className="h-3 w-3" />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function PaniersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, status")
    .eq("profile_id", user.id)
    .single();
  if (!commerce) redirect("/inscription-commercant");

  const { data: baskets } = await supabase
    .from("baskets")
    .select("id, type, pickup_start, pickup_end, sold_price, quantity_total, quantity_sold, status, is_donation, day")
    .eq("commerce_id", commerce.id)
    .neq("status", "disabled")
    .order("created_at", { ascending: false });

  const todayBaskets    = baskets?.filter((b) => b.day === "today")    ?? [];
  const tomorrowBaskets = baskets?.filter((b) => b.day === "tomorrow") ?? [];

  const canCreate = commerce.status === "validated";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gérer mes paniers</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {(baskets?.length ?? 0)} panier{(baskets?.length ?? 0) > 1 ? "s" : ""} au total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={canCreate ? "/shop/paniers/nouveau-don" : "#"}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all ${
              canCreate
                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                : "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
            }`}
          >
            <Heart className="h-4 w-4" />
            Proposer un don
          </Link>
          <Link
            href={canCreate ? "/shop/paniers/nouveau" : "#"}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all ${
              canCreate
                ? "bg-gradient-to-r from-[#1e2a78] via-[#2d4de0] to-[#4f6df5] hover:opacity-90"
                : "bg-gray-300 cursor-not-allowed pointer-events-none"
            }`}
          >
            <Plus className="h-4 w-4" />
            Nouveau panier
          </Link>
        </div>
      </div>

      <BasketTable title="Paniers d'aujourd'hui" baskets={todayBaskets} />
      <BasketTable title="Paniers de demain"     baskets={tomorrowBaskets} />
    </div>
  );
}
