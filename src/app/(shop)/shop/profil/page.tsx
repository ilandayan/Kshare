import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShopProfileClient } from "@/components/shop/shop-profile-client";
import { ChangePasswordForm } from "@/components/shared/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    .select("status")
    .eq("commerce_id", commerce.id)
    .single();

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-foreground mb-8">Profil commerçant</h1>

      {/* Main profile content — info left, images right */}
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
          commission_rate: commerce.commission_rate,
          status: commerce.status,
          photos: commerce.photos,
          logo_url: commerce.logo_url,
        }}
        subscriptionStatus={subscription?.status ?? null}
      />

      {/* Security — below the grid */}
      <div className="mt-4 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Sécurité</CardTitle></CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
