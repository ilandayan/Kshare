import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import { Info, Handshake, MapPin, Heart, AlertTriangle } from "lucide-react";
import { DonBasketCard } from "@/components/asso/don-basket-card";
import { ClientDonationCard } from "@/components/asso/client-donation-card";
import { distanceKm, RAYON_DONS_KM } from "@/lib/geo";

export const dynamic = "force-dynamic";

/** Une journée de paniers, ou rien du tout si elle est vide. */
function Section({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    type: string;
    pickup_start: string;
    pickup_end: string;
    quantity_total: number;
    quantity_sold: number | null;
    quantity_reserved: number | null;
    description: string | null;
    distance_km: number | null;
    exclusif: boolean | null;
    commerce_name: string | null;
    commerce_city: string | null;
    commerce_hashgakha: string | null;
    commerce_address: string | null;
  }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((b) => (
          <DonBasketCard
            key={b.id}
            basket={{
              id: b.id,
              type: b.type,
              pickup_start: b.pickup_start,
              pickup_end: b.pickup_end,
              quantity_total: b.quantity_total,
              quantity_sold: b.quantity_sold ?? 0,
              quantity_reserved: b.quantity_reserved ?? 0,
              description: b.description,
              distanceKm: b.distance_km,
              exclusif: b.exclusif ?? false,
              commerce: {
                name: b.commerce_name ?? "",
                city: b.commerce_city ?? "",
                hashgakha: b.commerce_hashgakha ?? "",
                address: b.commerce_address ?? undefined,
              },
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default async function PaniersDonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: asso } = await supabase
    .from("associations")
    .select("id, city, zone_region, department, latitude, longitude")
    .eq("profile_id", user.id)
    .single();

  if (!asso) redirect("/");

  // Le rayon remplace le découpage départemental : un commerce de Levallois
  // restait invisible pour une association du 75 à trois kilomètres, tandis
  // qu'une association de Meaux, à cinquante, le voyait. Le tri se fait en base
  // — rayon, exclusivité accordée par un commerçant, et classement.
  const { data: baskets } = await supabase.rpc("dons_disponibles", {
    p_rayon_km: RAYON_DONS_KM,
  });

  // Les dons de clients suivent la même règle, mais vivent dans `orders` : le
  // filtre se fait ici, sur les coordonnées du commerce.
  const { data: pendingDonations } = await supabase
    .from("orders")
    .select(
      "id, quantity, total_amount, pickup_start, pickup_end, donation_expires_at, basket_id, baskets(type, description), commerces:commerce_id(name, city, address, postal_code, latitude, longitude)"
    )
    .eq("status", "pending_association")
    .eq("is_donation", true)
    .order("created_at", { ascending: false });

  const filteredBaskets = baskets ?? [];

  const filteredDonations = (pendingDonations ?? []).filter((d) => {
    const commerce = d.commerces as { latitude?: number | null; longitude?: number | null } | null;
    if (!asso.latitude || !asso.longitude) return false;
    if (!commerce?.latitude || !commerce?.longitude) return false;
    return (
      distanceKm(asso.latitude, asso.longitude, commerce.latitude, commerce.longitude) <=
      RAYON_DONS_KM
    );
  });

  const today    = filteredBaskets.filter((b) => b.day === "today");
  const tomorrow = filteredBaskets.filter((b) => b.day === "tomorrow");

  // Sans coordonnées, la comparaison de distance échoue contre NULL et
  // l'association ne voit rien du tout. Le silence serait incompréhensible.
  const sansPosition = !asso.latitude || !asso.longitude;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Récupération de dons</h1>
        <p className="text-sm text-gray-400 mt-0.5">Paniers offerts par les commerçants partenaires</p>
      </div>

      {/* Zone géographique */}
      {sansPosition ? (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-start gap-3 mb-6">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Votre adresse n&apos;est pas encore située</p>
            <p className="text-amber-800 mt-0.5">
              Sans elle, nous ne pouvons pas savoir quels paniers sont proches de
              vous, et cette page reste vide. Vérifiez votre adresse depuis votre{" "}
              <a href="/asso/profil" className="underline font-medium">profil</a>.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Zone de récupération :</span>{" "}
            <span className="font-semibold text-gray-900">
              à moins de {RAYON_DONS_KM} km
            </span>
            {asso.city && <span className="text-gray-400"> de {asso.city}</span>}
          </div>
        </div>
      )}

      {/* Dons de clients en attente */}
      {filteredDonations.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              Dons de clients en attente
            </h2>
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {filteredDonations.length} en attente
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredDonations.map((d) => {
              const commerce = d.commerces as {
                name: string;
                city: string;
                address: string | null;
              } | null;
              const basket = d.baskets as {
                type: string;
                description: string | null;
              } | null;
              return (
                <ClientDonationCard
                  key={d.id}
                  order={{
                    id: d.id,
                    quantity: d.quantity,
                    total_amount: d.total_amount,
                    pickup_start: d.pickup_start,
                    pickup_end: d.pickup_end,
                    donation_expires_at: d.donation_expires_at,
                    basket,
                    commerce,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {filteredBaskets.length === 0 && filteredDonations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-16 text-center">
          <div className="mb-4 flex justify-center"><Handshake className="h-10 w-10 text-gray-300" /></div>
          <p className="text-gray-500 font-medium">Aucun panier don disponible pour le moment</p>
          <p className="text-gray-400 text-sm mt-1">Revenez bientôt, les commerçants publient de nouveaux paniers chaque jour</p>
        </div>
      ) : filteredBaskets.length > 0 ? (
        <>
          <Section title="Aujourd'hui" items={today} />
          <Section title="Demain"       items={tomorrow} />

          {/* Mitzvah info box */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-purple-900 text-sm mb-1">Mitzvah & Tsedaka</p>
              <p className="text-sm text-purple-700 leading-relaxed">
                En récupérant ces paniers, votre association accomplit une mitzvah de tsedaka (bienfaisance).
                Ces dons permettent de réduire le gaspillage alimentaire tout en aidant les familles dans le besoin.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
