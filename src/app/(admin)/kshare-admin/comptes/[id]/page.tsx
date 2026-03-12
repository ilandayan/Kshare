import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AccountActions from "./_account-actions";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  validated: "Validé",
  refused: "Refusé",
  complement_required: "Complément requis",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  validated: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  refused: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  complement_required: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default async function CompteDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { type } = await searchParams;
  const accountType = type === "association" ? "association" : "commerce";
  const supabase = await createClient();

  if (accountType === "commerce") {
    const { data: commerce } = await supabase
      .from("commerces")
      .select("id, name, email, phone, address, city, postal_code, commerce_type, hashgakha, description, status, created_at, validated_at")
      .eq("id", id)
      .single();

    if (!commerce) notFound();

    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/kshare-admin/comptes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{commerce.name}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_COLORS[commerce.status] ?? ""}`}
            >
              {STATUS_LABELS[commerce.status] ?? commerce.status}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations du commerce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoRow label="Type de commerce" value={commerce.commerce_type} />
                <InfoRow label="Email" value={commerce.email} />
                <InfoRow label="Téléphone" value={commerce.phone ?? "—"} />
                <InfoRow label="Cacherout" value={commerce.hashgakha} />
                <InfoRow label="Adresse" value={commerce.address} />
                <InfoRow label="Ville" value={commerce.city} />
                <InfoRow label="Code postal" value={commerce.postal_code ?? "—"} />
                <InfoRow
                  label="Inscrit le"
                  value={new Date(commerce.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                />
                {commerce.validated_at && (
                  <InfoRow
                    label="Validé le"
                    value={new Date(commerce.validated_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                )}
              </div>

              {commerce.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{commerce.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <AccountActions id={id} type="commerce" currentStatus={commerce.status} />
        </div>
      </div>
    );
  }

  // Association
  const { data: asso } = await supabase
    .from("associations")
    .select("id, name, contact, address, city, zone_region, status, created_at, validated_at, availability")
    .eq("id", id)
    .single();

  if (!asso) notFound();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/kshare-admin/comptes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{asso.name}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_COLORS[asso.status] ?? ""}`}
          >
            {STATUS_LABELS[asso.status] ?? asso.status}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations de l&apos;association</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <InfoRow label="Contact" value={asso.contact} />
              <InfoRow label="Adresse" value={asso.address} />
              <InfoRow label="Ville" value={asso.city} />
              <InfoRow label="Zone / Région" value={asso.zone_region} />
              <InfoRow
                label="Inscrite le"
                value={new Date(asso.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              />
              {asso.validated_at && (
                <InfoRow
                  label="Validée le"
                  value={new Date(asso.validated_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                />
              )}
              {asso.availability && (
                <InfoRow label="Disponibilités" value={asso.availability} />
              )}
            </div>
          </CardContent>
        </Card>

        <AccountActions id={id} type="association" currentStatus={asso.status} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
