"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  TriangleAlert,
  Zap,
  Crown,
} from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import type { Database } from "@/types/database.types";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

interface SubscriptionData {
  status: SubscriptionStatus;
  current_period_end: string | null;
  monthly_price: number;
  plan?: string;
  pending_plan?: string | null;
  pending_plan_effective_at?: string | null;
}

interface AbonnementClientProps {
  subscriptionStatus: SubscriptionStatus | null;
  subscription: SubscriptionData | null;
  currentPlan: "starter" | "pro" | null;
  canChangePlan: boolean;
  nextChangeDate: string | null;
}

export default function AbonnementClient({
  subscriptionStatus,
  subscription,
  currentPlan,
  canChangePlan,
  nextChangeDate,
}: AbonnementClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<"starter" | "pro" | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const justSubscribed = searchParams.get("success") === "true";
  const wasCanceled = searchParams.get("canceled") === "true";

  const isActive =
    subscriptionStatus === "active" || subscriptionStatus === "offered";

  const nextBillingDate = subscription?.current_period_end
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(subscription.current_period_end))
    : null;

  async function handleSelectPlan(plan: "starter" | "pro") {
    setLoading(plan);
    setError(null);

    try {
      const endpoint = currentPlan
        ? "/api/stripe/subscription/change-plan"
        : "/api/stripe/subscription/create";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Erreur lors du changement de plan");
      }

      const data = (await response.json()) as { url?: string; success?: boolean };

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.success) {
        setShowConfirm(null);
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      setShowConfirm(null);
    } finally {
      setLoading(null);
    }
  }

  const pendingPlan = subscription?.pending_plan;
  const pendingEffectiveDate = subscription?.pending_plan_effective_at
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(subscription.pending_plan_effective_at))
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Abonnement</h1>
        <p className="text-muted-foreground mt-1">
          Choisissez le plan qui correspond à votre activité.
        </p>
      </div>

      {justSubscribed && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50 mb-6">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Plan activé avec succès !
          </p>
        </div>
      )}

      {wasCanceled && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 mb-6">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            Souscription annulée. Vous pouvez réessayer à tout moment.
          </p>
        </div>
      )}

      {pendingPlan && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 mb-6">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
          <p className="text-sm font-medium text-blue-800">
            Changement vers le plan {SUBSCRIPTION_PLANS[pendingPlan as "starter" | "pro"].name} prévu
            {pendingEffectiveDate ? ` le ${pendingEffectiveDate}` : " le mois prochain"}.
          </p>
        </div>
      )}

      {subscriptionStatus === "unpaid" && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 mb-6">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            Votre dernier paiement a échoué. Mettez à jour votre moyen de paiement.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 mb-6">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Starter */}
        <Card className={`relative ${currentPlan === "starter" ? "ring-2 ring-primary" : ""}`}>
          {currentPlan === "starter" && (
            <Badge className="absolute -top-2.5 left-4">Plan actuel</Badge>
          )}
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>{SUBSCRIPTION_PLANS.starter.name}</CardTitle>
                <CardDescription>{SUBSCRIPTION_PLANS.starter.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-foreground">
                {SUBSCRIPTION_PLANS.starter.monthlyPrice} €
                <span className="text-sm font-normal text-muted-foreground"> / mois</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {SUBSCRIPTION_PLANS.starter.commissionRate}% de commission par panier vendu
              </p>
            </div>

            <ul className="space-y-2">
              {[
                "Publication illimitée de paniers",
                "Tableau de bord et statistiques",
                "Paiements sécurisés via Stripe",
                "Reversements hebdomadaires",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {currentPlan !== "starter" && (
              <Button
                className="w-full cursor-pointer"
                variant={currentPlan === null ? "default" : "outline"}
                onClick={() => currentPlan ? setShowConfirm("starter") : handleSelectPlan("starter")}
                disabled={loading !== null || (!!currentPlan && !canChangePlan)}
              >
                {loading === "starter" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentPlan === null ? "Choisir Starter" : "Passer au Starter"}
              </Button>
            )}

            {currentPlan && !canChangePlan && currentPlan !== "starter" && nextChangeDate && (
              <p className="text-xs text-center text-muted-foreground">
                Changement possible à partir du {nextChangeDate}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className={`relative ${currentPlan === "pro" ? "ring-2 ring-primary" : ""}`}>
          {currentPlan === "pro" && (
            <Badge className="absolute -top-2.5 left-4">Plan actuel</Badge>
          )}
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>{SUBSCRIPTION_PLANS.pro.name}</CardTitle>
                <CardDescription>{SUBSCRIPTION_PLANS.pro.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-foreground">
                {SUBSCRIPTION_PLANS.pro.monthlyPrice} €
                <span className="text-sm font-normal text-muted-foreground"> / mois</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {SUBSCRIPTION_PLANS.pro.commissionRate}% de commission par panier vendu
              </p>
            </div>

            <ul className="space-y-2">
              {[
                "Tout le plan Starter",
                "Commission réduite (12% au lieu de 18%)",
                "Support prioritaire",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {currentPlan !== "pro" && (
              <Button
                className="w-full cursor-pointer"
                variant={currentPlan === null ? "default" : "outline"}
                onClick={() => currentPlan ? setShowConfirm("pro") : handleSelectPlan("pro")}
                disabled={loading !== null || (!!currentPlan && !canChangePlan)}
              >
                {loading === "pro" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentPlan === null ? "Choisir Pro — 29 €/mois" : "Passer au Pro"}
              </Button>
            )}

            {currentPlan && !canChangePlan && currentPlan !== "pro" && nextChangeDate && (
              <p className="text-xs text-center text-muted-foreground">
                Changement possible à partir du {nextChangeDate}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {isActive && currentPlan === "pro" && nextBillingDate && (
        <div className="text-center text-sm text-muted-foreground">
          Prochaine échéance : {nextBillingDate} — SEPA ou carte bancaire
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground mt-2">
        TVA non applicable — article 293B du CGI
      </p>

      {/* Confirm plan change modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <TriangleAlert className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Confirmer le changement
              </h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">
                Vous allez passer du plan{" "}
                <span className="font-medium text-foreground">
                  {currentPlan ? SUBSCRIPTION_PLANS[currentPlan].name : "—"}
                </span>{" "}
                au plan{" "}
                <span className="font-medium text-foreground">
                  {SUBSCRIPTION_PLANS[showConfirm].name}
                </span>.
              </p>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  Le changement prendra effet le mois prochain. Vous ne pourrez
                  pas changer de plan à nouveau pendant 1 an.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 cursor-pointer"
                onClick={() => setShowConfirm(null)}
                disabled={loading !== null}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 cursor-pointer"
                onClick={() => handleSelectPlan(showConfirm)}
                disabled={loading !== null}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
