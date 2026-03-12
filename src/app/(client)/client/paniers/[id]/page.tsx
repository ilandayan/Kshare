import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BasketBuyButton } from "@/components/client/basket-buy-button";
import { ArrowLeft, Clock, MapPin, Store, Info, ShieldCheck } from "lucide-react";

const TYPE_CONFIG: Record<string, { emoji: string; label: string; description: string }> = {
  bassari:  { emoji: "\ud83e\udd69", label: "Panier Bassari",  description: "Panier surprise de produits carnes casher" },
  halavi:   { emoji: "\ud83e\uddc0", label: "Panier Halavi",   description: "Panier surprise de produits laitiers casher" },
  parve:    { emoji: "\ud83c\udf3f", label: "Panier Parve",    description: "Panier surprise de produits parve casher" },
  shabbat:  { emoji: "\ud83c\udf77", label: "Panier Shabbat",  description: "Panier surprise special Shabbat" },
  mix:      { emoji: "\u2795",       label: "Panier Mix",      description: "Panier surprise mixte casher" },
};

const DAY_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  tomorrow: "Demain",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BasketDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: basket } = await supabase
    .from("baskets")
    .select(
      "id, type, sold_price, original_price, description, day, pickup_start, pickup_end, quantity_total, quantity_sold, quantity_reserved, is_donation, status, commerces!inner(id, name, city, address, postal_code, commerce_type, hashgakha, status, commission_rate)"
    )
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!basket) notFound();

  const commerce = basket.commerces as unknown as {
    id: string;
    name: string;
    city: string;
    address: string;
    postal_code: string;
    commerce_type: string;
    hashgakha: string | null;
    status: string;
    commission_rate: number;
  };

  if (commerce.status !== "validated") notFound();

  const typeConfig = TYPE_CONFIG[basket.type] ?? TYPE_CONFIG.mix;
  const available = basket.quantity_total - basket.quantity_sold - basket.quantity_reserved;
  const discount = Math.round((1 - basket.sold_price / basket.original_price) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/client/paniers"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux paniers
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Basket info ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Type header */}
          <div className="bg-white rounded-2xl border border-[#e2e5f0] overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{typeConfig.emoji}</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{typeConfig.label}</h1>
                  <p className="text-sm text-gray-500">{typeConfig.description}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Price */}
              <div className="flex items-baseline gap-3">
                {basket.is_donation ? (
                  <span className="text-2xl font-bold text-pink-600">Gratuit (don)</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-gray-900">
                      {basket.sold_price.toFixed(2)}&nbsp;&euro;
                    </span>
                    <span className="text-lg text-gray-400 line-through">
                      {basket.original_price.toFixed(2)}&nbsp;&euro;
                    </span>
                    {discount > 0 && (
                      <span className="bg-emerald-100 text-emerald-700 text-sm font-bold px-2.5 py-0.5 rounded-full">
                        -{discount}%
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Description */}
              {basket.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1.5">Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{basket.description}</p>
                </div>
              )}

              {/* Pickup info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Retrait
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Jour :</span>{" "}
                    <span className="font-medium text-gray-900">{DAY_LABELS[basket.day] ?? basket.day}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Horaire :</span>{" "}
                    <span className="font-medium text-gray-900">{basket.pickup_start} - {basket.pickup_end}</span>
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Disponibilite</span>
                <span className={`font-semibold ${available <= 2 ? "text-orange-600" : "text-emerald-600"}`}>
                  {available} panier{available !== 1 ? "s" : ""} disponible{available !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Commerce info + Buy ── */}
        <div className="space-y-5">
          {/* Commerce card */}
          <div className="bg-white rounded-2xl border border-[#e2e5f0] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Store className="h-4 w-4" />
              Commerce
            </h3>
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">{commerce.name}</div>
              <div className="text-sm text-gray-500">{commerce.commerce_type}</div>
              <div className="flex items-start gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{commerce.address}, {commerce.postal_code} {commerce.city}</span>
              </div>
              {commerce.hashgakha && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>{commerce.hashgakha}</span>
                </div>
              )}
            </div>
          </div>

          {/* Buy section */}
          <div className="bg-white rounded-2xl border border-[#e2e5f0] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Commander
            </h3>
            <BasketBuyButton
              basketId={basket.id}
              available={available}
              soldPrice={basket.sold_price}
              isDonation={basket.is_donation}
              commissionRate={commerce.commission_rate}
            />
          </div>

          {/* Info note */}
          <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-700 space-y-1">
            <p className="font-medium">Panier surprise</p>
            <p className="text-emerald-600">
              Le contenu exact du panier depend des invendus du jour. Vous serez agreablement surpris !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
