"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Loader2,
  Save,
  X,
  Upload,
  ImageIcon,
  UtensilsCrossed,
  Milk,
  Leaf,
  Wine,
  Layers,
  type LucideIcon,
} from "lucide-react";
import {
  updateCommerceProfile,
  uploadCoverImage,
  uploadLogo,
} from "@/app/(shop)/shop/profil/_actions";
import { toast } from "sonner";
import { COMMERCE_TYPES, HASHGAKHA_LIST, BASKET_TYPES } from "@/lib/constants";

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Milk,
  Leaf,
  Wine,
  Layers,
};

interface CommerceData {
  name: string;
  address: string;
  city: string;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  commerce_type: string | null;
  hashgakha: string | null;
  basket_types: string[] | null;
  commission_rate: number;
  status: string;
  photos: string[] | null;
  logo_url: string | null;
}

interface ShopProfileClientProps {
  commerce: CommerceData;
  subscriptionStatus: string | null;
}

export function ShopProfileClient({
  commerce,
  subscriptionStatus,
}: ShopProfileClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    commerce.photos?.[0] ?? null
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(
    commerce.logo_url ?? null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const initialHashgakha = commerce.hashgakha ?? "";
  const isCustomHashgakha =
    initialHashgakha !== "" &&
    !(HASHGAKHA_LIST as readonly string[]).includes(initialHashgakha);

  const [hashgakhaAutre, setHashgakhaAutre] = useState(isCustomHashgakha);
  const [form, setForm] = useState({
    name: commerce.name ?? "",
    address: commerce.address ?? "",
    city: commerce.city ?? "",
    postalCode: commerce.postal_code ?? "",
    phone: commerce.phone ?? "",
    email: commerce.email ?? "",
    commerceType: commerce.commerce_type ?? "",
    hashgakha: initialHashgakha,
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCommerceProfile(form);
      if (result.success) {
        toast.success("Profil mis à jour !");
        router.refresh();
        setEditing(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadCoverImage(fd);
    setIsUploading(false);
    if (result.success) {
      toast.success("Image de couverture mise à jour !");
      router.refresh();
    } else {
      toast.error(result.error);
      setCoverPreview(commerce.photos?.[0] ?? null);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    setIsUploadingLogo(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadLogo(fd);
    setIsUploadingLogo(false);
    if (result.success) {
      toast.success("Logo mis à jour !");
      router.refresh();
    } else {
      toast.error(result.error);
      setLogoPreview(commerce.logo_url ?? null);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 focus:border-[#3744C8] transition-colors";

  // Read-only field row
  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <div className="flex gap-4">
        <span className="text-muted-foreground w-36 shrink-0 text-sm">
          {label}
        </span>
        <span className="text-foreground font-medium text-sm">{value}</span>
      </div>
    );
  }

  // Edit field row
  function EditRow({
    label,
    name,
    value,
    type = "text",
    required = false,
  }: {
    label: string;
    name: string;
    value: string;
    type?: string;
    required?: boolean;
  }) {
    return (
      <div className="flex gap-4 items-center">
        <span className="text-muted-foreground w-36 shrink-0 text-sm">
          {label}
        </span>
        <input
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          required={required}
          className={`${inputCls} flex-1`}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left column: Info + Subscription + Security ── */}
      <div className="lg:col-span-2 space-y-6">
        {/* General info card — inline edit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Informations générales</CardTitle>
            {!editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="cursor-pointer gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <EditRow
                  label="Nom"
                  name="name"
                  value={form.name}
                  required
                />
                <EditRow
                  label="Email"
                  name="email"
                  value={form.email}
                  type="email"
                />
                <EditRow label="Téléphone" name="phone" value={form.phone} />

                {/* Commerce type — select */}
                <div className="flex gap-4 items-center">
                  <span className="text-muted-foreground w-36 shrink-0 text-sm">
                    Type de commerce
                  </span>
                  <select
                    name="commerceType"
                    value={form.commerceType}
                    onChange={handleChange}
                    className={`${inputCls} flex-1`}
                  >
                    <option value="">Sélectionner</option>
                    {COMMERCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cacherout — select + custom */}
                <div className="flex gap-4 items-start">
                  <span className="text-muted-foreground w-36 shrink-0 text-sm pt-2.5">
                    Cacherout
                  </span>
                  <div className="flex-1 space-y-2">
                    <select
                      name="hashgakha"
                      value={hashgakhaAutre ? "Autre" : form.hashgakha}
                      onChange={(e) => {
                        if (e.target.value === "Autre") {
                          setHashgakhaAutre(true);
                          setForm((prev) => ({ ...prev, hashgakha: "" }));
                        } else {
                          setHashgakhaAutre(false);
                          setForm((prev) => ({
                            ...prev,
                            hashgakha: e.target.value,
                          }));
                        }
                      }}
                      className={inputCls}
                    >
                      <option value="">Sélectionner</option>
                      {HASHGAKHA_LIST.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {hashgakhaAutre && (
                      <input
                        name="hashgakha"
                        value={form.hashgakha}
                        onChange={handleChange}
                        placeholder="Précisez la cacherout..."
                        className={inputCls}
                      />
                    )}
                  </div>
                </div>

                <EditRow
                  label="Adresse"
                  name="address"
                  value={form.address}
                  required
                />
                <EditRow
                  label="Code postal"
                  name="postalCode"
                  value={form.postalCode}
                />
                <EditRow
                  label="Ville"
                  name="city"
                  value={form.city}
                  required
                />

                {/* Basket types — read only */}
                <div className="flex gap-4">
                  <span className="text-muted-foreground w-36 shrink-0 text-sm">
                    Types de paniers
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {commerce.basket_types?.map((t: string) => {
                      const type = BASKET_TYPES.find((bt) => bt.value === t);
                      const Icon = type ? ICON_MAP[type.icon] : null;
                      return (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="inline-flex items-center gap-1.5"
                        >
                          {Icon && <Icon className="h-3.5 w-3.5" />}{" "}
                          {type?.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] hover:from-[#2E3AB0] hover:to-[#4B5BE2] text-white border-0 cursor-pointer gap-1.5"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Enregistrer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    disabled={isPending}
                    className="cursor-pointer gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    Annuler
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <InfoRow label="Nom" value={commerce.name} />
                <InfoRow
                  label="Adresse"
                  value={`${commerce.address}, ${commerce.postal_code} ${commerce.city}`}
                />
                <InfoRow label="Email" value={commerce.email ?? "—"} />
                <InfoRow label="Téléphone" value={commerce.phone ?? "—"} />
                <InfoRow
                  label="Type de commerce"
                  value={commerce.commerce_type ?? "—"}
                />
                <InfoRow label="Cacherout" value={commerce.hashgakha ?? "—"} />
                <div className="flex gap-4">
                  <span className="text-muted-foreground w-36 shrink-0 text-sm">
                    Types de paniers
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {commerce.basket_types?.map((t: string) => {
                      const type = BASKET_TYPES.find((bt) => bt.value === t);
                      const Icon = type ? ICON_MAP[type.icon] : null;
                      return (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="inline-flex items-center gap-1.5"
                        >
                          {Icon && <Icon className="h-3.5 w-3.5" />}{" "}
                          {type?.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription & Commission */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Abonnement & Commission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Statut abonnement"
              value={subscriptionStatus ?? "Non configuré"}
            />
            <InfoRow
              label="Taux de commission"
              value={`${commerce.commission_rate} %`}
            />
            <InfoRow label="Statut compte" value={commerce.status} />
          </CardContent>
        </Card>
      </div>

      {/* ── Right column: Image + Logo upload ── */}
      <div className="space-y-6">
        {/* Cover image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Image de couverture</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="relative w-full h-44 rounded-xl border-2 border-dashed border-[#e2e5f0] bg-[#f8f9fc] overflow-hidden cursor-pointer hover:border-[#3744C8]/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {coverPreview ? (
                <>
                  <img
                    src={coverPreview}
                    alt="Couverture"
                    className="w-full h-full object-cover"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-white/90 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 flex items-center gap-1.5 shadow-sm">
                    <Upload className="h-3.5 w-3.5" />
                    Changer
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm font-medium">
                        Cliquez pour ajouter
                      </span>
                      <span className="text-xs">
                        JPEG, PNG ou WebP (max 5 Mo)
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logo du commerce</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div
                className="relative w-24 h-24 rounded-full border-2 border-dashed border-[#e2e5f0] bg-[#f8f9fc] overflow-hidden cursor-pointer hover:border-[#3744C8]/40 transition-colors flex items-center justify-center shrink-0"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                    {isUploadingLogo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {isUploadingLogo ? (
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </>
                )}
              </div>
              <div className="text-xs text-gray-400 text-center space-y-1">
                <p className="font-medium text-gray-500">
                  Cliquez pour ajouter
                </p>
                <p>JPEG, PNG ou WebP (max 2 Mo)</p>
                <p>Format carré recommandé</p>
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
