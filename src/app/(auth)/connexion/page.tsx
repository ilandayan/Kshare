"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Mail, Lock, Eye, EyeOff, Store } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function ConnexionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    const supabase = createClient();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      toast.error("Identifiants invalides. Vérifiez votre email et mot de passe.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    const redirectMap: Record<string, string> = {
      commerce:    "/shop/dashboard",
      association: "/asso/paniers-dons",
      admin:       "/kshare-admin",
      client:      "/",
    };

    router.push(redirectMap[profile?.role ?? "client"] ?? "/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#EEF0F8] flex flex-col">

      {/* ── Top bar ── */}
      <div className="px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#3744C8] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      {/* ── Centered card ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          <div className="bg-white rounded-3xl shadow-sm border border-[#e2e5f0]/60 px-8 pt-10 pb-8">

            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              {/* Store icon */}
              <div className="w-14 h-14 bg-[#3744C8] rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <Store className="h-7 w-7 text-white" />
              </div>

              {/* Kshare logo */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-[#3744C8] rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs leading-none">K</span>
                </div>
                <span className="font-bold text-gray-900 text-lg">Kshare</span>
              </div>

              <h1 className="text-xl font-bold text-gray-900 mb-1">Espace Commerçant</h1>
              <p className="text-sm text-gray-400">Connectez-vous pour gérer vos paniers</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 focus:border-[#3744C8] transition-colors"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] pl-10 pr-11 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 focus:border-[#3744C8] transition-colors"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Remember me + forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#e2e5f0] accent-[#3744C8]"
                    {...register("rememberMe")}
                  />
                  <span className="text-sm text-gray-500">Se souvenir de moi</span>
                </label>
                <Link
                  href="/mot-de-passe-oublie"
                  className="text-sm text-[#3744C8] hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-semibold text-sm shadow-sm mt-1"
                style={{ background: "linear-gradient(135deg, #3744C8 0%, #2B38B8 100%)" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion…
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 border-t border-[#e2e5f0]" />

            {/* Sign up link */}
            <p className="text-center text-sm text-gray-500">
              Pas encore de compte ?{" "}
              <Link href="/inscription-commercant" className="text-[#3744C8] font-semibold hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>

          {/* CGU */}
          <p className="text-center text-xs text-gray-400 mt-4 px-4 leading-relaxed">
            En vous connectant,{" "}
            <Link href="/cgu" className="text-[#3744C8] hover:underline">
              vous acceptez nos conditions d&apos;utilisation
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
