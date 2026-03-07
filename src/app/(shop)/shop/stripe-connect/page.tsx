import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Wallet, AlertCircle } from "lucide-react";

export default async function StripeConnectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("stripe_account_id, name")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) redirect("/connexion");

  const isConnected = Boolean(commerce.stripe_account_id);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Paiements Stripe Connect</h1>
        <p className="text-muted-foreground mt-1">
          Gérez la connexion de votre compte bancaire pour recevoir vos paiements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Compte bancaire</CardTitle>
              <CardDescription>
                Connectez votre IBAN pour recevoir vos reversements hebdomadaires
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Pour recevoir vos paiements, vous devez connecter votre compte bancaire via
              Stripe Connect. C'est{" "}
              <span className="font-medium text-foreground">gratuit et sécurisé</span>.
              Vos coordonnées bancaires sont gérées directement par Stripe — Kshare n'y
              a pas accès.
            </p>
          </div>

          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Compte Stripe connecté
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    Vous recevrez vos reversements chaque semaine sur votre compte.
                  </p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/api/stripe/connect/dashboard-link">
                  Gérer mon compte Stripe
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Compte non connecté
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                    Vous ne pouvez pas encore recevoir de paiements. Connectez votre
                    compte pour activer les ventes.
                  </p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/api/stripe/connect/onboard">
                  Connecter mon compte Stripe
                </Link>
              </Button>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Comment ça fonctionne ?
            </h3>
            <ol className="space-y-2">
              {[
                "Connectez votre compte bancaire via Stripe (formulaire sécurisé).",
                "Chaque vente de panier est encaissée par Stripe automatiquement.",
                "Kshare prélève sa commission et vous reverse le reste chaque semaine.",
              ].map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
