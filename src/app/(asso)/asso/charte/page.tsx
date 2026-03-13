import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { FileSignature } from "lucide-react";
import CharterContent from "./_charter-content";
import CharterForm from "./_charter-form";

export default async function ChartePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: asso } = await supabase
    .from("associations")
    .select("name, charter_signed_at")
    .eq("profile_id", user.id)
    .single();

  if (!asso) redirect("/");

  if (asso.charter_signed_at) {
    redirect("/asso/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F4F5F9] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 mb-4 shadow-lg">
            <FileSignature className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Charte d&apos;engagement Kshare
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Avant d&apos;accéder à votre espace association, veuillez lire et signer
            la charte d&apos;engagement ci-dessous.
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            <CharterContent assoName={asso.name} />
            <CharterForm />
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Une copie de la charte signée vous sera envoyée par email et sera
          consultable dans votre espace association.
        </p>
      </div>
    </div>
  );
}
