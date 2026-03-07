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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function ConnexionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

    // Redirect based on role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    const redirectMap: Record<string, string> = {
      commerce: "/shop/dashboard",
      association: "/asso/paniers-dons",
      admin: "/kshare-admin",
      client: "/",
    };

    router.push(redirectMap[profile?.role ?? "client"] ?? "/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <Link href="/" className="text-2xl font-bold text-primary mb-2 block">Kshare</Link>
          <CardTitle className="text-xl">Connexion</CardTitle>
          <CardDescription>Accédez à votre espace Kshare</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.fr"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Se connecter
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
            <div>
              Pas encore partenaire ?{" "}
              <Link href="/inscription-commercant" className="text-primary hover:underline font-medium">
                Inscrivez votre commerce
              </Link>
            </div>
            <div>
              Vous êtes une association ?{" "}
              <Link href="/inscription-association" className="text-primary hover:underline font-medium">
                Créer un compte association
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
