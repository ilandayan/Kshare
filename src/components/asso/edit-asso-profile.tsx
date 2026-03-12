"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, X, Pencil } from "lucide-react";
import { updateAssoProfile } from "@/app/(asso)/asso/profil/_actions";
import { toast } from "sonner";
import { DEPARTMENTS } from "@/lib/constants";

interface EditAssoProfileProps {
  asso: {
    name: string;
    address: string | null;
    city: string | null;
    contact: string | null;
    zone_region: string | null;
    department: string | null;
  };
}

export function EditAssoProfile({ asso }: EditAssoProfileProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: asso.name ?? "",
    address: asso.address ?? "",
    city: asso.city ?? "",
    contact: asso.contact ?? "",
    zoneRegion: asso.zone_region ?? "",
    department: asso.department ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateAssoProfile(form);
      if (result.success) {
        toast.success("Profil mis à jour !");
        router.refresh();
        setEditing(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const inputCls =
    "w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 transition-colors";

  if (!editing) {
    return (
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setEditing(true)}
          className="cursor-pointer gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          <Pencil className="h-4 w-4" />
          Modifier le profil
        </Button>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl border border-[#e2e5f0] shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Modifier les informations</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nom de l&apos;association
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
                Contact
              </label>
              <input
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="Nom du responsable · Téléphone"
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
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Ville
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Département
              </label>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="">Sélectionner un département</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} – {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 cursor-pointer gap-1.5"
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
      </CardContent>
    </Card>
  );
}
