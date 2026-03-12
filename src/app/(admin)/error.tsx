"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-12 text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Impossible de charger cette page. Veuillez réessayer.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="bg-[#3744C8] hover:bg-[#2B38B8] text-white rounded-xl cursor-pointer">
            Réessayer
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/connexion?role=admin"} className="rounded-xl cursor-pointer">
            Se reconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}
