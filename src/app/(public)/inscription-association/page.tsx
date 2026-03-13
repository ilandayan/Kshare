"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, CheckCircle2, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KshareLogo } from "@/components/shared/kshare-logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { inscriptionAssociation } from "./_actions";

const schema = z.object({
  nomAsso: z.string().min(2, "Le nom de l'association est requis"),
  email: z.string().email("Email invalide"),
  rna: z
    .string()
    .regex(/^W\d{9}$/, "Numéro RNA invalide (format : W123456789)"),
  adresse: z.string().min(5, "L'adresse est requise"),
  ville: z.string().min(2, "La ville est requise"),
  codePostal: z.string().regex(/^\d{5}$/, "Code postal invalide (5 chiffres)"),
  nomResponsable: z.string().min(2, "Le nom du responsable est requis"),
  telephone: z.string().regex(/^(\+33|0)[0-9]{9}$/, "Numéro de téléphone invalide"),
  cgu: z.boolean().refine((v) => v === true, { message: "Vous devez accepter les CGU" }),
});

type FormValues = z.infer<typeof schema>;

export default function InscriptionAssociationPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rnaFile, setRnaFile] = useState<File | null>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [fileErrors, setFileErrors] = useState<{ rna?: string; idDoc?: string }>({});
  const rnaFileRef = useRef<HTMLInputElement>(null);
  const idDocRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    // Validate files client-side
    const fErrors: { rna?: string; idDoc?: string } = {};
    if (!rnaFile) fErrors.rna = "Le récépissé RNA est requis.";
    if (!idDocFile) fErrors.idDoc = "La pièce d'identité est requise.";
    if (Object.keys(fErrors).length > 0) {
      setFileErrors(fErrors);
      return;
    }
    setFileErrors({});

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("email", data.email);
      fd.append("nomAsso", data.nomAsso);
      fd.append("rna", data.rna);
      fd.append("adresse", data.adresse);
      fd.append("ville", data.ville);
      fd.append("codePostal", data.codePostal);
      fd.append("nomResponsable", data.nomResponsable);
      fd.append("telephone", data.telephone);
      fd.append("rnaDocument", rnaFile!);
      fd.append("idDocument", idDocFile!);

      const result = await inscriptionAssociation(fd);

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
            <p className="text-muted-foreground text-sm leading-relaxed mt-2">
              Une fois validé, vous recevrez un email pour créer votre mot de passe et accéder à votre espace.
            </p>
            <Button asChild className="mt-6">
              <Link href="/">Retour à l&apos;accueil</Link>
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
            {/* Informations association */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Informations de l&apos;association</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="nomAsso">Nom de l&apos;association <span className="text-destructive">*</span></Label>
                  <Input
                    id="nomAsso"
                    placeholder="Association Kol Be'Seder"
                    {...register("nomAsso")}
                  />
                  {errors.nomAsso && <p className="text-xs text-destructive">{errors.nomAsso.message}</p>}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
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
                  <Label htmlFor="rna">
                    Numéro RNA <span className="text-destructive">*</span>{" "}
                    <span className="text-muted-foreground font-normal">(ex: W123456789)</span>
                  </Label>
                  <Input
                    id="rna"
                    placeholder="W123456789"
                    {...register("rna")}
                  />
                  {errors.rna && <p className="text-xs text-destructive">{errors.rna.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomResponsable">Nom du responsable <span className="text-destructive">*</span></Label>
                  <Input
                    id="nomResponsable"
                    placeholder="Prénom Nom"
                    {...register("nomResponsable")}
                  />
                  {errors.nomResponsable && (
                    <p className="text-xs text-destructive">{errors.nomResponsable.message}</p>
                  )}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="adresse">Adresse du siège <span className="text-destructive">*</span></Label>
                  <Input
                    id="adresse"
                    placeholder="12 rue de la République"
                    {...register("adresse")}
                  />
                  {errors.adresse && <p className="text-xs text-destructive">{errors.adresse.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ville">Ville <span className="text-destructive">*</span></Label>
                  <Input id="ville" placeholder="Paris" {...register("ville")} />
                  {errors.ville && <p className="text-xs text-destructive">{errors.ville.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal <span className="text-destructive">*</span></Label>
                  <Input id="codePostal" placeholder="75011" {...register("codePostal")} />
                  {errors.codePostal && (
                    <p className="text-xs text-destructive">{errors.codePostal.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone <span className="text-destructive">*</span></Label>
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

            {/* Documents justificatifs */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Documents justificatifs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Récépissé RNA */}
                <div className="space-y-2">
                  <Label>Récépissé RNA <span className="text-destructive">*</span></Label>
                  <div
                    onClick={() => rnaFileRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-input bg-muted/30 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    {rnaFile ? (
                      <>
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm text-foreground truncate">{rnaFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">Choisir un fichier...</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={rnaFileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => {
                      setRnaFile(e.target.files?.[0] ?? null);
                      setFileErrors((prev) => ({ ...prev, rna: undefined }));
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">PDF, JPEG ou PNG — max 5 Mo</p>
                  {fileErrors.rna && <p className="text-xs text-destructive">{fileErrors.rna}</p>}
                </div>

                {/* Pièce d'identité */}
                <div className="space-y-2">
                  <Label>Pièce d&apos;identité du président <span className="text-destructive">*</span></Label>
                  <div
                    onClick={() => idDocRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-input bg-muted/30 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    {idDocFile ? (
                      <>
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm text-foreground truncate">{idDocFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">Choisir un fichier...</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={idDocRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => {
                      setIdDocFile(e.target.files?.[0] ?? null);
                      setFileErrors((prev) => ({ ...prev, idDoc: undefined }));
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">PDF, JPEG ou PNG — max 5 Mo</p>
                  {fileErrors.idDoc && <p className="text-xs text-destructive">{fileErrors.idDoc}</p>}
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
              <Link href="/connexion?role=association" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
