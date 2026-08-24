"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Phone, Mail, Globe, MapPin, CalendarClock, ChevronDown, ChevronUp,
  Loader2, PhoneCall, StickyNote, Save,
} from "lucide-react";
import {
  changerStatutProspect, ajouterActivite, planifierRelance, modifierProspect,
  type StatutProspect,
} from "@/app/(crm)/kshare-crm/_actions";

export interface ProspectRow {
  id: string;
  company_name: string;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  website: string | null;
  commerce_type: string | null;
  region: string | null;
  category: string | null;
  hashgakha: string | null;
  status: string;
  contacted_at: string | null;
  next_action_at: string | null;
  first_name: string | null;
  last_name: string | null;
  admin_notes: string | null;
}

/** Types de commerce du fichier de prospection. */
const TYPE_LABELS: Record<string, string> = {
  restaurant:  "Restaurant",
  traiteur:    "Traiteur",
  boucherie:   "Boucherie",
  supermarche: "Supermarché",
  boulangerie: "Boulangerie",
  epicerie:    "Épicerie",
  autre:       "Autre",
};

const STATUT_LABELS: Record<string, string> = {
  new: "À contacter",
  contacted: "Infos envoyées",
  to_call_back: "À rappeler",
  demo_scheduled: "RDV prévu",
  converted: "Inscrit",
  rejected: "Pas intéressé",
  no_response: "Sans réponse",
  wrong_number: "Mauvais numéro",
  do_not_contact: "Ne pas contacter",
  closed: "Fermé",
};

const STATUT_CLS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-700",
  to_call_back: "bg-amber-100 text-amber-800",
  demo_scheduled: "bg-violet-100 text-violet-700",
  converted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  no_response: "bg-orange-100 text-orange-700",
  wrong_number: "bg-stone-100 text-stone-700",
  do_not_contact: "bg-red-100 text-red-800",
  closed: "bg-gray-200 text-gray-600",
};

/** Ordre d'affichage des filtres : la file de travail avant les impasses. */
const ORDRE_STATUTS = [
  "new", "to_call_back", "contacted", "demo_scheduled", "converted",
  "no_response", "rejected", "wrong_number", "do_not_contact", "closed",
];

function formatDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("fr-FR");
}

