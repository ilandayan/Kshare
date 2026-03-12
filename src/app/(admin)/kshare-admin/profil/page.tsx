import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Shield,
  LogOut,
  Clock,
  KeyRound,
} from "lucide-react";
import { ChangePasswordForm } from "@/components/shared/change-password-form";

export default async function AdminProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email, created_at")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const displayName = profile?.full_name ?? "Administrateur Kshare";
  const displayEmail = profile?.email ?? user.email ?? "—";

  const lastSignIn = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : user.created_at
      ? new Date(user.created_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "—";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-8">
        Mon profil administrateur
      </h1>

      <div className="space-y-6">
        {/* ── Profile header ── */}
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#3744C8] rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-2xl leading-none">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {displayName}
              </h2>
              <p className="text-sm text-gray-500 truncate">{displayEmail}</p>
            </div>
            <Badge className="bg-[#3744C8]/10 text-[#3744C8] border-0 text-xs font-semibold">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </div>
        </div>

        {/* ── Personal information ── */}
        <Card className="rounded-2xl border border-[#e2e5f0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              {
                icon: User,
                label: "Nom complet",
                value: displayName,
              },
              {
                icon: Mail,
                label: "Email",
                value: displayEmail,
              },
              {
                icon: Shield,
                label: "Rôle",
                value: "Administrateur",
              },
              {
                icon: Clock,
                label: "Membre depuis",
                value: memberSince,
              },
            ].map((field) => (
              <div key={field.label} className="flex gap-4 items-center">
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

        {/* ── Security ── */}
        <Card className="rounded-2xl border border-[#e2e5f0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Sécurité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  Dernière connexion
                </span>
                <p className="text-foreground font-medium">{lastSignIn}</p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                <KeyRound className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <span className="text-muted-foreground text-xs">
                  Mot de passe
                </span>
                <div className="mt-1">
                  <ChangePasswordForm />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Actions ── */}
        <div className="flex justify-end">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
