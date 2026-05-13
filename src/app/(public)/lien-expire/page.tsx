"use client";

import { useState } from "react";
import { Clock, Mail, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { demanderNouveauLien } from "./_actions";

export default function LienExpirePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
                Si votre adresse correspond à un compte validé, vous allez recevoir un
                nouveau lien dans quelques instants. Pensez à vérifier vos spams.
              </>
            ) : (
              <>
                Le lien de création de mot de passe est valable 24 heures. Si vous l&apos;avez
                reçu il y a plus longtemps, renseignez votre email pour en recevoir un nouveau.
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
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email du compte</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="contact@moncommerce.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" disabled={loading || !email} className="w-full gap-2">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
