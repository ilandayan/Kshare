import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import { Info, Handshake, MapPin, Heart } from "lucide-react";
import { DonBasketCard } from "@/components/asso/don-basket-card";
import { ClientDonationCard } from "@/components/asso/client-donation-card";
import { DEPARTMENTS } from "@/lib/constants";

export default async function PaniersDonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Récupérer l'association et son département
  const { data: asso } = await supabase
    .from("associations")
    .select("id, city, zone_region, department")
    .eq("profile_id", user.id)
    .single();

  if (!asso) redirect("/");

  // Récupérer les paniers dons publiés avec le code postal du commerce
  const { data: baskets } = await supabase
    .from("baskets")
    .select("*, commerces(name, city, hashgakha, address, postal_code, commerce_type)")
    .eq("status", "published")
    .eq("is_donation", true)
    .order("created_at", { ascending: false });

  // Récupérer les dons clients en attente d'association
  const { data: pendingDonations } = await supabase
    .from("orders")
    .select(
      "id, quantity, total_amount, pickup_start, pickup_end, donation_expires_at, basket_id, baskets(type, description), commerces:commerce_id(name, city, address, postal_code)"
    )
    .eq("status", "pending_association")
    .eq("is_donation", true)
    .order("created_at", { ascending: false });

  // Filtrer par département : les 2 premiers chiffres du code postal du commerce
  const filteredBaskets = asso.department
    ? baskets?.filter((b) => {
        const commerce = b.commerces as { postal_code?: string } | null;
        return commerce?.postal_code?.slice(0, 2) === asso.department;
      }) ?? []
    : baskets ?? [];

  // Filtrer aussi les dons clients par département
  const filteredDonations = asso.department
    ? pendingDonations?.filter((d) => {
        const commerce = d.commerces as { postal_code?: string } | null;
        return commerce?.postal_code?.slice(0, 2) === asso.department;
      }) ?? []
    : pendingDonations ?? [];

  const today    = filteredBaskets.filter((b) => b.day === "today");
  const tomorrow = filteredBaskets.filter((b) => b.day === "tomorrow");

  // Nom du département pour l'affichage
  const deptLabel = asso.department
    ? DEPARTMENTS.find((d) => d.code === asso.department)?.label ?? `Département ${asso.department}`
    : null;

  function Section({ title, items }: { title: string; items: typeof today }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((b) => {
            const commerce = b.commerces as {
              name: string; city: string; hashgakha: string; address?: string;
            } | null;
            return (
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
                  commerce,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Récupération de dons</h1>
        <p className="text-sm text-gray-400 mt-0.5">Paniers offerts par les commerçants partenaires</p>
      </div>

      {/* Zone géographique info */}
      {deptLabel && (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Zone de récupération :</span>{" "}
            <span className="font-semibold text-gray-900">{deptLabel}</span>
            <span className="text-gray-400"> ({asso.department})</span>
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

          {/* Mitzvot info box */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-purple-900 text-sm mb-1">Mitsva & Tsedaka</p>
              <p className="text-sm text-purple-700 leading-relaxed">
                En récupérant ces paniers, votre association accomplit une mitsva de tsedaka (bienfaisance).
                Ces dons permettent de réduire le gaspillage alimentaire tout en aidant les familles dans le besoin.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
