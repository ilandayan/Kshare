import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import Link             from "next/link";
import { MapPin, Clock, Package, Info, Navigation } from "lucide-react";
import { BASKET_TYPES } from "@/lib/constants";

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  bassari: { label: "Bassari", emoji: "🥩" },
  halavi:  { label: "Halavi",  emoji: "🧀" },
  parve:   { label: "Parvé",   emoji: "🌿" },
  shabbat: { label: "Shabbat", emoji: "🍷" },
  mix:     { label: "Mix",     emoji: "➕" },
};

export default async function PaniersDonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?role=association");

  const { data: baskets } = await supabase
    .from("baskets")
    .select("*, commerces(name, city, hashgakha, address, commerce_type)")
    .eq("status", "published")
    .eq("is_donation", true)
    .order("created_at", { ascending: false });

  const today    = baskets?.filter((b) => b.day === "today")    ?? [];
  const tomorrow = baskets?.filter((b) => b.day === "tomorrow") ?? [];

  function BasketCard({ basket }: {
    basket: {
      id: string; type: string; pickup_start: string; pickup_end: string;
      quantity_total: number; quantity_sold: number;
      commerces: { name: string; city: string; hashgakha: string; address?: string; commerce_type?: string } | null;
    }
  }) {
    const t       = TYPE_LABELS[basket.type] ?? { label: basket.type, emoji: "🛒" };
    const c       = basket.commerces;
    const initial = c?.name?.charAt(0)?.toUpperCase() ?? "K";
    const remaining = basket.quantity_total - basket.quantity_sold;

    return (
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        {/* Card header */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3744C8] rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                {initial}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">{c?.name}</div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {c?.city}
                  {c?.hashgakha && <span className="ml-1 text-[#3744C8]">· {c.hashgakha}</span>}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold shrink-0">
              🤝 Don
            </span>
          </div>

          {/* Basket info */}
          <div className="bg-[#f8f9fc] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-900">{t.emoji} {t.label}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Clock className="h-3.5 w-3.5" /> Heure retrait
              </span>
              <span className="font-medium text-gray-900">{basket.pickup_start} – {basket.pickup_end}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Package className="h-3.5 w-3.5" /> Quantité
              </span>
              <span className={`font-medium ${remaining <= 2 ? "text-orange-500" : "text-gray-900"}`}>
                {remaining} disponible{remaining > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <Link
            href={`/asso/paniers-dons/${basket.id}`}
            className="flex-1 bg-[#3744C8] hover:bg-[#2B38B8] text-white rounded-xl py-2.5 text-sm font-semibold text-center transition-colors"
          >
            Voir les détails
          </Link>
          {c?.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(c.address + " " + c.city)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-[#e2e5f0] text-gray-600 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors shrink-0"
            >
              <Navigation className="h-3.5 w-3.5" />
              Itinéraire
            </a>
          )}
        </div>
      </div>
    );
  }

  function Section({ title, items }: { title: string; items: typeof today }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((b) => (
            <BasketCard key={b.id} basket={b as Parameters<typeof BasketCard>[0]["basket"]} />
          ))}
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

      {!baskets?.length ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-16 text-center">
          <div className="text-4xl mb-4">🤝</div>
          <p className="text-gray-500 font-medium">Aucun panier don disponible pour le moment</p>
          <p className="text-gray-400 text-sm mt-1">Revenez bientôt, les commerçants publient de nouveaux paniers chaque jour</p>
        </div>
      ) : (
        <>
          <Section title="Aujourd'hui" items={today} />
          <Section title="Demain"       items={tomorrow} />

          {/* Mitzvot info box */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-purple-900 text-sm mb-1">Mitzvot &amp; Tsedaka</p>
              <p className="text-sm text-purple-700 leading-relaxed">
                En récupérant ces paniers, votre association accomplit une mitzvah de tsedaka (bienfaisance).
                Ces dons permettent de réduire le gaspillage alimentaire tout en aidant les familles dans le besoin.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
