import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShopProfileClient } from "@/components/shop/shop-profile-client";

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, name, address, postal_code, city, email, phone, commerce_type, hashgakha, basket_types, commission_rate, status, description, photos, logo_url")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) redirect("/inscription-commercant");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, plan")
    .eq("commerce_id", commerce.id)
    .single();

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Profil commerçant</h1>

      <ShopProfileClient
        commerce={{
          name: commerce.name,
          address: commerce.address,
          city: commerce.city,
          postal_code: commerce.postal_code,
          phone: commerce.phone,
          email: commerce.email,
          commerce_type: commerce.commerce_type,
          hashgakha: commerce.hashgakha,
          basket_types: commerce.basket_types,
          commission_rate: commerce.commission_rate ?? 0,
          status: commerce.status,
          photos: commerce.photos,
          logo_url: commerce.logo_url,
        }}
        subscriptionStatus={subscription?.status ?? null}
        subscriptionPlan={(subscription?.plan as string) ?? null}
      />
    </div>
  );
}
