"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Save, Loader2 } from "lucide-react";

interface EditClientProfileProps {
  profile: {
    id: string;
    full_name: string;
    email: string;
  };
}

export function EditClientProfile({ profile }: EditClientProfileProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", profile.id);

    if (updateError) {
      setError("Erreur lors de la mise a jour du profil.");
    } else {
      setSuccess(true);
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
        <input
          type="email"
          value={profile.email}
          disabled
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1">L&apos;email ne peut pas etre modifie</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nom complet</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Votre nom"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-600 text-sm px-4 py-2.5 rounded-xl">
          Profil mis a jour avec succes !
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Enregistrer
      </button>
    </form>
  );
}
