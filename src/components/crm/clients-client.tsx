"use client";

import { useMemo, useState } from "react";
import {
  Users, Search, Phone, Mail, MapPin, AlertTriangle, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Store, ExternalLink,
} from "lucide-react";
import { ALERTES, conseilPlan, type AlerteClient, type Client } from "@/lib/crm/clients";

interface Props {
  clients: Client[];
  /** Chiffre d'affaires mensuel à partir duquel le plan Pro devient rentable. */
  seuilPro: number;
}

function euros(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} €`;
}

function date(v: string | null): string {
  return v ? new Date(v).toLocaleDateString("fr-FR") : "—";
}

function joursDepuis(v: string | null): number | null {
  if (!v) return null;
  return Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000);
}

const TRIS = [
  { cle: "commission", label: "Commission générée" },
  { cle: "ventes30j", label: "Volume 30 jours" },
  { cle: "alertes", label: "Comptes à traiter" },
  { cle: "nom", label: "Nom" },
] as const;

type Tri = (typeof TRIS)[number]["cle"];

export function ClientsClient({ clients, seuilPro }: Props) {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<Tri>("commission");
  const [filtreAlerte, setFiltreAlerte] = useState<AlerteClient | null>(null);

  const compteurs = useMemo(() => {
    const c: Partial<Record<AlerteClient, number>> = {};
    for (const client of clients) {
      for (const a of client.alertes) c[a] = (c[a] ?? 0) + 1;
    }
    return c;
  }, [clients]);

  const affiches = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    let liste = clients;

    if (q) {
      liste = liste.filter((c) =>
        [c.nom, c.ville, c.email, c.telephone, c.representant]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q)),
      );
    }
    if (filtreAlerte) liste = liste.filter((c) => c.alertes.includes(filtreAlerte));

    return [...liste].sort((a, b) => {
      switch (tri) {
        case "ventes30j":
          return b.ventes30j - a.ventes30j;
        case "nom":
          return a.nom.localeCompare(b.nom, "fr");
        case "alertes": {
          // Les comptes bloqués d'abord : ce sont eux qui coûtent de l'argent.
          const gravite = (c: Client) =>
            c.alertes.filter((x) => ALERTES[x].grave).length * 10 + c.alertes.length;
          return gravite(b) - gravite(a);
        }
        default:
          return b.commission - a.commission;
      }
    });
  }, [clients, recherche, tri, filtreAlerte]);

  const totalCommission = clients.reduce((s, c) => s + c.commission, 0);
  const totalVentes = clients.reduce((s, c) => s + c.ventes, 0);
  const actifs = clients.filter((c) => c.paniers30j > 0).length;
  const bloques = clients.filter((c) => c.alertes.some((a) => ALERTES[a].grave)).length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-[#3744C8]" />
            Clients
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Les commerces inscrits, ce qu&apos;ils rapportent, et ce qui les bloque.
          </p>
        </div>
      </div>

      {/* Chiffres d'ensemble */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Commerces inscrits", valeur: String(clients.length) },
          { label: "Actifs sur 30 jours", valeur: `${actifs} / ${clients.length}` },
          { label: "Ventes cumulées", valeur: euros(totalVentes) },
          { label: "Commission cumulée", valeur: euros(totalCommission), fort: true },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-[#e2e5f0] p-4">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div
              className={`text-xl font-bold mt-1 ${c.fort ? "text-[#3744C8]" : "text-gray-900"}`}
            >
              {c.valeur}
            </div>
          </div>
        ))}
      </div>

      {/* Un compte bloqué ne vend pas, ou vend sans pouvoir être payé : c'est
          la seule chose de cet écran qui appelle une action le jour même. */}
      {bloques > 0 && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <p className="font-semibold">
              {bloques} compte{bloques > 1 ? "s" : ""} bloqué{bloques > 1 ? "s" : ""}.
            </p>
            <p className="mt-1">
              Contrat non signé, Stripe incomplet ou prélèvement en échec : ces commerces ne
              peuvent pas vendre, ou vendent sans pouvoir être payés.
            </p>
          </div>
        </div>
      )}

      {/* Recherche, tri, filtres */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom, ville, email, téléphone, représentant…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
            />
          </div>
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as Tri)}
            className="px-4 py-2 rounded-xl border border-[#e2e5f0] bg-white text-sm font-medium text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
          >
            {TRIS.map((t) => (
              <option key={t.cle} value={t.cle}>
                Trier par : {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Pastille actif={filtreAlerte === null} onClick={() => setFiltreAlerte(null)}>
            Tous ({clients.length})
          </Pastille>
          {(Object.keys(ALERTES) as AlerteClient[])
            .filter((a) => compteurs[a])
            .map((a) => (
              <Pastille
                key={a}
                actif={filtreAlerte === a}
                grave={ALERTES[a].grave}
                onClick={() => setFiltreAlerte(filtreAlerte === a ? null : a)}
              >
                {ALERTES[a].label} ({compteurs[a]})
              </Pastille>
            ))}
        </div>
      </div>

      {affiches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-12 text-center">
          <Store className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {clients.length === 0
              ? "Aucun commerce inscrit pour l'instant."
              : "Aucun commerce ne correspond à cette recherche."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {affiches.map((c) => (
            <FicheClient key={c.id} client={c} seuilPro={seuilPro} />
          ))}
        </div>
      )}
    </div>
  );
}

function Pastille({
  actif,
  grave,
  onClick,
  children,
}: {
  actif: boolean;
  grave?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
        actif
          ? "bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] text-white shadow-sm"
          : grave
            ? "bg-red-50 text-red-700 hover:bg-red-100"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function FicheClient({ client, seuilPro }: { client: Client; seuilPro: number }) {
  const [ouvert, setOuvert] = useState(false);
  const conseil = conseilPlan(client);
  const jours = joursDepuis(client.derniereVente);

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm overflow-hidden">
      <button
        onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#fafbff] transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <span className="font-semibold text-gray-900 truncate">{client.nom}</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              client.plan === "pro"
                ? "bg-violet-100 text-violet-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {client.plan === "pro" ? "Pro" : "Starter"} · {client.tauxCommission} %
          </span>
          {client.ville && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="h-3 w-3" /> {client.ville}
            </span>
          )}
          {client.alertes.map((a) => (
            <span
              key={a}
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                ALERTES[a].grave ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
              }`}
            >
              {ALERTES[a].label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 shrink-0 pl-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-[#3744C8]">{euros(client.commission)}</div>
            <div className="text-xs text-gray-400">
              {client.paniers} panier{client.paniers > 1 ? "s" : ""}
            </div>
          </div>
          {ouvert ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {ouvert && (
        <div className="px-5 pb-5 border-t border-[#f0f1f5] pt-4 space-y-4">
          {conseil && (
            <div className="rounded-xl border border-[#e2e5f0] bg-[#f7f8ff] p-3 flex gap-2.5 text-sm">
              {conseil === "passer_pro" ? (
                <TrendingUp className="h-4 w-4 text-[#3744C8] shrink-0 mt-0.5" />
              ) : (
                <TrendingDown className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="text-gray-700">
                {conseil === "passer_pro" ? (
                  <>
                    <span className="font-semibold">Aurait intérêt à passer Pro.</span> Au-delà de{" "}
                    {euros(seuilPro)} de ventes mensuelles, les six points de commission
                    économisés dépassent le prix de l&apos;abonnement.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Paie un abonnement peu rentable.</span> En
                    dessous de {euros(seuilPro)} de ventes mensuelles, le plan Starter lui
                    coûterait moins cher. Le lui dire vaut mieux qu&apos;attendre qu&apos;il le
                    découvre.
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Coordonnées */}
            <div className="space-y-1.5 text-sm">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Contact
              </div>
              {client.representant && <div className="text-gray-700">{client.representant}</div>}
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-2 text-[#3744C8] hover:underline"
              >
                <Mail className="h-4 w-4" /> {client.email}
              </a>
              {client.telephone && (
                <a
                  href={`tel:${client.telephone}`}
                  className="flex items-center gap-2 text-[#3744C8] hover:underline"
                >
                  <Phone className="h-4 w-4" /> {client.telephone}
                </a>
              )}
              <div className="text-gray-500 text-xs pt-1">
                SIRET {client.siret ?? "non renseigné"} · {client.type}
              </div>
            </div>

            {/* État du compte */}
            <div className="space-y-1.5 text-sm">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Compte
              </div>
              <Ligne libelle="Inscrit le" valeur={date(client.inscritLe)} />
              <Ligne libelle="Validé le" valeur={date(client.valideLe)} />
              <Ligne
                libelle="Contrat signé"
                valeur={date(client.contratSigneLe)}
                alerte={!client.contratSigneLe}
              />
              <Ligne
                libelle="Stripe Connect"
                valeur={client.stripePret ? "opérationnel" : "incomplet"}
                alerte={!client.stripePret}
              />
              {client.abonnementPrix > 0 && (
                <Ligne
                  libelle="Abonnement"
                  valeur={`${euros(client.abonnementPrix)} / mois · ${client.abonnementStatut ?? "—"}`}
                  alerte={client.abonnementStatut === "unpaid"}
                />
              )}
            </div>
          </div>

          {/* Volume */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Activité
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Case libelle="Paniers vendus" valeur={String(client.paniers)} />
              <Case libelle="Ventes cumulées" valeur={euros(client.ventes)} />
              <Case libelle="Commission" valeur={euros(client.commission)} fort />
              <Case
                libelle="Dernière vente"
                valeur={
                  jours === null ? "jamais" : jours === 0 ? "aujourd'hui" : `il y a ${jours} j`
                }
                alerte={jours === null || jours > 30}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <Case libelle="Paniers 30 j" valeur={String(client.paniers30j)} />
              <Case libelle="Ventes 30 j" valeur={euros(client.ventes30j)} />
              <Case libelle="Commission 30 j" valeur={euros(client.commission30j)} />
              <Case libelle="Première vente" valeur={date(client.premiereVente)} />
            </div>
          </div>

          <a
            href={`/kshare-admin/comptes/${client.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#3744C8] hover:underline"
          >
            Ouvrir la fiche dans l&apos;administration
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

function Ligne({
  libelle,
  valeur,
  alerte,
}: {
  libelle: string;
  valeur: string;
  alerte?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{libelle}</span>
      <span className={alerte ? "text-red-600 font-medium" : "text-gray-800"}>{valeur}</span>
    </div>
  );
}

function Case({
  libelle,
  valeur,
  fort,
  alerte,
}: {
  libelle: string;
  valeur: string;
  fort?: boolean;
  alerte?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#e2e5f0] px-3 py-2">
      <div className="text-[11px] text-gray-500">{libelle}</div>
      <div
        className={`text-sm font-bold mt-0.5 ${
          alerte ? "text-amber-700" : fort ? "text-[#3744C8]" : "text-gray-900"
        }`}
      >
        {valeur}
      </div>
    </div>
  );
}
