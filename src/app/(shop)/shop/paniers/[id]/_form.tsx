"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, Send, UtensilsCrossed, Milk, Leaf, Wine, Layers, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { updateBasket, deleteBasket, toggleBasketStatus, publishBasket } from "./_actions";
import type { Database } from "@/types/database.types";

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Milk, Leaf, Wine, Layers,
};

type Basket = Database["public"]["Tables"]["baskets"]["Row"];
type BasketType = Database["public"]["Enums"]["basket_type"];
type BasketDay = Database["public"]["Enums"]["basket_day"];
type BasketStatus = Database["public"]["Enums"]["basket_status"];

const baseSchema = z.object({
  type: z.enum(["bassari", "halavi", "parve", "shabbat", "mix"] as const),
  day: z.enum(["today", "tomorrow"] as const),
  originalPrice: z.number({ error: "Prix invalide" }).min(0),
  soldPrice: z.number({ error: "Prix invalide" }).min(0),
  quantityTotal: z.number({ error: "Quantité invalide" }).int().min(1).max(100),
  pickupStart: z.string().min(1, "Requis"),
  pickupEnd: z.string().min(1, "Requis"),
  isDonation: z.boolean(),
});

const schema = baseSchema
  .refine((data) => data.isDonation || data.soldPrice > 0, {
    message: "Le prix de vente doit être positif",
    path: ["soldPrice"],
  })
  .refine((data) => data.isDonation || data.originalPrice > 0, {
    message: "Le prix original doit être positif",
    path: ["originalPrice"],
  })
  .refine((data) => data.isDonation || data.soldPrice < data.originalPrice, {
    message: "Le prix de vente doit être inférieur au prix original",
    path: ["soldPrice"],
  })
  .refine((data) => data.isDonation || data.soldPrice <= data.originalPrice * 0.8, {
    message: "La réduction doit être d'au moins 20 %",
    path: ["soldPrice"],
  })
  .refine((data) => data.pickupEnd > data.pickupStart, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ["pickupEnd"],
  });

type FormValues = z.infer<typeof schema>;

// Heures (00→23) et minutes (00, 15, 30, 45)
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

interface BasketEditFormProps {
  basket: Basket;
}

export default function BasketEditForm({ basket }: BasketEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [publishing, setPublishing] = useState(false);
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
      originalPrice: basket.original_price,
      soldPrice: basket.sold_price,
      quantityTotal: basket.quantity_total,
      pickupStart: basket.pickup_start,
      pickupEnd: basket.pickup_end,
      isDonation: basket.is_donation,
    },
  });

  const selectedType = watch("type");
  const originalPrice = watch("originalPrice");
  const soldPrice = watch("soldPrice");

  const selectedTypeConfig = BASKET_TYPES.find((t) => t.value === selectedType);

  const reduction =
    originalPrice && soldPrice && originalPrice > 0 && soldPrice < originalPrice
      ? Math.round(((originalPrice - soldPrice) / originalPrice) * 100)
      : null;

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const typeDescription = BASKET_TYPES.find((t) => t.value === data.type)?.description ?? "";
      const result = await updateBasket(basket.id, {
        type: data.type as BasketType,
        day: data.day as BasketDay,
        description: typeDescription,
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

  async function handlePublish() {
    setPublishing(true);
    try {
      const result = await publishBasket(basket.id);
      if (result.success) {
        toast.success("Panier publié avec succès !");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setPublishing(false);
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {typeConfig && ICON_MAP[typeConfig.icon] && (() => { const Icon = ICON_MAP[typeConfig.icon]; return <Icon className="h-6 w-6 text-[#3744C8]" />; })()}
            {typeConfig?.label}
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
        {basket.status === "draft" && (
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing}
            className="bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] hover:from-[#2d39a3] hover:to-[#4a5cd4] text-white border-0"
          >
            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Publier le panier
          </Button>
        )}

        <Button
          variant={basket.status === "disabled" ? "default" : "outline"}
          size="sm"
          onClick={handleToggleStatus}
          disabled={toggling || basket.status === "sold_out" || basket.status === "expired" || basket.status === "draft"}
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
                        {BASKET_TYPES.map((t) => {
                          const IconComp = ICON_MAP[t.icon];
                          return (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="inline-flex items-center gap-2">
                                {IconComp && <IconComp className="h-4 w-4" />}
                                {t.label}
                              </span>
                            </SelectItem>
                          );
                        })}
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

            {/* Description automatique */}
            {selectedTypeConfig && (
              <div className="space-y-2">
                <Label>Description du panier</Label>
                <div className="rounded-lg border border-input bg-muted/50 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
                  {selectedTypeConfig.description}
                </div>
              </div>
            )}

            {!basket.is_donation && (
              <>
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
                      <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold ${
                        reduction >= 20
                          ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200"
                          : "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200"
                      }`}>
                        -{reduction}% de réduction
                        {reduction < 20 && <span className="ml-1 text-xs font-normal">(min. 20 %)</span>}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Réduction min. 20 %
                      </div>
                    )}
                  </div>
                </div>
              </>
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
                  {...register("quantityTotal", { valueAsNumber: true })}
                />
                {errors.quantityTotal && (
                  <p className="text-xs text-destructive">{errors.quantityTotal.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupStart">Retrait à partir de</Label>
                <Controller
                  name="pickupStart"
                  control={control}
                  render={({ field }) => {
                    const [h, m] = (field.value ?? ":").split(":");
                    return (
                      <div className="flex items-center gap-1">
                        <Select value={h || undefined} onValueChange={(v) => field.onChange(`${v}:${m || "00"}`)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS.map((hr) => (
                              <SelectItem key={hr} value={hr}>{hr}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-lg font-semibold text-gray-400">:</span>
                        <Select value={m || undefined} onValueChange={(v) => field.onChange(`${h || "00"}:${v}`)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {MINUTES.map((mn) => (
                              <SelectItem key={mn} value={mn}>{mn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }}
                />
                {errors.pickupStart && (
                  <p className="text-xs text-destructive">{errors.pickupStart.message}</p>
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
                        <Select value={h || undefined} onValueChange={(v) => field.onChange(`${v}:${m || "00"}`)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS.map((hr) => (
                              <SelectItem key={hr} value={hr}>{hr}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-lg font-semibold text-gray-400">:</span>
                        <Select value={m || undefined} onValueChange={(v) => field.onChange(`${h || "00"}:${v}`)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {MINUTES.map((mn) => (
                              <SelectItem key={mn} value={mn}>{mn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }}
                />
                {errors.pickupEnd && (
                  <p className="text-xs text-destructive">{errors.pickupEnd.message}</p>
                )}
              </div>
            </div>

            {basket.is_donation && (
              <>
                <Separator />
                <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <span className="text-sm font-medium text-amber-800">
                    Ce panier est un don pour les associations (Tsedaka)
                  </span>
                </div>
              </>
            )}

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
