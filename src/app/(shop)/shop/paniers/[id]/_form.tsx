"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BASKET_TYPES, BASKET_STATUS_LABELS } from "@/lib/constants";
import { updateBasket, deleteBasket, toggleBasketStatus } from "./_actions";
import type { Database } from "@/types/database.types";

type Basket = Database["public"]["Tables"]["baskets"]["Row"];
type BasketType = Database["public"]["Enums"]["basket_type"];
type BasketDay = Database["public"]["Enums"]["basket_day"];
type BasketStatus = Database["public"]["Enums"]["basket_status"];

const schema = z
  .object({
    type: z.enum(["bassari", "halavi", "parve", "shabbat", "mix"] as const),
    day: z.enum(["today", "tomorrow"] as const),
    description: z.string().max(500).optional(),
    originalPrice: z.number({ error: "Prix invalide" }).positive("Le prix doit être positif"),
    soldPrice: z.number({ error: "Prix invalide" }).positive("Le prix doit être positif"),
    quantityTotal: z.number({ error: "Quantité invalide" }).int().min(1).max(100),
    pickupStart: z.string().min(1, "Requis"),
    pickupEnd: z.string().min(1, "Requis"),
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

interface BasketEditFormProps {
  basket: Basket;
}

export default function BasketEditForm({ basket }: BasketEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: basket.type as BasketType,
      day: basket.day as BasketDay,
      description: basket.description ?? "",
      originalPrice: basket.original_price,
      soldPrice: basket.sold_price,
      quantityTotal: basket.quantity_total,
      pickupStart: basket.pickup_start,
      pickupEnd: basket.pickup_end,
      isDonation: basket.is_donation,
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
      const result = await updateBasket(basket.id, {
        type: data.type as BasketType,
        day: data.day as BasketDay,
        description: data.description ?? "",
        originalPrice: data.originalPrice,
        soldPrice: data.soldPrice,
        quantityTotal: data.quantityTotal,
        pickupStart: data.pickupStart,
        pickupEnd: data.pickupEnd,
        isDonation: data.isDonation,
        status: basket.status as BasketStatus,
      });

      if (result.success) {
        toast.success("Panier mis à jour avec succès.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur inattendue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    setToggling(true);
    try {
      const result = await toggleBasketStatus(basket.id, basket.status as BasketStatus);
      if (result.success) {
        toast.success(
          basket.status === "disabled" ? "Panier réactivé." : "Panier désactivé."
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteBasket(basket.id);
    } catch (err) {
      const error = err as Error;
      if (!error.message?.includes("NEXT_REDIRECT")) {
        toast.error("Erreur lors de la suppression.");
        setDeleting(false);
        setDeleteOpen(false);
      }
    }
  }

  const typeConfig = BASKET_TYPES.find((t) => t.value === basket.type);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/shop/paniers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {typeConfig?.emoji} {typeConfig?.label}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={
                basket.status === "published"
                  ? "default"
                  : basket.status === "disabled"
                  ? "outline"
                  : "secondary"
              }
            >
              {BASKET_STATUS_LABELS[basket.status] ?? basket.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {basket.quantity_sold} vendus / {basket.quantity_total} total
            </span>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex gap-3 mb-6">
        <Button
          variant={basket.status === "disabled" ? "default" : "outline"}
          size="sm"
          onClick={handleToggleStatus}
          disabled={toggling || basket.status === "sold_out" || basket.status === "expired"}
        >
          {toggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {basket.status === "disabled" ? "Activer le panier" : "Désactiver le panier"}
        </Button>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer ce panier ?</DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Le panier et toutes ses données seront supprimés
                définitivement.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Supprimer définitivement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modifier le panier</CardTitle>
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
                        <SelectValue />
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
                        <SelectValue />
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
                Description <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Textarea
                id="description"
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
                ) : null}
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
                  {...register("quantityTotal", { valueAsNumber: true })}
                />
                {errors.quantityTotal && (
                  <p className="text-xs text-destructive">{errors.quantityTotal.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupStart">Retrait à partir de</Label>
                <Input id="pickupStart" type="time" {...register("pickupStart")} />
                {errors.pickupStart && (
                  <p className="text-xs text-destructive">{errors.pickupStart.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupEnd">Retrait jusqu&apos;à</Label>
                <Input id="pickupEnd" type="time" {...register("pickupEnd")} />
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
                Proposer comme don pour les associations
              </Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/shop/paniers">Annuler</Link>
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enregistrer les modifications
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
