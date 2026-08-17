import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AssociationsClient } from "@/components/crm/associations-client";

export const dynamic = "force-dynamic";

export default async function AssociationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const admin = createAdminClient();

  // Les recommandations des commerçants, à traiter.
  const { data: leads } = await admin
    .from("association_leads")
    .select("id, name, contact_name, email, phone, address, status, notes, created_at, commerce_id")
    .order("created_at", { ascending: false });

  // Le nom du commerce qui recommande : sans lui on ne sait pas à qui reparler.
  const commerceIds = [...new Set((leads ?? []).map((l) => l.commerce_id).filter(Boolean))];
  const { data: commerces } = commerceIds.length
    ? await admin.from("commerces").select("id, name").in("id", commerceIds as string[])
    : { data: [] };
  const nomCommerce = new Map((commerces ?? []).map((c) => [c.id, c.name]));

  const { data: associations } = await admin
    .from("associations")
    .select("id, name, city, department, status, latitude, longitude, geocoded_at")
    .order("name");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-1">Associations</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Celles qui sont inscrites, et celles que les commerçants nous recommandent.
      </p>

      <AssociationsClient
        leads={(leads ?? []).map((l) => ({
          ...l,
          commerce_name: l.commerce_id ? (nomCommerce.get(l.commerce_id) ?? null) : null,
        }))}
        associations={associations ?? []}
      />
    </div>
  );
}
