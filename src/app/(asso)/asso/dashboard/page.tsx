import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import { Gift, Heart, ShoppingBag, Users } from "lucide-react";
import { AssoDashboardCharts } from "@/components/asso/asso-dashboard-charts";

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FAMILIES_PER_BASKET = 3; // estimation

export default async function AssoDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?role=association");

  const { data: asso } = await supabase
    .from("associations")
    .select("id, name")
    .eq("profile_id", user.id)
    .single();
  if (!asso) redirect("/connexion?role=association");

  // All donation orders for this association
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, quantity, created_at, is_donation")
    .eq("association_id", asso.id)
    .eq("is_donation", true);

  const allOrders     = orders ?? [];
  const totalDons     = allOrders.reduce((s, o) => s + (o.quantity ?? 1), 0);
  const collected     = allOrders.filter((o) => o.status === "picked_up");
  const donCommerce   = allOrders.filter((o) => o.is_donation).length;
  const donClients    = 0; // simplified — could differentiate by donation source
  const famillesAidees = collected.reduce((s, o) => s + Math.ceil((o.quantity ?? 1) * FAMILIES_PER_BASKET / 3), 0);

  // Estimated value: assume avg 8€ per basket
  const valeurEstimee = totalDons * 8;

  // Bar chart — last 7 days
  const salesByDay: Record<number, number> = {};
  for (let i = 0; i < 7; i++) salesByDay[i] = 0;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  allOrders
    .filter((o) => new Date(o.created_at) >= sevenDaysAgo)
    .forEach((o) => {
      let dow = new Date(o.created_at).getDay();
      dow = dow === 0 ? 6 : dow - 1;
      salesByDay[dow] = (salesByDay[dow] ?? 0) + (o.quantity ?? 1);
    });
  const barData = DAYS_FR.map((day, i) => ({ day, paniers: salesByDay[i] ?? 0 }));

  const kpis = [
    {
      label: "Total paniers dons",
      value: totalDons.toString(),
      icon: Gift,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      label: "Dons commerçants",
      value: donCommerce.toString(),
      icon: ShoppingBag,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Dons clients",
      value: donClients.toString(),
      icon: Heart,
      iconBg: "bg-pink-100",
      iconColor: "text-pink-500",
    },
  ];

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 font-medium">{k.label}</p>
              <div className={`w-10 h-10 ${k.iconBg} rounded-xl flex items-center justify-center`}>
                <k.icon className={`h-5 w-5 ${k.iconColor}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="mb-6">
        <AssoDashboardCharts barData={barData} />
      </div>

      {/* Impact social card */}
      <div className="bg-[#1e2a78] rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <h3 className="font-bold text-lg">Impact social</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-300" />
              <span className="text-sm text-white/70">Valeur estimée des dons</span>
            </div>
            <div className="text-3xl font-bold text-white">{valeurEstimee}€</div>
            <p className="text-xs text-white/50 mt-1">Estimation à 8€ par panier</p>
          </div>
          <div className="bg-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-pink-300" />
              <span className="text-sm text-white/70">Familles aidées</span>
            </div>
            <div className="text-3xl font-bold text-white">{famillesAidees}</div>
            <p className="text-xs text-white/50 mt-1">D&apos;après les paniers collectés</p>
          </div>
        </div>
      </div>
    </div>
  );
}
