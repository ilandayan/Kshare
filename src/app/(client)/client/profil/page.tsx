import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditClientProfile } from "@/components/client/edit-client-profile";
import { User, ShoppingBag, TrendingUp } from "lucide-react";

export default async function ClientProfilPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client") redirect("/");

  // Stats
  const { count: totalOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("client_id", user.id)
    .eq("is_donation", false);

  const { data: completedOrders } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("client_id", user.id)
    .eq("is_donation", false)
    .in("status", ["paid", "ready_for_pickup", "picked_up"]);

  const totalSpent = (completedOrders ?? []).reduce((sum, o) => sum + o.total_amount, 0);

  const memberSince = new Date(profile.created_at).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-1">Gerez vos informations personnelles</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalOrders ?? 0}</div>
              <div className="text-xs text-gray-500">Commandes</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalSpent.toFixed(0)}&nbsp;&euro;</div>
              <div className="text-xs text-gray-500">Total depense</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Membre depuis</div>
              <div className="text-xs text-gray-500">{memberSince}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <User className="h-5 w-5" />
          Informations personnelles
        </h2>
        <EditClientProfile
          profile={{
            id: profile.id,
            full_name: profile.full_name ?? "",
            email: profile.email ?? user.email ?? "",
          }}
        />
      </div>
    </div>
  );
}
