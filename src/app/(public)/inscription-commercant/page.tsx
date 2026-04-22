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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { COMMERCE_TYPES, COMMERCE_SUBTYPES, HASHGAKHA_LIST } from "@/lib/constants";
import { inscriptionCommercant } from "./_actions";

const schema = z.object({
  nom: z.string().min(2, "Le nom du commerce est requis"),
  email: z.string().email("Email invalide"),
  commerceType: z.string().min(1, "Le type de commerce est requis"),
  adresse: z.string().min(5, "L'adresse est requise"),
  ville: z.string().min(2, "La ville est requise"),
  codePostal: z.string().regex(/^\d{5}$/, "Code postal invalide (5 chiffres)"),
  hashgakha: z.string().min(1, "La cacherout est requise"),
  telephone: z.string().regex(/^(\+33|0)[0-9]{9}$/, "Numéro de téléphone invalide"),
  siret: z.string().regex(/^\d{14}$/, "Le SIRET doit contenir 14 chiffres"),
  cgu: z.boolean().refine((v) => v === true, { message: "Vous devez accepter les CGU" }),
});

type FormValues = z.infer<typeof schema>;

export default function InscriptionCommercantPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [hashgakhaAutre, setHashgakhaAutre] = useState(false);
  const [selectedBaseType, setSelectedBaseType] = useState("");
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>([]);
  const [kbisFile, setKbisFile] = useState<File | null>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [fileErrors, setFileErrors] = useState<{ kbis?: string; idDoc?: string }>({});
  const kbisRef = useRef<HTMLInputElement>(null);
  const idDocRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    // Validate files client-side
    const fErrors: { kbis?: string; idDoc?: string } = {};
    if (!kbisFile) fErrors.kbis = "L'extrait KBIS est requis.";
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
      fd.append("nom", data.nom);
      fd.append("commerceType", data.commerceType);
      fd.append("adresse", data.adresse);
      fd.append("ville", data.ville);
      fd.append("codePostal", data.codePostal);
      fd.append("hashgakha", data.hashgakha);
      fd.append("telephone", data.telephone);
      fd.append("siret", data.siret);
      fd.append("kbis", kbisFile!);
      fd.append("idDocument", idDocFile!);

      const result = await inscriptionCommercant(fd);

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
      <div className="min-h-dvh flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardContent className="pt-10 pb-10">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Demande enregistrée !</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Votre demande est bien enregistrée, nous reviendrons vers vous sous 24h pour valider votre compte partenaire.
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
    <div className="min-h-dvh flex items-center justify-center bg-muted/30 px-4 py-12">
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
            {/* Informations commerce */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Informations du commerce</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="nom">Nom du commerce <span className="text-destructive">*</span></Label>
                  <Input
                    id="nom"
                    placeholder="Boucherie Lévy"
                    {...register("nom")}
                  />
                  {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="email">Email professionnel <span className="text-destructive">*</span></Label>
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
                  <Label htmlFor="commerceType">Type de commerce <span className="text-destructive">*</span></Label>
                  <Select onValueChange={(v) => {
                    setSelectedBaseType(v);
                    setSelectedSubtypes([]);
                    const subtypeConfig = COMMERCE_SUBTYPES[v];
                    if (subtypeConfig) {
                      setValue("commerceType", "", { shouldValidate: false });
                    } else {
                      setValue("commerceType", v, { shouldValidate: true });
                    }
                  }}>
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

                  {/* Sub-type selector for Restaurant / Traiteur */}
                  {selectedBaseType && COMMERCE_SUBTYPES[selectedBaseType] && (() => {
                    const config = COMMERCE_SUBTYPES[selectedBaseType];
                    return (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg border space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Précisez le type de {selectedBaseType.toLowerCase()} :
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {config.options.map((opt) => {
                            const isChecked = selectedSubtypes.includes(opt.value);
                            return (
                              <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                  type={config.multi ? "checkbox" : "radio"}
                                  name="commerceSubtype"
                                  value={opt.value}
                                  checked={isChecked}
                                  onChange={() => {
                                    let next: string[];
                                    if (config.multi) {
                                      next = isChecked
                                        ? selectedSubtypes.filter((s) => s !== opt.value)
                                        : [...selectedSubtypes, opt.value];
                                    } else {
                                      next = [opt.value];
                                    }
                                    setSelectedSubtypes(next);

                                    let compositeType = "";
                                    if (next.length === 0) {
                                      compositeType = "";
                                    } else if (config.multi && next.length === config.options.length) {
                                      compositeType = selectedBaseType;
                                    } else if (next.length === 1) {
                                      compositeType = `${selectedBaseType} ${next[0]}`;
                                    } else {
                                      compositeType = selectedBaseType;
                                    }
                                    setValue("commerceType", compositeType, { shouldValidate: true });
                                  }}
                                  className="h-4 w-4 accent-primary"
                                />
                                {opt.label}
                              </label>
                            );
                          })}
                        </div>
                        {config.multi && (
                          <p className="text-[11px] text-muted-foreground">
                            Vous pouvez sélectionner les deux options
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {errors.commerceType && (
                    <p className="text-xs text-destructive">{errors.commerceType.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hashgakha">Cacherout (supervision casher) <span className="text-destructive">*</span></Label>
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
                  <Label htmlFor="adresse">Adresse <span className="text-destructive">*</span></Label>
                  <Input
                    id="adresse"
                    placeholder="12 rue de la Paix"
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
                  <Input id="codePostal" placeholder="75001" {...register("codePostal")} />
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

                <div className="space-y-2">
                  <Label htmlFor="siret">Numéro SIRET <span className="text-destructive">*</span></Label>
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

            {/* Documents justificatifs */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Documents justificatifs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KBIS */}
                <div className="space-y-2">
                  <Label>Extrait KBIS <span className="text-destructive">*</span></Label>
                  <div
                    onClick={() => kbisRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-input bg-muted/30 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    {kbisFile ? (
                      <>
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm text-foreground truncate">{kbisFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">Choisir un fichier...</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={kbisRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => {
                      setKbisFile(e.target.files?.[0] ?? null);
                      setFileErrors((prev) => ({ ...prev, kbis: undefined }));
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">PDF, JPEG ou PNG — max 5 Mo</p>
                  {fileErrors.kbis && <p className="text-xs text-destructive">{fileErrors.kbis}</p>}
                </div>

                {/* Pièce d'identité */}
                <div className="space-y-2">
                  <Label>Pièce d&apos;identité du dirigeant <span className="text-destructive">*</span></Label>
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
