"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Eye, Edit2, Users, CheckCircle, ShoppingBag, Handshake, Store, MapPin, Mail, Phone, Clock,
  Ban, Trash2, RotateCcw, AlertTriangle, X, Star,
  type LucideIcon,
} from "lucide-react";
import {
  suspendCommerce, unsuspendCommerce, deleteCommerce,
  suspendAssociation, unsuspendAssociation, deleteAssociation,
  suspendClient, unsuspendClient, deleteClient,
} from "@/app/(admin)/kshare-admin/utilisateurs/_actions";

const KPI_ICONS: Record<string, LucideIcon> = {
  Users, CheckCircle, ShoppingBag, Handshake, Store,
};

/* ── Shared types ── */
type UserStatus = "actif" | "en attente" | "suspendu" | "archivé";

export interface ClientRow {
  id: string; initials: string; fullName: string; city: string;
  email: string; phone: string; inscriptionDate: string;
  basketCount: number; donationsAmount: number;
  lastActivity: string; status: UserStatus;
}
export interface CommercantRow {
  id: string; initials: string; fullName: string; city: string;
  commerceName: string; commerceType: string; email: string; phone: string;
  hashgakha: string; proposedCount: number; soldCount: number;
  averageRating: number; totalRatings: number;
  lastActivity: string; status: UserStatus;
}
export interface AssoRow {
  id: string; initials: string; name: string; city: string;
  responsable: string; email: string; phone: string;
  inscriptionDate: string; distCount: number; famillesCount: number;
  lastActivity: string; status: UserStatus;
}

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === "actif") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />actif</span>;
  }
  if (status === "suspendu") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />suspendu</span>;
  }
  if (status === "archivé") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><span className="w-1.5 h-1.5 bg-red-500 rounded-full" />archivé</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />en attente</span>;
}

