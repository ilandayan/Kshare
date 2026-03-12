"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Heart,
  UtensilsCrossed,
  Milk,
  Leaf,
  Wine,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BASKET_TYPES } from "@/lib/constants";
import { createDonationBasket } from "./_actions";
import type { Database } from "@/types/database.types";

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Milk,
  Leaf,
  Wine,
  Layers,
};

type BasketType = Database["public"]["Enums"]["basket_type"];
type BasketDay = Database["public"]["Enums"]["basket_day"];

const schema = z
  .object({
    type: z.enum(["bassari", "halavi", "parve", "shabbat", "mix"] as const, {
      error: "Le type de panier est requis",
    }),
    day: z.enum(["today", "tomorrow"] as const, {
      error: "Le jour est requis",
    }),
    quantityTotal: z
      .number({ error: "Quantité invalide" })
      .int("La quantité doit être un entier")
      .min(1, "La quantité minimum est 1")
      .max(100, "La quantité maximum est 100"),
    pickupStart: z.string().min(1, "L'heure de début de retrait est requise"),
    pickupEnd: z.string().min(1, "L'heure de fin de retrait est requise"),
  })
  .refine((data) => data.pickupEnd > data.pickupStart, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ["pickupEnd"],
  });

type FormValues = z.infer<typeof schema>;

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45"];

export default function NouveauDonPage() {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      quantityTotal: 1,
    },
  });

  const selectedType = watch("type");
  const selectedTypeConfig = BASKET_TYPES.find((t) => t.value === selectedType);

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const typeDescription =
        BASKET_TYPES.find((t) => t.value === data.type)?.description ?? "";
      await createDonationBasket({
        type: data.type as BasketType,
        day: data.day as BasketDay,
        description: typeDescription,
        quantityTotal: data.quantityTotal,
        pickupStart: data.pickupStart,
        pickupEnd: data.pickupEnd,
      });
    } catch (err) {
      const error = err as Error;
      if (!error.message?.includes("NEXT_REDIRECT")) {
        toast.error(
          "Erreur lors de la création du panier don. Veuillez réessayer.",
        );
        setLoading(false);
      }
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/shop/paniers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="h-6 w-6 text-amber-600" />
            Proposer un don
          </h1>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 mb-6">
        <Heart className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-1">Panier don (Tsedaka / Mitzva)</p>
          <p className="text-amber-700">
            Ce panier sera mis à disposition des associations partenaires
            gratuitement. Aucun prix ne sera facturé.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Informations du panier don
            </CardTitle>
            <CardDescription>
              Renseignez le type de panier, la quantité et le créneau de retrait.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type et jour */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type de panier</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BASKET_TYPES.map((t) => {
                          const IconComp = ICON_MAP[t.icon];
                          return (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="inline-flex items-center gap-2">
                                {IconComp && (
                                  <IconComp className="h-4 w-4" />
                                )}
                                {t.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && (
                  <p className="text-xs text-destructive">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="day">Disponibilité</Label>
                <Controller
                  name="day"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger id="day">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">
                          Aujourd&apos;hui
                        </SelectItem>
                        <SelectItem value="tomorrow">Demain</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.day && (
                  <p className="text-xs text-destructive">
                    {errors.day.message}
                  </p>
                )}
              </div>
            </div>

            {/* Description automatique */}
            {selectedTypeConfig && (
              <div className="space-y-2">
                <Label>Description du panier</Label>
                <div className="rounded-lg border border-input bg-muted/50 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
                  {selectedTypeConfig.description}
                </div>
              </div>
            )}

            <Separator />

            {/* Quantité et horaires */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityTotal">Quantité disponible</Label>
                <Input
                  id="quantityTotal"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="5"
                  {...register("quantityTotal", { valueAsNumber: true })}
                />
                {errors.quantityTotal && (
                  <p className="text-xs text-destructive">
                    {errors.quantityTotal.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Retrait à partir de</Label>
                <Controller
                  name="pickupStart"
                  control={control}
                  render={({ field }) => {
                    const [h, m] = (field.value ?? ":").split(":");
                    return (
                      <div className="flex items-center gap-1">
                        <Select
                          value={h || undefined}
                          onValueChange={(v) =>
                            field.onChange(`${v}:${m || "00"}`)
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS.map((hr) => (
                              <SelectItem key={hr} value={hr}>
                                {hr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-lg font-semibold text-gray-400">
                          :
                        </span>
                        <Select
                          value={m || undefined}
                          onValueChange={(v) =>
                            field.onChange(`${h || "00"}:${v}`)
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {MINUTES.map((mn) => (
                              <SelectItem key={mn} value={mn}>
                                {mn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }}
                />
                {errors.pickupStart && (
                  <p className="text-xs text-destructive">
                    {errors.pickupStart.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Retrait jusqu&apos;à</Label>
                <Controller
                  name="pickupEnd"
                  control={control}
                  render={({ field }) => {
                    const [h, m] = (field.value ?? ":").split(":");
                    return (
                      <div className="flex items-center gap-1">
                        <Select
                          value={h || undefined}
                          onValueChange={(v) =>
                            field.onChange(`${v}:${m || "00"}`)
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS.map((hr) => (
                              <SelectItem key={hr} value={hr}>
                                {hr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-lg font-semibold text-gray-400">
                          :
                        </span>
                        <Select
                          value={m || undefined}
                          onValueChange={(v) =>
                            field.onChange(`${h || "00"}:${v}`)
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {MINUTES.map((mn) => (
                              <SelectItem key={mn} value={mn}>
                                {mn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }}
                />
                {errors.pickupEnd && (
                  <p className="text-xs text-destructive">
                    {errors.pickupEnd.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/shop/paniers">Annuler</Link>
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Heart className="mr-2 h-4 w-4" />
                )}
                Créer le panier don
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
