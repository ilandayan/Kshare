"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, FileSignature } from "lucide-react";
import { signerContrat } from "./_actions";

export default function ContractForm() {
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSign() {
    setError(null);
    startTransition(async () => {
      const result = await signerContrat();
      if (result.success) {
        router.push("/shop/dashboard");
      } else {
        setError(result.error ?? "Une erreur est survenue lors de la signature.");
      }
    });
  }

  return (
    <div className="mt-8 border-t border-border pt-8">
      {/* ── Checkbox ── */}
      <div className="flex items-start gap-3 mb-6">
        <input
          type="checkbox"
          id="accept-contract"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-[#3744C8] cursor-pointer"
        />
        <label
          htmlFor="accept-contract"
          className="text-sm font-medium text-foreground leading-relaxed cursor-pointer select-none"
        >
          J&apos;ai lu l&apos;intégralité du contrat de partenariat et j&apos;accepte
          l&apos;ensemble de ses termes et conditions.
        </label>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Button ── */}
      <Button
        onClick={handleSign}
        disabled={!accepted || isPending}
        size="lg"
        className="w-full bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] hover:from-[#2d38a8] hover:to-[#4f5fd8] text-white font-bold text-base h-14 rounded-xl shadow-lg"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Signature en cours...
          </>
        ) : (
          <>
            <FileSignature className="mr-2 h-5 w-5" />
            Signer le contrat
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-4">
        En signant ce contrat, vous acceptez une signature électronique horodatée
        ayant valeur juridique conformément au règlement eIDAS.
      </p>
    </div>
  );
}
