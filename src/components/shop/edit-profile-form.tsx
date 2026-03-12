"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";
import { updateCommerceProfile } from "@/app/(shop)/shop/profil/_actions";
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
  };
  onClose: () => void;
}

export function EditProfileForm({ commerce, onClose }: EditProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: commerce.name ?? "",
    address: commerce.address ?? "",
    city: commerce.city ?? "",
    postalCode: commerce.postal_code ?? "",
    phone: commerce.phone ?? "",
    email: commerce.email ?? "",
    commerceType: commerce.commerce_type ?? "",
    hashgakha: commerce.hashgakha ?? "",
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

  const inputCls =
    "w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 focus:border-[#3744C8] transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            value={form.hashgakha}
            onChange={handleChange}
            className={inputCls}
          >
            <option value="">Selectionner</option>
            {HASHGAKHA_LIST.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
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
