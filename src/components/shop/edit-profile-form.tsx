"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X, Upload, ImageIcon } from "lucide-react";
import {
  updateCommerceProfile,
  uploadCoverImage,
  uploadLogo,
} from "@/app/(shop)/shop/profil/_actions";
import { toast } from "sonner";
import { COMMERCE_TYPES, HASHGAKHA_LIST } from "@/lib/constants";

interface EditProfileFormProps {
  commerce: {
    name: string;
    address: string;
    city: string;
    postal_code: string | null;
    phone: string | null;
    email: string | null;
    commerce_type: string | null;
    hashgakha: string | null;
    photos: string[] | null;
    logo_url: string | null;
  };
  onClose: () => void;
}

export function EditProfileForm({ commerce, onClose }: EditProfileFormProps) {
  const router = useRouter();
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
        toast.success("Profil mis a jour !");
        router.refresh();
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
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
      // Revert preview on error
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cover image upload */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Image de couverture
        </label>
        <div
          className="relative w-full h-40 rounded-xl border-2 border-dashed border-[#e2e5f0] bg-[#f8f9fc] overflow-hidden cursor-pointer hover:border-[#3744C8]/40 transition-colors"
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
                    Cliquez pour ajouter une image
                  </span>
                  <span className="text-xs">JPEG, PNG ou WebP (max 5 Mo)</span>
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
      </div>

      {/* Logo upload */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Logo du commerce
        </label>
        <div className="flex items-center gap-4">
          <div
            className="relative w-20 h-20 rounded-full border-2 border-dashed border-[#e2e5f0] bg-[#f8f9fc] overflow-hidden cursor-pointer hover:border-[#3744C8]/40 transition-colors flex items-center justify-center shrink-0"
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
          <div className="text-xs text-gray-400 space-y-1">
            <p className="font-medium text-gray-500">Cliquez pour ajouter votre logo</p>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Nom du commerce
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Telephone
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Type de commerce
          </label>
          <select
            name="commerceType"
            value={form.commerceType}
            onChange={handleChange}
            className={inputCls}
          >
            <option value="">Selectionner</option>
            {COMMERCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Cacherout
          </label>
          <select
            name="hashgakha"
            value={hashgakhaAutre ? "Autre" : form.hashgakha}
            onChange={(e) => {
              if (e.target.value === "Autre") {
                setHashgakhaAutre(true);
                setForm((prev) => ({ ...prev, hashgakha: "" }));
              } else {
                setHashgakhaAutre(false);
                setForm((prev) => ({ ...prev, hashgakha: e.target.value }));
              }
            }}
            className={inputCls}
          >
            <option value="">Selectionner</option>
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
              className={`${inputCls} mt-2`}
            />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Code postal
          </label>
          <input
            name="postalCode"
            value={form.postalCode}
            onChange={handleChange}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Adresse
        </label>
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          required
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Ville
        </label>
        <input
          name="city"
          value={form.city}
          onChange={handleChange}
          required
          className={inputCls}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
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
          onClick={onClose}
          disabled={isPending}
          className="cursor-pointer gap-1.5"
        >
          <X className="h-4 w-4" />
          Annuler
        </Button>
      </div>
    </form>
  );
}
