"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function ReconcileButton({ ordersWithoutFee }: { ordersWithoutFee: number }) {
  const [loading, setLoading] = useState(false);

  async function handleReconcile() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reconcile-stripe-fees", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la réconciliation");
        return;
      }

      toast.success(`${data.reconciled} commande(s) réconciliée(s) sur ${data.total}`);

      // Reload to refresh KPIs
      window.location.reload();
    } catch {
      toast.error("Erreur réseau lors de la réconciliation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleReconcile}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Réconcilier les frais Stripe ({ordersWithoutFee} commande{ordersWithoutFee > 1 ? "s" : ""})
    </Button>
  );
}
