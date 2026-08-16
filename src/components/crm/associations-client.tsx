"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Loader2, MapPin, Phone, Mail } from "lucide-react";
import {
  changerStatutLead,
  geocoderAssociation,
  type StatutLead,
} from "@/app/(crm)/kshare-crm/associations/_actions";

interface Lead {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  commerce_name: string | null;
}

interface Association {
  id: string;
  name: string;
  city: string | null;
  department: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
}

const STATUTS: { valeur: StatutLead; libelle: string }[] = [
  { valeur: "new", libelle: "À contacter" },
  { valeur: "contacted", libelle: "Contactée" },
  { valeur: "registered", libelle: "Inscrite" },
  { valeur: "rejected", libelle: "Non retenue" },
];

const COULEUR_STATUT: Record<string, string> = {
  new: "bg-amber-50 text-amber-700 border-amber-200",
  contacted: "bg-blue-50 text-blue-700 border-blue-200",
  registered: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-gray-100 text-gray-600 border-gray-200",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  leads: Lead[];
  associations: Association[];
}

export function AssociationsClient({ leads, associations }: Props) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  // Les signalements non traités d'abord : c'est la file de travail.
  const aTraiter = leads.filter((l) => l.status === "new");
  const traites = leads.filter((l) => l.status !== "new");

  const sansCoordonnees = associations.filter(
    (a) => a.latitude === null || a.longitude === null,
  );

  function majStatut(id: string, statut: StatutLead) {
    setErreur(null);
    setSucces(null);
    demarrer(async () => {
      const r = await changerStatutLead(id, statut);
      if (!r.success) setErreur(r.error);
    });
  }

  function geocoder(id: string, nom: string) {
    setErreur(null);
    setSucces(null);
    demarrer(async () => {
      const r = await geocoderAssociation(id);
      if (r.success) setSucces(`${nom} est maintenant située.`);
      else setErreur(r.error);
    });
  }

  return (
    <div className="space-y-6">
      {erreur && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erreur}
        </p>
      )}
      {succes && (
        <p className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check className="h-4 w-4" />
          {succes}
        </p>
      )}

      {/* Une association sans coordonnées ne voit aucun panier : le rayon se
          calcule contre NULL et la comparaison échoue. C'est silencieux, donc on
          le rend visible. */}
      {sansCoordonnees.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-amber-900">
              {sansCoordonnees.length} association
              {sansCoordonnees.length > 1 ? "s" : ""} sans adresse résolue
            </h2>
          </div>
          <p className="mb-3 text-sm text-amber-800">
            Sans coordonnées, elles ne voient aucun panier : le rayon de 50 km ne
            peut pas se calculer.
          </p>
          <ul className="space-y-2">
            {sansCoordonnees.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-amber-900">
                  {a.name}
                  {a.city && <span className="text-amber-700"> · {a.city}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => geocoder(a.id, a.name)}
                  disabled={enCours}
                  className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  Situer
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Signalements ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-[#e2e5f0] bg-white p-6">
        <h2 className="mb-1 font-semibold text-foreground">
          Signalées par les commerçants
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {aTraiter.length === 0
            ? "Rien à traiter."
            : `${aTraiter.length} à contacter.`}
        </p>

        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun commerçant n&apos;a encore signalé d&apos;association.
          </p>
        ) : (
          <ul className="divide-y divide-[#e2e5f0]">
            {[...aTraiter, ...traites].map((l) => (
              <li key={l.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{l.name}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          COULEUR_STATUT[l.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUTS.find((s) => s.valeur === l.status)?.libelle ?? l.status}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {l.contact_name && <span>{l.contact_name}</span>}
                      {l.phone && (
                        <a
                          href={`tel:${l.phone}`}
                          className="inline-flex items-center gap-1 hover:text-[#3744C8]"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {l.phone}
                        </a>
                      )}
                      {l.email && (
                        <a
                          href={`mailto:${l.email}`}
                          className="inline-flex items-center gap-1 hover:text-[#3744C8]"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {l.email}
                        </a>
                      )}
                      {l.address && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {l.address}
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Signalée le {formatDate(l.created_at)}
                      {l.commerce_name && ` par ${l.commerce_name}`}
                    </p>
                  </div>

                  <select
                    value={l.status}
                    onChange={(e) => majStatut(l.id, e.target.value as StatutLead)}
                    disabled={enCours}
                    className="shrink-0 rounded-lg border border-[#e2e5f0] px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    {STATUTS.map((s) => (
                      <option key={s.valeur} value={s.valeur}>
                        {s.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Inscrites ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-[#e2e5f0] bg-white p-6">
        <h2 className="mb-4 font-semibold text-foreground">
          Inscrites sur Kshare ({associations.length})
        </h2>
        {associations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune association inscrite.</p>
        ) : (
          <ul className="divide-y divide-[#e2e5f0]">
            {associations.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <span className="font-medium text-foreground">{a.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {[a.city, a.department].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a.latitude !== null && a.longitude !== null ? "Située" : "Non située"}
                  {" · "}
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {enCours && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Enregistrement…
        </p>
      )}
    </div>
  );
}
