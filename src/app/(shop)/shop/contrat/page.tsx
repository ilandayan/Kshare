import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { FileSignature } from "lucide-react";
import ContractContent from "./_contract-content";
import ContractForm from "./_contract-form";

export default async function ContratPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("name, contract_signed_at")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) redirect("/");

  // Déjà signé → dashboard
  if (commerce.contract_signed_at) {
    redirect("/shop/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F4F5F9] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3744C8] to-[#5B6EF5] mb-4 shadow-lg">
            <FileSignature className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Contrat de partenariat Kshare
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Avant d&apos;accéder à votre espace commerçant, veuillez lire et signer
            le contrat de partenariat ci-dessous.
          </p>
        </div>

        {/* ── Contract card ── */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            <ContractContent commerceName={commerce.name} />
            <ContractForm />
          </CardContent>
        </Card>

        {/* ── Footer note ── */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Une copie du contrat signé vous sera envoyée par email et sera
          consultable dans votre espace commerçant.
        </p>
      </div>
    </div>
  );
}
