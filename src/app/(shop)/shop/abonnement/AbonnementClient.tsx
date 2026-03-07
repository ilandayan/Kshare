"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { Database } from "@/types/database.types";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

interface SubscriptionData {
  status: SubscriptionStatus;
  current_period_end: string | null;
  monthly_price: number;
}

interface AbonnementClientProps {
  subscriptionStatus: SubscriptionStatus | null;
  subscription: SubscriptionData | null;
}

export default function AbonnementClient({
  subscriptionStatus,
  subscription,
}: AbonnementClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive =
    subscriptionStatus === "active" || subscriptionStatus === "offered";

  const nextBillingDate = subscription?.current_period_end
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(subscription.current_period_end))
    : null;

  const statusLabels: Record<SubscriptionStatus, string> = {
    active: "Actif",
    offered: "Offert",
    unpaid: "Impayé",
    cancellation_requested: "Annulation demandée",
  };

  const statusVariants: Record<
    SubscriptionStatus,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    active: "default",
    offered: "secondary",
    unpaid: "destructive",
    cancellation_requested: "outline",
  };

  async function handleSubscribe() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/subscription/create", {
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Erreur lors de la création de l'abonnement");
      }

      const data = (await response.json()) as { clientSecret: string };

      if (!data.clientSecret) {
        throw new Error("Secret de configuration manquant");
      }

      // Redirect user to Stripe-hosted SEPA setup page
      // In a full integration, you'd use Stripe.js IbanElement here.
      // For now, we surface the client secret to guide the next step.
      setError(
        "Configuration SEPA initiée. Intégration Stripe.js requise côté client pour saisir l'IBAN."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Abonnement</h1>
        <p className="text-muted-foreground mt-1">
          Gérez votre abonnement mensuel Kshare.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Abonnement commerçant</CardTitle>
                <CardDescription>30 € / mois par prélèvement SEPA</CardDescription>
              </div>
            </div>
            {subscriptionStatus && (
              <Badge variant={statusVariants[subscriptionStatus]}>
                {statusLabels[subscriptionStatus]}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isActive ? (
            <>
              <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Abonnement actif
                  </p>
                  {nextBillingDate && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                      Prochaine échéance : {nextBillingDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Montant mensuel</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {subscription?.monthly_price ?? 30} €
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Mode de paiement</p>
                  <p className="text-sm font-medium text-foreground mt-1">SEPA Direct Debit</p>
                </div>
              </div>

              <Button variant="outline" className="w-full" disabled>
                Annuler l'abonnement
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Pour annuler votre abonnement, contactez notre support.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  L'abonnement commerçant vous permet de publier des paniers et d'accéder
                  à toutes les fonctionnalités Kshare.{" "}
                  <span className="font-medium text-foreground">
                    30 € / mois
                  </span>{" "}
                  prélevés par SEPA. Annulable à tout moment.
                </p>
              </div>

              {subscriptionStatus === "unpaid" && (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Votre dernier paiement a échoué. Mettez à jour votre moyen de
                    paiement pour continuer à utiliser Kshare.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Ce qui est inclus
                </h3>
                <ul className="space-y-2">
                  {[
                    "Publication illimitée de paniers invendus",
                    "Tableau de bord et statistiques avancées",
                    "Paiements sécurisés via Stripe",
                    "Reversements hebdomadaires automatiques",
                    "Support prioritaire",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className="w-full"
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Souscrire — 30 € / mois
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Paiement sécurisé par SEPA Direct Debit via Stripe. Sans engagement.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
