"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import { KshareLogo } from "@/components/shared/kshare-logo";
import Link from "next/link";

export default function ReinitialiserMotDePassePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(
        updateError.message.includes("same_password")
          ? "Le nouveau mot de passe doit etre different de l'ancien."
          : "Erreur lors de la reinitialisation. Le lien a peut-etre expire. Veuillez reessayer."
      );
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);

    // Redirect after 3 seconds
    setTimeout(() => router.push("/connexion"), 3000);
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
        <div className="w-full max-w-[420px]">
          <div className="bg-white rounded-3xl shadow-sm border border-[#e2e5f0]/60 px-8 pt-10 pb-8">
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-[#3744C8] rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <Lock className="h-7 w-7 text-white" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <KshareLogo size={28} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                Nouveau mot de passe
              </h1>
              <p className="text-sm text-gray-400 text-center leading-relaxed">
                Choisissez un nouveau mot de passe securise pour votre compte
              </p>
            </div>

            {done ? (
              /* Success state */
              <div className="flex flex-col items-center text-center py-2">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle className="h-7 w-7 text-emerald-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Mot de passe modifie !
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Votre mot de passe a ete reinitialise avec succes. Vous allez
                  etre redirige vers la page de connexion...
                </p>
                <Link
                  href="/connexion"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#3744C8] hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Aller a la connexion
                </Link>
              </div>
            ) : (
              /* Form state */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="Minimum 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] pl-10 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 focus:border-[#3744C8] transition-colors"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="Confirmez votre mot de passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 focus:border-[#3744C8] transition-colors"
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
                  disabled={loading || !password || !confirmPassword}
                  className="w-full h-11 rounded-xl font-semibold text-sm text-white shadow-sm mt-1 border-0 cursor-pointer"
                  style={{
                    background:
                      "linear-gradient(135deg, #3744C8 0%, #2B38B8 100%)",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reinitialisation...
                    </>
                  ) : (
                    "Reinitialiser le mot de passe"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