function ProspectCard({ prospect }: { prospect: ProspectRow }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [email, setEmail] = useState(prospect.email ?? "");
  const [relance, setRelance] = useState(
    prospect.next_action_at ? prospect.next_action_at.slice(0, 10) : "",
  );

  const enRetard =
    prospect.next_action_at !== null && new Date(prospect.next_action_at) <= new Date();

  function agir(fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        toast.success(ok);
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur inattendue.");
      }
    });
  }

  const tel = prospect.phone || prospect.mobile;

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm mb-3 overflow-hidden">
      <button
        onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#fafbff] transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <span className="font-semibold text-gray-900 truncate">{prospect.company_name}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUT_CLS[prospect.status] ?? "bg-gray-100 text-gray-600"}`}>
            {STATUT_LABELS[prospect.status] ?? prospect.status}
          </span>
          {prospect.commerce_type && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#eef0f8] text-[#3744C8]">
              {TYPE_LABELS[prospect.commerce_type] ?? prospect.commerce_type}
            </span>
          )}
          {prospect.city && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="h-3 w-3" /> {prospect.city}
              {prospect.region && <span className="text-gray-300">· {prospect.region}</span>}
            </span>
          )}
          {enRetard && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              Relance due
            </span>
          )}
          {!prospect.email && !tel && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
              Sans coordonnées
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 pl-3">
          <span className="text-xs text-gray-400 hidden sm:inline">
            Contact : {formatDate(prospect.contacted_at)}
          </span>
          {ouvert ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {ouvert && (
        <div className="px-5 pb-5 border-t border-[#f0f1f5] pt-4 space-y-4">
          {/* Coordonnées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1.5">
              {tel ? (
                <a href={`tel:${tel}`} className="flex items-center gap-2 text-[#3744C8] hover:underline">
                  <Phone className="h-4 w-4" /> {tel}
                </a>
              ) : (
                <span className="flex items-center gap-2 text-gray-400"><Phone className="h-4 w-4" /> Aucun téléphone</span>
              )}
              {prospect.website && (
                <a href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`}
                   target="_blank" rel="noreferrer"
                   className="flex items-center gap-2 text-[#3744C8] hover:underline truncate">
                  <Globe className="h-4 w-4 shrink-0" /> <span className="truncate">{prospect.website}</span>
                </a>
              )}
              {prospect.address && (
                <span className="flex items-start gap-2 text-gray-500">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{prospect.address}{prospect.postal_code ? `, ${prospect.postal_code}` : ""} {prospect.city}</span>
                </span>
              )}
              {prospect.hashgakha && (
                <span className="text-xs text-gray-400">Cacherout : {prospect.hashgakha}</span>
              )}
            </div>

            {/* Email, souvent collecté pendant l'appel : modifiable sur place */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500">Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Aucun email — à collecter"
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[#e2e5f0] focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
                />
                <button
                  onClick={() => agir(() => modifierProspect(prospect.id, { email }), "Email enregistré.")}
                  disabled={isPending || email === (prospect.email ?? "")}
                  className="px-3 py-1.5 rounded-lg bg-[#3744C8]/10 text-[#3744C8] text-sm font-semibold hover:bg-[#3744C8]/20 disabled:opacity-40 cursor-pointer"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
              </div>
              {prospect.email && (
                <a href={`mailto:${prospect.email}`} className="inline-flex items-center gap-2 text-sm text-[#3744C8] hover:underline">
                  <Mail className="h-4 w-4" /> Écrire
                </a>
              )}
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Statut</label>
            <div className="flex flex-wrap gap-1.5">
              {ORDRE_STATUTS.map((s) => (
                <button
                  key={s}
                  onClick={() => agir(() => changerStatutProspect(prospect.id, s as StatutProspect), `Statut : ${STATUT_LABELS[s]}`)}
                  disabled={isPending || s === prospect.status}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer disabled:cursor-default ${
                    s === prospect.status
                      ? `${STATUT_CLS[s]} ring-2 ring-offset-1 ring-[#3744C8]/40`
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {STATUT_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Journal et relance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">
                Consigner un échange
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Ce qui s'est dit, à qui, ce qu'il faut refaire…"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#e2e5f0] focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => agir(async () => { const r = await ajouterActivite(prospect.id, "appel", note); if (r.success) setNote(""); return r; }, "Appel consigné.")}
                  disabled={isPending || !note.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3744C8] text-white text-xs font-semibold hover:bg-[#2d38a8] disabled:opacity-40 cursor-pointer"
                >
                  <PhoneCall className="h-3.5 w-3.5" /> Appel
                </button>
                <button
                  onClick={() => agir(async () => { const r = await ajouterActivite(prospect.id, "note", note); if (r.success) setNote(""); return r; }, "Note ajoutée.")}
                  disabled={isPending || !note.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 disabled:opacity-40 cursor-pointer"
                >
                  <StickyNote className="h-3.5 w-3.5" /> Note
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">
                Relance programmée
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={relance}
                  onChange={(e) => setRelance(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[#e2e5f0] focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
                />
                <button
                  onClick={() => agir(() => planifierRelance(prospect.id, relance ? new Date(relance + "T09:00:00").toISOString() : null), relance ? "Relance programmée." : "Relance annulée.")}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-[#3744C8]/10 text-[#3744C8] text-sm font-semibold hover:bg-[#3744C8]/20 disabled:opacity-40 cursor-pointer"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                </button>
              </div>
              {prospect.next_action_at && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Prévue le {formatDate(prospect.next_action_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProspectionClient({
  prospects, total, compteurs, relancesDues, filtreStatut, recherche, page, parPage,
  filtreType, filtreRegion, types, regions,
}: {
  prospects: ProspectRow[];
  total: number;
  compteurs: Record<string, number>;
  relancesDues: number;
  filtreStatut: string | null;
  filtreType: string | null;
  filtreRegion: string | null;
  types: { valeur: string; nombre: number }[];
  regions: { valeur: string; nombre: number }[];
  recherche: string;
  page: number;
  parPage: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(recherche);

  function naviguer(modif: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modif)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    // Tout changement de filtre ramène en première page, sinon on atterrit sur
    // une page vide.
    if (!("page" in modif)) p.delete("page");
    router.push(`/kshare-crm?${p.toString()}`);
  }

  const pages = Math.max(1, Math.ceil(total / parPage));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospection</h1>
          <p className="text-sm text-gray-500">
            {total.toLocaleString("fr-FR")} commerce{total > 1 ? "s" : ""}
            {filtreStatut ? ` — ${STATUT_LABELS[filtreStatut] ?? filtreStatut}` : ""}
          </p>
        </div>
        {relancesDues > 0 && (
          <button
            onClick={() => naviguer({ statut: null, q: null })}
            className="px-4 py-2 rounded-xl bg-amber-100 text-amber-900 text-sm font-semibold hover:bg-amber-200 cursor-pointer"
          >
            {relancesDues} relance{relancesDues > 1 ? "s" : ""} à faire
          </button>
        )}
      </div>

      {/* Recherche */}
      <form
        onSubmit={(e) => { e.preventDefault(); naviguer({ q }); }}
        className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-3 mb-4 flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom du commerce, ville, email, téléphone…"
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-transparent bg-[#f7f8fc] focus:bg-white focus:border-[#e2e5f0] focus:outline-none text-sm"
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-xl bg-[#3744C8] text-white text-sm font-semibold hover:bg-[#2d38a8] cursor-pointer">
          Rechercher
        </button>
        {(recherche || filtreStatut || filtreType || filtreRegion) && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              naviguer({ q: null, statut: null, type: null, region: null });
            }}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 cursor-pointer"
          >
            Effacer
          </button>
        )}
      </form>

      {/* Type de commerce et région — deux listes plutôt que des pastilles : les
          statuts occupent déjà la ligne, et ce sont eux qu'on parcourt d'abord. */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={filtreType ?? ""}
          onChange={(e) => naviguer({ type: e.target.value || null })}
          className="px-3 py-2 rounded-xl border border-[#e2e5f0] bg-white text-sm text-gray-700 cursor-pointer"
        >
          <option value="">Tous les types de commerce</option>
          {types.map((t) => (
            <option key={t.valeur} value={t.valeur}>
              {TYPE_LABELS[t.valeur] ?? t.valeur} ({t.nombre})
            </option>
          ))}
        </select>

        <select
          value={filtreRegion ?? ""}
          onChange={(e) => naviguer({ region: e.target.value || null })}
          className="px-3 py-2 rounded-xl border border-[#e2e5f0] bg-white text-sm text-gray-700 cursor-pointer"
        >
          <option value="">Toutes les régions</option>
          {regions.map((r) => (
            <option key={r.valeur} value={r.valeur}>
              {r.valeur} ({r.nombre})
            </option>
          ))}
        </select>
      </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        <button
          onClick={() => naviguer({ statut: null })}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
            !filtreStatut ? "bg-[#3744C8] text-white" : "bg-white text-gray-600 border border-[#e2e5f0] hover:bg-gray-50"
          }`}
        >
          Tous
        </button>
        {ORDRE_STATUTS.filter((s) => compteurs[s]).map((s) => (
          <button
            key={s}
            onClick={() => naviguer({ statut: s })}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
              filtreStatut === s ? "bg-[#3744C8] text-white" : "bg-white text-gray-600 border border-[#e2e5f0] hover:bg-gray-50"
            }`}
          >
            {STATUT_LABELS[s]} <span className="opacity-60">{compteurs[s]}</span>
          </button>
        ))}
      </div>

      {prospects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-12 text-center">
          <p className="text-gray-500">Aucun commerce ne correspond à cette recherche.</p>
        </div>
      ) : (
        prospects.map((p) => <ProspectCard key={p.id} prospect={p} />)
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => naviguer({ page: String(page - 1) })}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl bg-white border border-[#e2e5f0] text-sm font-medium disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-500">Page {page} sur {pages}</span>
          <button
            onClick={() => naviguer({ page: String(page + 1) })}
            disabled={page >= pages}
            className="px-4 py-2 rounded-xl bg-white border border-[#e2e5f0] text-sm font-medium disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
