"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, FileSignature } from "lucide-react";
import { signerCharte } from "./_actions";

export default function CharterForm() {
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSign() {
    setError(null);
    startTransition(async () => {
      const result = await signerCharte();
      if (result.success) {
        router.push("/asso/dashboard");
      } else {
        setError(result.error ?? "Une erreur est survenue lors de la signature.");
      }
    });
  }

  return (
    <div className="mt-8 border-t border-border pt-8">
      <div className="flex items-start gap-3 mb-6">
        <input
          type="checkbox"
          id="accept-charter"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
        />
        <label
          htmlFor="accept-charter"
          className="text-sm font-medium text-foreground leading-relaxed cursor-pointer select-none"
        >
          J&apos;ai lu l&apos;intégralité de la charte d&apos;engagement et j&apos;accepte
          l&apos;ensemble de ses termes et conditions.
        </label>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        onClick={handleSign}
        disabled={!accepted || isPending}
        size="lg"
        className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold text-base h-14 rounded-xl shadow-lg"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Signature en cours...
          </>
        ) : (
          <>
            <FileSignature className="mr-2 h-5 w-5" />
            Signer la charte
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-4">
        En signant cette charte, vous acceptez une signature électronique horodatée
        ayant valeur juridique conformément au règlement eIDAS.
      </p>
    </div>
  );
}
