"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { KshareLogo } from "@/components/shared/kshare-logo";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
      }
    );

    if (resetError) {
      setError(
        "Une erreur est survenue. Veuillez verifier votre adresse email et reessayer."
      );
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#EEF0F8] flex flex-col">
      {/* Top bar */}
      <div className="px-6 pt-6">
        <Link
          href="/connexion"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#3744C8] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a la connexion
        </Link>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px] anim-hidden animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-sm border border-[#e2e5f0]/60 px-8 pt-10 pb-8">
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              {/* Mail icon */}
              <div className="w-14 h-14 bg-[#3744C8] rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <Mail className="h-7 w-7 text-white" />
              </div>

              {/* Kshare logo */}
              <div className="flex items-center gap-2 mb-3">
                <KshareLogo size={28} />
              </div>

              <h1 className="text-xl font-bold text-gray-900 mb-1">
                Mot de passe oublie
              </h1>
              <p className="text-sm text-gray-400 text-center leading-relaxed">
                Entrez votre adresse email et nous vous enverrons un lien pour
                reinitialiser votre mot de passe
              </p>
            </div>

            {submitted ? (
              /* Success state */
              <div className="flex flex-col items-center text-center py-2">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle className="h-7 w-7 text-emerald-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Email envoye !
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Verifiez votre boite de reception et cliquez sur le lien pour
                  reinitialiser votre mot de passe. Si vous ne trouvez pas
                  l&apos;email, pensez a verifier vos spams.
                </p>
                <Link
                  href="/connexion"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#3744C8] hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour a la connexion
                </Link>
              </div>
            ) : (
              /* Form state */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Adresse email
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      placeholder="votre@email.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 focus:border-[#3744C8] transition-colors"
                      aria-label="Adresse email pour la reinitialisation"
                    />
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <p className="text-xs text-red-500 text-center" role="alert">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-11 rounded-xl font-semibold text-sm text-white shadow-sm mt-1 border-0 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #3744C8 0%, #2B38B8 100%)",
                  }}
                  aria-label="Envoyer le lien de reinitialisation"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer le lien"
                  )}
                </Button>

                {/* Divider */}
                <div className="my-6 border-t border-[#e2e5f0]" />

                {/* Back to login */}
                <p className="text-center text-sm text-gray-500">
                  Vous vous souvenez de votre mot de passe ?{" "}
                  <Link
                    href="/connexion"
                    className="text-[#3744C8] font-semibold hover:underline"
                  >
                    Se connecter
                  </Link>
                </p>
              </form>
            )}
          </div>

          {/* Footer hint */}
          <p className="text-center text-xs text-gray-400 mt-4 px-4 leading-relaxed">
            Le lien de reinitialisation est valable pendant 24 heures.
          </p>
        </div>
      </div>
    </div>
  );
}
