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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { COMMERCE_TYPES, HASHGAKHA_LIST } from "@/lib/constants";
import { inscriptionCommercant } from "./_actions";

const schema = z
  .object({
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string().min(1, "Confirmation du mot de passe requise"),
    nom: z.string().min(2, "Le nom du commerce est requis"),
    commerceType: z.string().min(1, "Le type de commerce est requis"),
    adresse: z.string().min(5, "L'adresse est requise"),
    ville: z.string().min(2, "La ville est requise"),
    codePostal: z.string().regex(/^\d{5}$/, "Code postal invalide (5 chiffres)"),
    hashgakha: z.string().min(1, "La cacherout est requise"),
    telephone: z.string().regex(/^(\+33|0)[0-9]{9}$/, "Numéro de téléphone invalide"),
    siret: z.string().regex(/^\d{14}$/, "Le SIRET doit contenir 14 chiffres"),
    cgu: z.boolean().refine((v) => v === true, { message: "Vous devez accepter les CGU" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function InscriptionCommercantPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [hashgakhaAutre, setHashgakhaAutre] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const result = await inscriptionCommercant({
        email: data.email,
        password: data.password,
        nom: data.nom,
        commerceType: data.commerceType,
        adresse: data.adresse,
        ville: data.ville,
        codePostal: data.codePostal,
        hashgakha: data.hashgakha,
        telephone: data.telephone,
        siret: data.siret,
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
              Votre demande est bien enregistrée, nous reviendrons vers vous sous 24h pour valider votre compte partenaire.
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
          <CardTitle className="text-xl">Inscription commerce partenaire</CardTitle>
          <CardDescription>
            Rejoignez notre réseau de commerces casher et réduisez vos invendus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Compte */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Informations de connexion</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="email">Email professionnel</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@moncommerce.fr"
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

            {/* Informations commerce */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Informations du commerce</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="nom">Nom du commerce</Label>
                  <Input
                    id="nom"
                    placeholder="Boucherie Lévy"
                    {...register("nom")}
                  />
                  {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commerceType">Type de commerce</Label>
                  <Select onValueChange={(v) => setValue("commerceType", v, { shouldValidate: true })}>
                    <SelectTrigger id="commerceType">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMERCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.commerceType && (
                    <p className="text-xs text-destructive">{errors.commerceType.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hashgakha">Cacherout (supervision casher)</Label>
                  <Select onValueChange={(v) => {
                    if (v === "Autre") {
                      setHashgakhaAutre(true);
                      setValue("hashgakha", "", { shouldValidate: false });
                    } else {
                      setHashgakhaAutre(false);
                      setValue("hashgakha", v, { shouldValidate: true });
                    }
                  }}>
                    <SelectTrigger id="hashgakha">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {HASHGAKHA_LIST.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hashgakhaAutre && (
                    <Input
                      placeholder="Précisez la cacherout..."
                      {...register("hashgakha")}
                      className="mt-2"
                    />
                  )}
                  {errors.hashgakha && (
                    <p className="text-xs text-destructive">{errors.hashgakha.message}</p>
                  )}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    placeholder="12 rue de la Paix"
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
                  <Input id="codePostal" placeholder="75001" {...register("codePostal")} />
                  {errors.codePostal && (
                    <p className="text-xs text-destructive">{errors.codePostal.message}</p>
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

                <div className="space-y-2">
                  <Label htmlFor="siret">Numéro SIRET</Label>
                  <Input
                    id="siret"
                    placeholder="12345678901234"
                    {...register("siret")}
                  />
                  {errors.siret && <p className="text-xs text-destructive">{errors.siret.message}</p>}
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
              Déjà partenaire ?{" "}
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
