import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Map,
  Gift,
  ShoppingBag,
  Users,
  CalendarDays,
} from "lucide-react";
import { DEPARTMENTS } from "@/lib/constants";
import { EditAssoProfile } from "@/components/asso/edit-asso-profile";
import { ChangePasswordForm } from "@/components/shared/change-password-form";

export default async function AssoProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "association") redirect("/");

  const { data: asso } = await supabase
    .from("associations")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  // Fetch stats: reservations and received baskets
  const assoId = asso?.id;

  const { count: totalReservations } = assoId
    ? await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("association_id", assoId)
        .eq("is_donation", true)
    : { count: 0 };

  const { data: pickedUpOrders } = assoId
    ? await supabase
        .from("orders")
        .select("quantity, total_amount")
        .eq("association_id", assoId)
        .eq("is_donation", true)
        .eq("status", "picked_up")
    : { data: [] };

  const paniersReceived = (pickedUpOrders ?? []).reduce(
    (sum, o) => sum + (o.quantity ?? 1),
    0
  );

  // Empty state when no association record exists
  if (!asso) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          Profil de l&apos;association
        </h1>
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Profil non configuré
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Votre profil d&apos;association n&apos;est pas encore renseigné.
            Veuillez contacter l&apos;équipe Kshare pour finaliser votre inscription.
          </p>
        </div>
      </div>
    );
  }

  const createdAt = asso.created_at
    ? new Date(asso.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const statusLabel: Record<string, string> = {
    pending: "En attente de validation",
    validated: "Validée",
    rejected: "Refusée",
    suspended: "Suspendue",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    validated: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    suspended: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-8">
        Profil de l&apos;association
      </h1>

      <div className="space-y-6">
        {/* ── General information ── */}
        <Card className="rounded-2xl border border-[#e2e5f0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <span className="text-muted-foreground text-xs">
                  Nom de l&apos;association
                </span>
                <p className="text-foreground font-medium">{asso.name}</p>
              </div>
              <Badge
                className={`${statusColor[asso.status] ?? "bg-gray-100 text-gray-600"} border-0 text-xs`}
              >
                {statusLabel[asso.status] ?? asso.status}
              </Badge>
            </div>

            {[
              {
                icon: Mail,
                label: "Email",
                value: profile?.email ?? "—",
              },
              {
                icon: Phone,
                label: "Contact",
                value: asso.contact ?? "—",
              },
              {
                icon: MapPin,
                label: "Adresse",
                value:
                  asso.address && asso.city
                    ? `${asso.address}, ${asso.city}`
                    : "—",
              },
              {
                icon: Map,
                label: "Département",
                value: asso.department
                  ? `${DEPARTMENTS.find((d) => d.code === asso.department)?.label ?? asso.department} (${asso.department})`
                  : "—",
              },
              {
                icon: CalendarDays,
                label: "Inscrite depuis",
                value: createdAt,
              },
            ].map((field) => (
              <div key={field.label} className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                  <field.icon className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">
                    {field.label}
                  </span>
                  <p className="text-foreground font-medium">{field.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Activity stats ── */}
        <Card className="rounded-2xl border border-[#e2e5f0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Activité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: ShoppingBag,
                  label: "Réservations",
                  value: (totalReservations ?? 0).toString(),
                  iconBg: "bg-blue-100",
                  iconColor: "text-blue-600",
                },
                {
                  icon: Gift,
                  label: "Paniers reçus",
                  value: paniersReceived.toString(),
                  iconBg: "bg-purple-100",
                  iconColor: "text-purple-600",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-gray-50 rounded-xl p-4 text-center"
                >
                  <div
                    className={`w-10 h-10 ${stat.iconBg} rounded-xl flex items-center justify-center mx-auto mb-2`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Impact social card ── */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-lg">Merci pour votre engagement !</h3>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            Grâce à votre association, des familles bénéficient de paniers
            alimentaires casher de qualité. Ensemble, nous luttons contre le
            gaspillage et renforçons la solidarité communautaire.
          </p>
        </div>

        {/* ── Security — change password ── */}
        <Card className="rounded-2xl border border-[#e2e5f0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Sécurité</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        {/* ── Edit profile ── */}
        <EditAssoProfile
          asso={{
            name: asso.name,
            address: asso.address,
            city: asso.city,
            contact: asso.contact,
            zone_region: asso.zone_region,
            department: asso.department,
          }}
        />
      </div>
    </div>
  );
}
