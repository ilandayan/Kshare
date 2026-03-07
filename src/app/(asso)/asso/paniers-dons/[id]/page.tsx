import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BASKET_TYPES } from "@/lib/constants";
import { reserverPanierDon } from "./_actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PanierDonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: basket } = await supabase
    .from("baskets")
    .select("*, commerces(name, city, address, hashgakha, phone, average_rating)")
    .eq("id", id)
    .eq("is_donation", true)
    .eq("status", "published")
    .single();

  if (!basket) notFound();

  const typeConfig = BASKET_TYPES.find((t) => t.value === basket.type);
  const commerce = basket.commerces as {
    name: string;
    city: string;
    address: string;
    hashgakha: string;
    phone: string | null;
    average_rating: number | null;
  } | null;

  const available = basket.quantity_total - basket.quantity_reserved;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/asso/paniers-dons">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Détail du panier don</h1>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{typeConfig?.emoji}</span>
              <div>
                <CardTitle className="text-xl">{typeConfig?.label}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{typeConfig?.description}</p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">Don 🤝</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Commerce */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Commerce</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium text-foreground text-base">
                <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0" />
                {commerce?.name}
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {commerce?.address}, {commerce?.city}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="h-4 w-4 shrink-0" />
                <span>
                  {commerce?.hashgakha}
                  {commerce?.average_rating
                    ? ` · Note : ${commerce.average_rating.toFixed(1)}/5`
                    : ""}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Horaires et quantité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Créneau de retrait</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  {basket.pickup_start} – {basket.pickup_end}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Disponibilité</h3>
              <div className="text-sm">
                <span
                  className={`font-semibold ${
                    available > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
                  }`}
                >
                  {available > 0 ? `${available} disponible(s)` : "Plus disponible"}
                </span>
                <span className="text-muted-foreground"> / {basket.quantity_total} total</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {basket.description && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{basket.description}</p>
              </div>
            </>
          )}

          <Separator />

          {/* CTA */}
          <div className="space-y-3">
            {available > 0 ? (
              <form
                action={async () => {
                  "use server";
                  await reserverPanierDon(id);
                }}
              >
                <Button type="submit" className="w-full" size="lg">
                  Réserver ce panier don
                </Button>
              </form>
            ) : (
              <Button className="w-full" size="lg" disabled>
                Panier non disponible
              </Button>
            )}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/asso/paniers-dons">Retour à la liste</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
