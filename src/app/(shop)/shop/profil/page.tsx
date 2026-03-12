import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Milk, Leaf, Wine, Layers, type LucideIcon } from "lucide-react";
import { BASKET_TYPES } from "@/lib/constants";
import { ShopProfileClient } from "@/components/shop/shop-profile-client";
import { ChangePasswordForm } from "@/components/shared/change-password-form";

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Milk, Leaf, Wine, Layers,
};

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id, name, address, postal_code, city, email, phone, commerce_type, hashgakha, basket_types, commission_rate, status, description")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) redirect("/inscription-commercant");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("commerce_id", commerce.id)
    .single();

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-8">Profil commerçant</h1>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Nom", value: commerce.name },
              { label: "Adresse", value: `${commerce.address}, ${commerce.postal_code} ${commerce.city}` },
              { label: "Email", value: commerce.email },
              { label: "Téléphone", value: commerce.phone ?? "—" },
              { label: "Type de commerce", value: commerce.commerce_type },
              { label: "Cacherout", value: commerce.hashgakha },
            ].map((field) => (
              <div key={field.label} className="flex gap-4">
                <span className="text-muted-foreground w-36 shrink-0">{field.label}</span>
                <span className="text-foreground font-medium">{field.value}</span>
              </div>
            ))}
            <div className="flex gap-4">
              <span className="text-muted-foreground w-36 shrink-0">Types de paniers</span>
              <div className="flex flex-wrap gap-2">
                {commerce.basket_types?.map((t: string) => {
                  const type = BASKET_TYPES.find((bt) => bt.value === t);
                  const Icon = type ? ICON_MAP[type.icon] : null;
                  return (
                    <Badge key={t} variant="secondary" className="inline-flex items-center gap-1.5">
                      {Icon && <Icon className="h-3.5 w-3.5" />} {type?.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Abonnement & Commission</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Statut abonnement", value: subscription?.status ?? "Non configuré" },
              { label: "Taux de commission", value: `${commerce.commission_rate} %` },
              { label: "Statut compte", value: commerce.status },
            ].map((field) => (
              <div key={field.label} className="flex gap-4">
                <span className="text-muted-foreground w-36 shrink-0">{field.label}</span>
                <span className="text-foreground font-medium capitalize">{field.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security — change password */}
        <Card>
          <CardHeader><CardTitle className="text-base">Sécurité</CardTitle></CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        {/* Edit profile section */}
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
          }}
        />
      </div>
    </div>
  );
}
