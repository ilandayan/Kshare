"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock, Mail, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { demanderNouveauLien } from "./_actions";

function decodeHint(hint: string | null): string {
  if (!hint) return "";
  try {
    // base64url decode (browser)
    const padded = hint.replace(/-/g, "+").replace(/_/g, "/");
    return atob(padded);
  } catch {
    return "";
  }
}

function LienExpireContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupère l'email du compte depuis le hint (transmis par le callback Supabase).
  // Le champ est TOUJOURS lié au compte d'origine — aucune saisie manuelle possible.
  useEffect(() => {
    const hint = searchParams.get("hint");
    const decoded = decodeHint(hint);
    if (decoded && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded)) {
      setEmail(decoded);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const result = await demanderNouveauLien(email);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Erreur inattendue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-100 p-3">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-center">
            {success ? "Email envoyé !" : "Lien expiré"}
          </CardTitle>
          <CardDescription className="text-center">
            {success ? (
              <>
                Un nouveau lien va vous être envoyé dans quelques instants.
                Pensez à vérifier vos spams.
              </>
            ) : email ? (
              <>
                Le lien de création de mot de passe est valable 24 heures.
                Cliquez ci-dessous pour en recevoir un nouveau.
              </>
            ) : (
              <>
                Cette page n&apos;est accessible que via le lien reçu par email.
                Vérifiez votre boîte mail ou contactez-nous à{" "}
                <a href="mailto:contact@k-share.fr" className="text-primary underline">
                  contact@k-share.fr
                </a>.
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <p className="text-sm text-muted-foreground text-center">
                Vérifiez votre boîte mail{" "}
                <strong className="text-foreground">{email}</strong>
              </p>
              <a
                href="https://k-share.fr"
                className="text-sm text-primary hover:underline"
              >
                Retour à l&apos;accueil
              </a>
            </div>
          ) : email ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Adresse email du compte</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{email}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Le nouveau lien sera envoyé à l&apos;adresse de votre compte.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" disabled={loading} className="w-full gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Recevoir un nouveau lien
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Une fois reçu, le nouveau lien est valable 24 heures.
              </p>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <a
                href="https://k-share.fr"
                className="text-sm text-primary hover:underline"
              >
                Retour à l&apos;accueil
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LienExpirePage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <LienExpireContent />
    </Suspense>
  );
}
