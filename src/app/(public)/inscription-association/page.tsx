"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KshareLogo } from "@/components/shared/kshare-logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { inscriptionAssociation } from "./_actions";

const schema = z
  .object({
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string().min(1, "Confirmation du mot de passe requise"),
    nomAsso: z.string().min(2, "Le nom de l'association est requis"),
    rna: z
      .string()
      .regex(/^W\d{9}$/, "Numéro RNA invalide (format : W123456789)"),
    adresse: z.string().min(5, "L'adresse est requise"),
    ville: z.string().min(2, "La ville est requise"),
    codePostal: z.string().regex(/^\d{5}$/, "Code postal invalide (5 chiffres)"),
    nomResponsable: z.string().min(2, "Le nom du responsable est requis"),
    telephone: z.string().regex(/^(\+33|0)[0-9]{9}$/, "Numéro de téléphone invalide"),
    cgu: z.boolean().refine((v) => v === true, { message: "Vous devez accepter les CGU" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function InscriptionAssociationPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const result = await inscriptionAssociation({
        email: data.email,
        password: data.password,
        nomAsso: data.nomAsso,
        rna: data.rna,
        adresse: data.adresse,
        ville: data.ville,
        codePostal: data.codePostal,
        nomResponsable: data.nomResponsable,
        telephone: data.telephone,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardContent className="pt-10 pb-10">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Demande enregistrée !</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Votre demande est bien enregistrée, nous reviendrons vers vous sous 24h pour valider votre compte association.
            </p>
            <Button asChild className="mt-6">
              <Link href="/connexion">Retour à la connexion</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 block"><KshareLogo size={32} /></Link>
          <CardTitle className="text-xl">Inscription association</CardTitle>
          <CardDescription>
            Accédez aux paniers dons des commerces casher partenaires
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Compte */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Informations de connexion</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@monassociation.org"
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
                    autoComplete="new-password"
                    {...register("password")}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Informations association */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Informations de l&apos;association</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="nomAsso">Nom de l&apos;association</Label>
                  <Input
                    id="nomAsso"
                    placeholder="Association Kol Be'Seder"
                    {...register("nomAsso")}
                  />
                  {errors.nomAsso && <p className="text-xs text-destructive">{errors.nomAsso.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rna">
                    Numéro RNA{" "}
                    <span className="text-muted-foreground font-normal">(ex: W123456789)</span>
                  </Label>
                  <Input
                    id="rna"
                    placeholder="W123456789"
                    {...register("rna")}
                  />
                  {errors.rna && <p className="text-xs text-destructive">{errors.rna.message}</p>}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="adresse">Adresse du siège</Label>
                  <Input
                    id="adresse"
                    placeholder="12 rue de la République"
                    {...register("adresse")}
                  />
                  {errors.adresse && <p className="text-xs text-destructive">{errors.adresse.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input id="ville" placeholder="Paris" {...register("ville")} />
                  {errors.ville && <p className="text-xs text-destructive">{errors.ville.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal</Label>
                  <Input id="codePostal" placeholder="75011" {...register("codePostal")} />
                  {errors.codePostal && (
                    <p className="text-xs text-destructive">{errors.codePostal.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomResponsable">Nom du responsable</Label>
                  <Input
                    id="nomResponsable"
                    placeholder="Prénom Nom"
                    {...register("nomResponsable")}
                  />
                  {errors.nomResponsable && (
                    <p className="text-xs text-destructive">{errors.nomResponsable.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="0612345678"
                    autoComplete="tel"
                    {...register("telephone")}
                  />
                  {errors.telephone && (
                    <p className="text-xs text-destructive">{errors.telephone.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* CGU */}
            <div className="flex items-start gap-3">
              <input
                id="cgu"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                {...register("cgu")}
              />
              <div>
                <Label htmlFor="cgu" className="cursor-pointer text-sm">
                  J&apos;accepte les{" "}
                  <Link href="/cgu" className="text-primary hover:underline font-medium">
                    Conditions Générales d&apos;Utilisation
                  </Link>{" "}
                  de Kshare
                </Label>
                {errors.cgu && (
                  <p className="text-xs text-destructive mt-1">{errors.cgu.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Envoyer ma demande d&apos;inscription
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Déjà inscrit ?{" "}
              <Link href="/connexion" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
