"use client";

import { useState } from "react";
import Link         from "next/link";
import { Search, Eye, Edit2 } from "lucide-react";

/* ── Shared types ── */
export interface ClientRow {
  id: string; initials: string; fullName: string; city: string;
  email: string; phone: string; inscriptionDate: string;
  basketCount: number; donationsAmount: number;
  lastActivity: string; status: "actif" | "inactif";
}
export interface CommercantRow {
  id: string; initials: string; fullName: string; city: string;
  commerceName: string; commerceType: string; email: string; phone: string;
  hashgakha: string; proposedCount: number; soldCount: number;
  lastActivity: string; status: "actif" | "inactif";
}
export interface AssoRow {
  id: string; initials: string; name: string; city: string;
  responsable: string; email: string; phone: string;
  inscriptionDate: string; distCount: number; famillesCount: number;
  lastActivity: string; status: "actif" | "inactif";
}

function StatusBadge({ status }: { status: "actif" | "inactif" }) {
  return status === "actif"
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />actif</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"><span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />inactif</span>;
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
      {["Tous", "Actifs", "Inactifs"].map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            active === f ? "bg-[#3744C8] text-white" : "bg-white border border-[#e2e5f0] text-gray-600 hover:bg-gray-50"
          }`}
        >
          {f}
        </button>
      ))}
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
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === t ? "bg-[#3744C8] text-white" : "bg-white border border-[#e2e5f0] text-gray-600 hover:bg-gray-50"
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");

  const kpis = [
    { label: "Total Clients",   value: rows.length.toString(),                                            borderColor: "border-l-blue-500",   icon: "👥" },
    { label: "Clients Actifs",  value: rows.filter((r) => r.status === "actif").length.toString(),        borderColor: "border-l-green-500",  icon: "✅" },
    { label: "Paniers Sauvés",  value: rows.reduce((s, r) => s + r.basketCount, 0).toString(),            borderColor: "border-l-orange-500", icon: "🛍️" },
    { label: "Total Dons (€)",  value: `${rows.reduce((s, r) => s + r.donationsAmount, 0).toFixed(0)}€`, borderColor: "border-l-pink-500",   icon: "🤝" },
  ];

  const filtered = rows.filter((r) => {
    const matchSearch = !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "Tous" || (filter === "Actifs" && r.status === "actif") || (filter === "Inactifs" && r.status === "inactif");
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border-l-4 ${k.borderColor} border-t border-r border-b border-[#e2e5f0] shadow-sm p-5 flex items-center justify-between`}>
            <div><div className="text-xs text-gray-400 mb-1">{k.label}</div><div className="text-2xl font-bold text-gray-900">{k.value}</div></div>
            <span className="text-3xl">{k.icon}</span>
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
              <tr key={r.id} className="hover:bg-[#fafbff] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={r.initials} />
                    <div><div className="font-semibold text-sm text-[#3744C8]">{r.fullName}</div><div className="text-xs text-gray-400">📍 {r.city}</div></div>
                  </div>
                </td>
                <td className="px-5 py-4"><div className="text-xs text-gray-600">✉️ {r.email}</div><div className="text-xs text-gray-400 mt-0.5">📞 {r.phone}</div></td>
                <td className="px-5 py-4 text-sm text-gray-500">{r.inscriptionDate}</td>
                <td className="px-5 py-4"><div className="text-xs text-gray-600">🛍️ {r.basketCount} <span className="text-pink-500 ml-1">🤝 {r.donationsAmount}€</span></div></td>
                <td className="px-5 py-4 text-xs text-gray-400">🕐 {r.lastActivity}</td>
                <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 text-gray-400 hover:text-[#3744C8] transition-colors"><Eye className="h-4 w-4" /></button>
                    <button className="p-1.5 text-gray-400 hover:text-[#3744C8] transition-colors"><Edit2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Commerçants tab ── */
function CommercantTab({ rows }: { rows: CommercantRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");

  const kpis = [
    { label: "Total Commerçants",   value: rows.length.toString(),                                           borderColor: "border-l-blue-500",   icon: "🏪" },
    { label: "Commerçants Actifs",  value: rows.filter((r) => r.status === "actif").length.toString(),       borderColor: "border-l-green-500",  icon: "✅" },
    { label: "Paniers Proposés",    value: rows.reduce((s, r) => s + r.proposedCount, 0).toString(),         borderColor: "border-l-orange-500", icon: "🛍️" },
    { label: "Paniers Vendus",      value: rows.reduce((s, r) => s + r.soldCount, 0).toString(),             borderColor: "border-l-green-500",  icon: "✅" },
  ];

  const filtered = rows.filter((r) => {
    const matchSearch = !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.commerceName.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "Tous" || (filter === "Actifs" && r.status === "actif") || (filter === "Inactifs" && r.status === "inactif");
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border-l-4 ${k.borderColor} border-t border-r border-b border-[#e2e5f0] shadow-sm p-5 flex items-center justify-between`}>
            <div><div className="text-xs text-gray-400 mb-1">{k.label}</div><div className="text-2xl font-bold text-gray-900">{k.value}</div></div>
            <span className="text-3xl">{k.icon}</span>
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
            {["COMMERÇANT","COMMERCE","CONTACT","HASHGAKHA","STATISTIQUES","DERNIÈRE ACTIVITÉ","STATUT","ACTIONS"].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-[#f0f1f5]">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">Aucun commerçant trouvé</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#fafbff] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={r.initials} />
                    <div><div className="font-semibold text-sm text-[#3744C8]">{r.fullName}</div><div className="text-xs text-gray-400">📍 {r.city}</div></div>
                  </div>
                </td>
                <td className="px-5 py-4"><div className="text-sm font-medium text-gray-800">🏪 {r.commerceName}</div><div className="text-xs text-gray-400">{r.commerceType}</div></td>
                <td className="px-5 py-4"><div className="text-xs text-gray-600">✉️ {r.email}</div><div className="text-xs text-gray-400 mt-0.5">📞 {r.phone}</div></td>
                <td className="px-5 py-4"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">{r.hashgakha || "—"}</span></td>
                <td className="px-5 py-4"><div className="text-xs text-gray-600">🛍️ {r.proposedCount} proposés</div><div className="text-xs text-green-600 mt-0.5">✅ {r.soldCount} vendus</div></td>
                <td className="px-5 py-4 text-xs text-gray-400">🕐 {r.lastActivity}</td>
                <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-4"><button className="p-1.5 text-gray-400 hover:text-[#3744C8] transition-colors"><Eye className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Associations tab ── */
function AssoTab({ rows }: { rows: AssoRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");

  const kpis = [
    { label: "Total Associations",   value: rows.length.toString(),                                          borderColor: "border-l-blue-500",   icon: "👥" },
    { label: "Associations Actives", value: rows.filter((r) => r.status === "actif").length.toString(),      borderColor: "border-l-green-500",  icon: "✅" },
    { label: "Distributions",        value: rows.reduce((s, r) => s + r.distCount, 0).toString(),            borderColor: "border-l-purple-500", icon: "🛍️" },
    { label: "Familles Aidées",      value: rows.reduce((s, r) => s + r.famillesCount, 0).toString(),        borderColor: "border-l-pink-500",   icon: "🤝" },
  ];

  const filtered = rows.filter((r) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.responsable.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "Tous" || (filter === "Actifs" && r.status === "actif") || (filter === "Inactifs" && r.status === "inactif");
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border-l-4 ${k.borderColor} border-t border-r border-b border-[#e2e5f0] shadow-sm p-5 flex items-center justify-between`}>
            <div><div className="text-xs text-gray-400 mb-1">{k.label}</div><div className="text-2xl font-bold text-gray-900">{k.value}</div></div>
            <span className="text-3xl">{k.icon}</span>
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
                    <Avatar initials={r.initials} color="bg-gradient-to-br from-purple-500 to-pink-500" />
                    <div><div className="font-semibold text-sm text-purple-600">{r.name}</div><div className="text-xs text-gray-400">📍 {r.city}</div></div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-gray-700">{r.responsable}</td>
                <td className="px-5 py-4"><div className="text-xs text-gray-600">✉️ {r.email}</div><div className="text-xs text-gray-400 mt-0.5">📞 {r.phone}</div></td>
                <td className="px-5 py-4 text-sm text-gray-500">{r.inscriptionDate}</td>
                <td className="px-5 py-4"><div className="text-xs text-gray-600">🛍️ {r.distCount} dist.</div><div className="text-xs text-pink-500 mt-0.5">🤝 {r.famillesCount} familles</div></td>
                <td className="px-5 py-4 text-xs text-gray-400">🕐 {r.lastActivity}</td>
                <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors"><Eye className="h-4 w-4" /></button>
                    <button className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors"><Edit2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
