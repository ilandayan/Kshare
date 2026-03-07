"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BASKET_TYPES } from "@/lib/constants";
import { createBasket } from "./_actions";
import type { Database } from "@/types/database.types";

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
    description: z.string().max(500, "La description ne doit pas dépasser 500 caractères").optional(),
    originalPrice: z
      .number({ error: "Prix invalide" })
      .positive("Le prix doit être positif"),
    soldPrice: z
      .number({ error: "Prix invalide" })
      .positive("Le prix doit être positif"),
    quantityTotal: z
      .number({ error: "Quantité invalide" })
      .int("La quantité doit être un entier")
      .min(1, "La quantité minimum est 1")
      .max(100, "La quantité maximum est 100"),
    pickupStart: z.string().min(1, "L'heure de début de retrait est requise"),
    pickupEnd: z.string().min(1, "L'heure de fin de retrait est requise"),
    isDonation: z.boolean(),
  })
  .refine((data) => data.soldPrice < data.originalPrice, {
    message: "Le prix de vente doit être inférieur au prix original",
    path: ["soldPrice"],
  })
  .refine((data) => data.pickupEnd > data.pickupStart, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ["pickupEnd"],
  });

type FormValues = z.infer<typeof schema>;

export default function NouveauPanierPage() {
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
      isDonation: false,
      quantityTotal: 1,
    },
  });

  const originalPrice = watch("originalPrice");
  const soldPrice = watch("soldPrice");

  const reduction =
    originalPrice && soldPrice && originalPrice > 0 && soldPrice < originalPrice
      ? Math.round(((originalPrice - soldPrice) / originalPrice) * 100)
      : null;

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      await createBasket({
        type: data.type as BasketType,
        day: data.day as BasketDay,
        description: data.description ?? "",
        originalPrice: data.originalPrice,
        soldPrice: data.soldPrice,
        quantityTotal: data.quantityTotal,
        pickupStart: data.pickupStart,
        pickupEnd: data.pickupEnd,
        isDonation: data.isDonation,
      });
    } catch (err) {
      // redirect() throws — if it's a redirect error, let Next.js handle it
      const error = err as Error;
      if (!error.message?.includes("NEXT_REDIRECT")) {
        toast.error("Erreur lors de la création du panier. Veuillez réessayer.");
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
        <h1 className="text-2xl font-bold text-foreground">Nouveau panier</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations du panier</CardTitle>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BASKET_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.emoji} {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="day">Disponibilité</Label>
                <Controller
                  name="day"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="day">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                        <SelectItem value="tomorrow">Demain</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.day && <p className="text-xs text-destructive">{errors.day.message}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Panier surprise du vendredi — assortiment de viandes et spécialités..."
                rows={3}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <Separator />

            {/* Prix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Prix original (€)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="25.00"
                  {...register("originalPrice", { valueAsNumber: true })}
                />
                {errors.originalPrice && (
                  <p className="text-xs text-destructive">{errors.originalPrice.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="soldPrice">Prix de vente (€)</Label>
                <Input
                  id="soldPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="10.00"
                  {...register("soldPrice", { valueAsNumber: true })}
                />
                {errors.soldPrice && (
                  <p className="text-xs text-destructive">{errors.soldPrice.message}</p>
                )}
              </div>

              <div className="pb-0.5">
                {reduction !== null ? (
                  <div className="inline-flex items-center px-3 py-2 bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-lg text-sm font-semibold">
                    -{reduction}% de réduction
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    La réduction s&apos;affichera ici
                  </div>
                )}
              </div>
            </div>

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
                  <p className="text-xs text-destructive">{errors.quantityTotal.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupStart">Retrait à partir de</Label>
                <Input
                  id="pickupStart"
                  type="time"
                  {...register("pickupStart")}
                />
                {errors.pickupStart && (
                  <p className="text-xs text-destructive">{errors.pickupStart.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupEnd">Retrait jusqu&apos;à</Label>
                <Input
                  id="pickupEnd"
                  type="time"
                  {...register("pickupEnd")}
                />
                {errors.pickupEnd && (
                  <p className="text-xs text-destructive">{errors.pickupEnd.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Don */}
            <div className="flex items-center gap-3">
              <input
                id="isDonation"
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                {...register("isDonation")}
              />
              <Label htmlFor="isDonation" className="cursor-pointer">
                Proposer ce panier comme don pour les associations{" "}
                <span className="text-muted-foreground font-normal">(tsedaka / mitzva)</span>
              </Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/shop/paniers">Annuler</Link>
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Créer le panier
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