function Avatar({ initials, color = "bg-[#3744C8]" }: { initials: string; color?: string }) {
  return (
    <div className={`w-9 h-9 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
      {initials}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 focus:border-[#3744C8] transition-colors placeholder:text-gray-400"
      />
    </div>
  );
}

function FilterButtons({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {["Tous", "Actifs", "En attente", "Suspendus", "Archivés"].map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            active === f ? "bg-gradient-to-r from-[#D72638] to-[#FF6B6B] text-white shadow-sm" : "bg-white border border-[#e2e5f0] text-gray-600 hover:bg-gray-50"
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

/* ── Confirmation modal ── */
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors cursor-pointer ${confirmColor}`}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-tabs ── */
function SubTabs({ active, onChange, tabs }: { active: string; onChange: (v: string) => void; tabs: string[] }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            active === t ? "bg-gradient-to-r from-[#D72638] to-[#FF6B6B] text-white shadow-sm" : "bg-white border border-[#e2e5f0] text-gray-600 hover:bg-gray-50"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ── Clients tab ── */
function ClientsTab({ rows }: { rows: ClientRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<{ type: "suspend" | "unsuspend" | "delete"; id: string; name: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const kpis = [
    { label: "Total Clients",   value: rows.length.toString(),                                            borderColor: "border-l-blue-500",   icon: "Users" },
    { label: "Clients Actifs",  value: rows.filter((r) => r.status === "actif").length.toString(),        borderColor: "border-l-green-500",  icon: "CheckCircle" },
    { label: "Paniers Sauvés",  value: rows.reduce((s, r) => s + r.basketCount, 0).toString(),            borderColor: "border-l-orange-500", icon: "ShoppingBag" },
    { label: "Total Dons (€)",  value: `${rows.reduce((s, r) => s + r.donationsAmount, 0).toFixed(0)}€`, borderColor: "border-l-pink-500",   icon: "Handshake" },
  ];

  function matchFilter(status: UserStatus) {
    if (filter === "Tous") return true;
    if (filter === "Actifs") return status === "actif";
    if (filter === "Suspendus") return status === "suspendu";
    if (filter === "Archivés") return status === "archivé";
    if (filter === "En attente") return status === "en attente";
    return true;
  }

  const filtered = rows.filter((r) => {
    const matchSearch = !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase());
    return matchSearch && matchFilter(r.status);
  });

  function handleConfirm() {
    if (!confirmAction) return;
    startTransition(async () => {
      let result;
      if (confirmAction.type === "suspend") result = await suspendClient(confirmAction.id);
      else if (confirmAction.type === "unsuspend") result = await unsuspendClient(confirmAction.id);
      else result = await deleteClient(confirmAction.id);

      if (result.success) {
        toast.success(
          confirmAction.type === "suspend" ? "Client suspendu" :
          confirmAction.type === "unsuspend" ? "Client réactivé" :
          "Client supprimé"
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setConfirmAction(null);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border-l-4 ${k.borderColor} border-t border-r border-b border-[#e2e5f0] shadow-sm p-5 flex items-center justify-between`}>
            <div><div className="text-xs text-gray-400 mb-1">{k.label}</div><div className="text-2xl font-bold text-gray-900">{k.value}</div></div>
            {(() => { const Icon = KPI_ICONS[k.icon]; return Icon ? <Icon className="h-7 w-7 text-gray-400" /> : null; })()}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 mb-5 flex items-center gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Rechercher par nom, email ou ville..." /></div>
        <FilterButtons active={filter} onChange={setFilter} />
      </div>
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-[#e2e5f0]">
            {["CLIENT","CONTACT","INSCRIPTION","STATISTIQUES","DERNIÈRE ACTIVITÉ","STATUT","ACTIONS"].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-[#f0f1f5]">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">Aucun client trouvé</td></tr>
            ) : filtered.map((r) => (
              <Fragment key={r.id}>
                <tr className="hover:bg-[#fafbff] transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar initials={r.initials} />
                      <div><div className="font-semibold text-sm text-[#3744C8]">{r.fullName}</div><div className="text-xs text-gray-400"><MapPin className="h-3 w-3 inline mr-0.5" />{r.city}</div></div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><div className="text-xs text-gray-600"><Mail className="h-3 w-3 inline mr-0.5" />{r.email}</div><div className="text-xs text-gray-400 mt-0.5"><Phone className="h-3 w-3 inline mr-0.5" />{r.phone}</div></td>
                  <td className="px-5 py-4 text-sm text-gray-500">{r.inscriptionDate}</td>
                  <td className="px-5 py-4"><div className="text-xs text-gray-600"><ShoppingBag className="h-3 w-3 inline mr-0.5" />{r.basketCount} <span className="text-pink-500 ml-1"><Handshake className="h-3 w-3 inline mr-0.5" />{r.donationsAmount}€</span></div></td>
                  <td className="px-5 py-4 text-xs text-gray-400"><Clock className="h-3 w-3 inline mr-0.5" />{r.lastActivity}</td>
                  <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className={`p-1.5 transition-colors cursor-pointer ${expandedId === r.id ? "text-[#3744C8]" : "text-gray-400 hover:text-[#3744C8]"}`} title="Voir"><Eye className="h-4 w-4" /></button>
                      {r.status === "suspendu" ? (
                        <button onClick={() => setConfirmAction({ type: "unsuspend", id: r.id, name: r.fullName })} className="p-1.5 text-orange-400 hover:text-green-600 transition-colors cursor-pointer" title="Réactiver"><RotateCcw className="h-4 w-4" /></button>
                      ) : (
                        <button onClick={() => setConfirmAction({ type: "suspend", id: r.id, name: r.fullName })} className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors cursor-pointer" title="Suspendre"><Ban className="h-4 w-4" /></button>
                      )}
                      <button onClick={() => setConfirmAction({ type: "delete", id: r.id, name: r.fullName })} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr className="bg-[#fafbff]">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white rounded-xl p-4 border border-[#e2e5f0]">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Identité</div>
                          <div className="space-y-1.5">
                            <div className="font-medium text-gray-900">{r.fullName}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}</div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-[#e2e5f0]">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Statistiques</div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between"><span className="text-gray-500">Paniers achetés</span><span className="font-semibold text-gray-900">{r.basketCount}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Total dons</span><span className="font-semibold text-pink-600">{r.donationsAmount.toFixed(2)}€</span></div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-[#e2e5f0]">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Compte</div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between"><span className="text-gray-500">Inscription</span><span className="font-medium text-gray-900">{r.inscriptionDate}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Dernière activité</span><span className="font-medium text-gray-900">{r.lastActivity}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Statut</span><StatusBadge status={r.status} /></div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={
          confirmAction?.type === "suspend" ? "Suspendre le client" :
          confirmAction?.type === "unsuspend" ? "Réactiver le client" :
          "Supprimer le client"
        }
        message={
          confirmAction?.type === "suspend"
            ? `Êtes-vous sûr de vouloir suspendre le compte de ${confirmAction?.name} ? Il ne pourra plus se connecter.`
            : confirmAction?.type === "unsuspend"
            ? `Réactiver le compte de ${confirmAction?.name} ?`
            : `Êtes-vous sûr de vouloir supprimer le compte de ${confirmAction?.name} ? Il ne pourra plus se connecter. Les données de commandes et financières seront conservées.`
        }
        confirmLabel={
          confirmAction?.type === "suspend" ? "Suspendre" :
          confirmAction?.type === "unsuspend" ? "Réactiver" :
          "Supprimer"
        }
        confirmColor={
          confirmAction?.type === "unsuspend" ? "bg-green-600 hover:bg-green-700" :
          confirmAction?.type === "suspend" ? "bg-orange-600 hover:bg-orange-700" :
          "bg-red-600 hover:bg-red-700"
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
        loading={isPending}
      />
    </div>
  );
}

/* ── Commerçants tab ── */
function CommercantTab({ rows }: { rows: CommercantRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<{ type: "suspend" | "unsuspend" | "delete"; id: string; name: string } | null>(null);

  const kpis = [
    { label: "Total Commerçants",   value: rows.length.toString(),                                           borderColor: "border-l-blue-500",   icon: "Store" },
    { label: "Commerçants Actifs",  value: rows.filter((r) => r.status === "actif").length.toString(),       borderColor: "border-l-green-500",  icon: "CheckCircle" },
    { label: "Paniers Proposés",    value: rows.reduce((s, r) => s + r.proposedCount, 0).toString(),         borderColor: "border-l-orange-500", icon: "ShoppingBag" },
    { label: "Paniers Vendus",      value: rows.reduce((s, r) => s + r.soldCount, 0).toString(),             borderColor: "border-l-green-500",  icon: "CheckCircle" },
  ];

  function matchFilter(status: UserStatus) {
    if (filter === "Tous") return true;
    if (filter === "Actifs") return status === "actif";
    if (filter === "Suspendus") return status === "suspendu";
    if (filter === "Archivés") return status === "archivé";
    if (filter === "En attente") return status === "en attente";
    return true;
  }

  const filtered = rows.filter((r) => {
    const matchSearch = !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.commerceName.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase());
    return matchSearch && matchFilter(r.status);
  });

  function handleConfirm() {
    if (!confirmAction) return;
    startTransition(async () => {
      let result;
      if (confirmAction.type === "suspend") result = await suspendCommerce(confirmAction.id);
      else if (confirmAction.type === "unsuspend") result = await unsuspendCommerce(confirmAction.id);
      else result = await deleteCommerce(confirmAction.id);

      if (result.success) {
        toast.success(
          confirmAction.type === "suspend" ? "Commerce suspendu" :
          confirmAction.type === "unsuspend" ? "Commerce réactivé" :
          "Commerce supprimé"
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setConfirmAction(null);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border-l-4 ${k.borderColor} border-t border-r border-b border-[#e2e5f0] shadow-sm p-5 flex items-center justify-between`}>
            <div><div className="text-xs text-gray-400 mb-1">{k.label}</div><div className="text-2xl font-bold text-gray-900">{k.value}</div></div>
            {(() => { const Icon = KPI_ICONS[k.icon]; return Icon ? <Icon className="h-7 w-7 text-gray-400" /> : null; })()}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 mb-5 flex items-center gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Rechercher par nom, commerce, email ou ville..." /></div>
        <FilterButtons active={filter} onChange={setFilter} />
      </div>
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead><tr className="border-b border-[#e2e5f0]">
            {["COMMERÇANT","COMMERCE","CONTACT","CACHEROUT","STATISTIQUES","NOTE","DERNIÈRE ACTIVITÉ","STATUT","ACTIONS"].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-[#f0f1f5]">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">Aucun commerçant trouvé</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#fafbff] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={r.initials} />
                    <div><div className="font-semibold text-sm text-[#3744C8]">{r.fullName}</div><div className="text-xs text-gray-400"><MapPin className="h-3 w-3 inline mr-0.5" />{r.city}</div></div>
                  </div>
                </td>
                <td className="px-5 py-4"><div className="text-sm font-medium text-gray-800"><Store className="h-3.5 w-3.5 inline mr-0.5" />{r.commerceName}</div><div className="text-xs text-gray-400">{r.commerceType}</div></td>
                <td className="px-5 py-4"><div className="text-xs text-gray-600"><Mail className="h-3 w-3 inline mr-0.5" />{r.email}</div><div className="text-xs text-gray-400 mt-0.5"><Phone className="h-3 w-3 inline mr-0.5" />{r.phone}</div></td>
                <td className="px-5 py-4"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">{r.hashgakha || "—"}</span></td>
                <td className="px-5 py-4"><div className="text-xs text-gray-600"><ShoppingBag className="h-3 w-3 inline mr-0.5" />{r.proposedCount} proposés</div><div className="text-xs text-green-600 mt-0.5"><CheckCircle className="h-3 w-3 inline mr-0.5 text-green-600" />{r.soldCount} vendus</div></td>
                <td className="px-5 py-4">{r.totalRatings > 0 ? (<div className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" /><span className="text-sm font-semibold text-gray-800">{r.averageRating.toFixed(1)}</span><span className="text-xs text-gray-400">({r.totalRatings})</span></div>) : (<span className="text-xs text-gray-400">—</span>)}</td>
                <td className="px-5 py-4 text-xs text-gray-400"><Clock className="h-3 w-3 inline mr-0.5" />{r.lastActivity}</td>
                <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => router.push(`/kshare-admin/comptes/${r.id}?type=commerce`)} className="p-1.5 text-gray-400 hover:text-[#3744C8] transition-colors cursor-pointer" title="Voir"><Eye className="h-4 w-4" /></button>
                    {r.status === "suspendu" ? (
                      <button onClick={() => setConfirmAction({ type: "unsuspend", id: r.id, name: r.commerceName })} className="p-1.5 text-orange-400 hover:text-green-600 transition-colors cursor-pointer" title="Réactiver"><RotateCcw className="h-4 w-4" /></button>
                    ) : (
                      <button onClick={() => setConfirmAction({ type: "suspend", id: r.id, name: r.commerceName })} className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors cursor-pointer" title="Suspendre"><Ban className="h-4 w-4" /></button>
                    )}
                    <button onClick={() => setConfirmAction({ type: "delete", id: r.id, name: r.commerceName })} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={
          confirmAction?.type === "suspend" ? "Suspendre le commerce" :
          confirmAction?.type === "unsuspend" ? "Réactiver le commerce" :
          "Supprimer le commerce"
        }
        message={
          confirmAction?.type === "suspend"
            ? `Êtes-vous sûr de vouloir suspendre ${confirmAction?.name} ? Il ne pourra plus créer de paniers.`
            : confirmAction?.type === "unsuspend"
            ? `Réactiver le compte de ${confirmAction?.name} ?`
            : `Êtes-vous sûr de vouloir supprimer le compte de ${confirmAction?.name} ? Il ne pourra plus se connecter ni créer de paniers. Les commandes et données financières seront conservées.`
        }
        confirmLabel={
          confirmAction?.type === "suspend" ? "Suspendre" :
          confirmAction?.type === "unsuspend" ? "Réactiver" :
          "Supprimer"
        }
        confirmColor={
          confirmAction?.type === "unsuspend" ? "bg-green-600 hover:bg-green-700" :
          confirmAction?.type === "suspend" ? "bg-orange-600 hover:bg-orange-700" :
          "bg-red-600 hover:bg-red-700"
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
        loading={isPending}
      />
    </div>
  );
}

/* ── Associations tab ── */
function AssoTab({ rows }: { rows: AssoRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<{ type: "suspend" | "unsuspend" | "delete"; id: string; name: string } | null>(null);

  const kpis = [
    { label: "Total Associations",   value: rows.length.toString(),                                          borderColor: "border-l-blue-500",   icon: "Users" },
    { label: "Associations Actives", value: rows.filter((r) => r.status === "actif").length.toString(),      borderColor: "border-l-green-500",  icon: "CheckCircle" },
    { label: "Distributions",        value: rows.reduce((s, r) => s + r.distCount, 0).toString(),            borderColor: "border-l-purple-500", icon: "ShoppingBag" },
    { label: "Familles Aidées",      value: rows.reduce((s, r) => s + r.famillesCount, 0).toString(),        borderColor: "border-l-pink-500",   icon: "Handshake" },
  ];

  function matchFilter(status: UserStatus) {
    if (filter === "Tous") return true;
    if (filter === "Actifs") return status === "actif";
    if (filter === "Suspendus") return status === "suspendu";
    if (filter === "Archivés") return status === "archivé";
    if (filter === "En attente") return status === "en attente";
    return true;
  }

  const filtered = rows.filter((r) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.responsable.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase());
    return matchSearch && matchFilter(r.status);
  });

  function handleConfirm() {
    if (!confirmAction) return;
    startTransition(async () => {
      let result;
      if (confirmAction.type === "suspend") result = await suspendAssociation(confirmAction.id);
      else if (confirmAction.type === "unsuspend") result = await unsuspendAssociation(confirmAction.id);
      else result = await deleteAssociation(confirmAction.id);

      if (result.success) {
        toast.success(
          confirmAction.type === "suspend" ? "Association suspendue" :
          confirmAction.type === "unsuspend" ? "Association réactivée" :
          "Association supprimée"
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setConfirmAction(null);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border-l-4 ${k.borderColor} border-t border-r border-b border-[#e2e5f0] shadow-sm p-5 flex items-center justify-between`}>
            <div><div className="text-xs text-gray-400 mb-1">{k.label}</div><div className="text-2xl font-bold text-gray-900">{k.value}</div></div>
            {(() => { const Icon = KPI_ICONS[k.icon]; return Icon ? <Icon className="h-7 w-7 text-gray-400" /> : null; })()}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 mb-5 flex items-center gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Rechercher par nom, responsable, email ou ville..." /></div>
        <FilterButtons active={filter} onChange={setFilter} />
      </div>
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead><tr className="border-b border-[#e2e5f0]">
            {["ASSOCIATION","RESPONSABLE","CONTACT","INSCRIPTION","STATISTIQUES","DERNIÈRE ACTIVITÉ","STATUT","ACTIONS"].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-[#f0f1f5]">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">Aucune association trouvée</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#fafbff] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={r.initials} color="bg-[#3744C8]" />
                    <div><div className="font-semibold text-sm text-purple-600">{r.name}</div><div className="text-xs text-gray-400"><MapPin className="h-3 w-3 inline mr-0.5" />{r.city}</div></div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-gray-700">{r.responsable}</td>
                <td className="px-5 py-4"><div className="text-xs text-gray-600"><Mail className="h-3 w-3 inline mr-0.5" />{r.email}</div><div className="text-xs text-gray-400 mt-0.5"><Phone className="h-3 w-3 inline mr-0.5" />{r.phone}</div></td>
                <td className="px-5 py-4 text-sm text-gray-500">{r.inscriptionDate}</td>
                <td className="px-5 py-4"><div className="text-xs text-gray-600"><ShoppingBag className="h-3 w-3 inline mr-0.5" />{r.distCount} dist.</div><div className="text-xs text-pink-500 mt-0.5"><Handshake className="h-3 w-3 inline mr-0.5" />{r.famillesCount} familles</div></td>
                <td className="px-5 py-4 text-xs text-gray-400"><Clock className="h-3 w-3 inline mr-0.5" />{r.lastActivity}</td>
                <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => router.push(`/kshare-admin/comptes/${r.id}?type=association`)} className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" title="Voir"><Eye className="h-4 w-4" /></button>
                    {r.status === "suspendu" ? (
                      <button onClick={() => setConfirmAction({ type: "unsuspend", id: r.id, name: r.name })} className="p-1.5 text-orange-400 hover:text-green-600 transition-colors cursor-pointer" title="Réactiver"><RotateCcw className="h-4 w-4" /></button>
                    ) : (
                      <button onClick={() => setConfirmAction({ type: "suspend", id: r.id, name: r.name })} className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors cursor-pointer" title="Suspendre"><Ban className="h-4 w-4" /></button>
                    )}
                    <button onClick={() => setConfirmAction({ type: "delete", id: r.id, name: r.name })} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={
          confirmAction?.type === "suspend" ? "Suspendre l'association" :
          confirmAction?.type === "unsuspend" ? "Réactiver l'association" :
          "Supprimer l'association"
        }
        message={
          confirmAction?.type === "suspend"
            ? `Êtes-vous sûr de vouloir suspendre ${confirmAction?.name} ?`
            : confirmAction?.type === "unsuspend"
            ? `Réactiver le compte de ${confirmAction?.name} ?`
            : `Êtes-vous sûr de vouloir supprimer le compte de ${confirmAction?.name} ? Il ne pourra plus se connecter. Les données de distributions et financières seront conservées.`
        }
        confirmLabel={
          confirmAction?.type === "suspend" ? "Suspendre" :
          confirmAction?.type === "unsuspend" ? "Réactiver" :
          "Supprimer"
        }
        confirmColor={
          confirmAction?.type === "unsuspend" ? "bg-green-600 hover:bg-green-700" :
          confirmAction?.type === "suspend" ? "bg-orange-600 hover:bg-orange-700" :
          "bg-red-600 hover:bg-red-700"
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
        loading={isPending}
      />
    </div>
  );
}

/* ── Main export ── */
export function AdminUsersClient({
  tab,
  clients,
  commercants,
  assos,
}: {
  tab: string;
  clients: ClientRow[];
  commercants: CommercantRow[];
  assos: AssoRow[];
}) {
  const [activeTab, setActiveTab] = useState(tab);

  return (
    <div>
      <SubTabs active={activeTab} onChange={setActiveTab} tabs={["Clients", "Commerçants", "Associations"]} />
      {activeTab === "Clients"      && <ClientsTab   rows={clients}     />}
      {activeTab === "Commerçants"  && <CommercantTab rows={commercants} />}
      {activeTab === "Associations" && <AssoTab       rows={assos}       />}
    </div>
  );
}
