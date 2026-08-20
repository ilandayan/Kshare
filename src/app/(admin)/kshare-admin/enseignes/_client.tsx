"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Palier } from "@/lib/groupes";
import {
  creerEnseigne,
  rattacherMagasin,
  detacherMagasin,
  ouvrirAcces,
  retirerAcces,
  enregistrerPaliers,
} from "./_actions";

type Magasin = { id: string; nom: string; ville: string | null; taux: number | null };
type Acces = { id: string; nom: string | null; email: string | null };
type Historique = { periode: string; ca: number; taux: number; magasins: number };

export type Enseigne = {
  id: string;
  nom: string;
  siren: string | null;
  contactNom: string | null;
  contactEmail: string | null;
  tauxCourant: number | null;
  actif: boolean;
  paliers: Palier[];
  tauxDernierCa: number | null;
  magasins: Magasin[];
  acces: Acces[];
  historique: Historique[];
};

const euros = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function EnseignesClient({
  enseignes,
  disponibles,
}: {
  enseignes: Enseigne[];
  disponibles: { id: string; nom: string; ville: string | null }[];
}) {
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enseignes</h1>
        <p className="text-slate-600 mt-1 max-w-3xl">
          Une enseigne regroupe des magasins juridiquement distincts sous une grille de
          commission commune, calculée sur leur chiffre d&apos;affaires cumulé. Chaque
          magasin garde son compte, ses paniers et sa facture.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.erreur
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-green-50 text-green-800 border border-green-200"
          }`}
        >
          {message.texte}
        </div>
      )}

      <NouvelleEnseigne onMessage={setMessage} />

      {enseignes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            Aucune enseigne pour le moment.
          </CardContent>
        </Card>
      ) : (
        enseignes.map((e) => (
          <CarteEnseigne
            key={e.id}
            enseigne={e}
            disponibles={disponibles}
            onMessage={setMessage}
          />
        ))
      )}
    </div>
  );
}

function NouvelleEnseigne({
  onMessage,
}: {
  onMessage: (m: { texte: string; erreur: boolean }) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, demarrer] = useTransition();

  if (!ouvert) {
    return (
      <Button onClick={() => setOuvert(true)} variant="outline">
        Créer une enseigne
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nouvelle enseigne</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) =>
            demarrer(async () => {
              const r = await creerEnseigne(formData);
              if (r.success) {
                setOuvert(false);
                onMessage({ texte: "Enseigne créée.", erreur: false });
              } else {
                onMessage({ texte: r.error, erreur: true });
              }
            })
          }
          className="grid gap-3 sm:grid-cols-2"
        >
          <Input name="nom" placeholder="Nom de l'enseigne" required />
          <Input name="siren" placeholder="SIREN de la centrale (facultatif)" />
          <Input name="contact_nom" placeholder="Contact à la centrale" />
          <Input name="contact_email" type="email" placeholder="E-mail du récapitulatif" />
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={enCours}>
              {enCours ? "Création…" : "Créer"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CarteEnseigne({
  enseigne,
  disponibles,
  onMessage,
}: {
  enseigne: Enseigne;
  disponibles: { id: string; nom: string; ville: string | null }[];
  onMessage: (m: { texte: string; erreur: boolean }) => void;
}) {
  const [enCours, demarrer] = useTransition();
  const [aRattacher, setARattacher] = useState("");
  const [emailAcces, setEmailAcces] = useState("");
  const [paliers, setPaliers] = useState<Palier[]>(enseigne.paliers);

  const agir = (action: () => Promise<{ success: true } | { success: false; error: string }>, ok: string) =>
    demarrer(async () => {
      const r = await action();
      onMessage(r.success ? { texte: ok, erreur: false } : { texte: r.error, erreur: true });
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">{enseigne.nom}</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            {enseigne.siren ? `SIREN ${enseigne.siren} · ` : ""}
            {enseigne.magasins.length} magasin{enseigne.magasins.length > 1 ? "s" : ""}
            {enseigne.contactEmail ? ` · ${enseigne.contactEmail}` : " · aucun contact"}
          </p>
        </div>
        <Badge variant={enseigne.tauxCourant === null ? "secondary" : "default"}>
          {enseigne.tauxCourant === null ? "18 % (base)" : `${enseigne.tauxCourant} %`}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Magasins ── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Magasins du réseau</h3>
          {enseigne.magasins.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun magasin rattaché.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {enseigne.magasins.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    <span className="text-slate-900">{m.nom}</span>
                    {m.ville && <span className="text-slate-500"> · {m.ville}</span>}
                    <span className="text-slate-400 tabular-nums"> · {m.taux ?? 18} %</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={enCours}
                    onClick={() =>
                      agir(() => detacherMagasin(m.id), `${m.nom} détaché, retour à 18 %.`)
                    }
                  >
                    Détacher
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {disponibles.length > 0 && (
            <div className="flex gap-2 mt-3">
              <select
                value={aRattacher}
                onChange={(e) => setARattacher(e.target.value)}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Rattacher un magasin…</option>
                {disponibles.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                    {d.ville ? ` — ${d.ville}` : ""}
                  </option>
                ))}
              </select>
              <Button
                disabled={!aRattacher || enCours}
                onClick={() =>
                  agir(() => rattacherMagasin(enseigne.id, aRattacher), "Magasin rattaché.")
                }
              >
                Rattacher
              </Button>
            </div>
          )}
        </section>

        {/* ── Grille ── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Grille de commission</h3>
          <p className="text-xs text-slate-500 mb-2">
            Le chiffre d&apos;affaires cumulé du mois détermine le taux du mois suivant, appliqué
            à tous les magasins. La grille doit être dégressive et partir de 0 €.
          </p>
          <div className="space-y-2">
            {paliers.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 w-20">à partir de</span>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={p.seuil}
                  onChange={(e) => {
                    const copie = [...paliers];
                    copie[i] = { ...copie[i], seuil: Number(e.target.value) };
                    setPaliers(copie);
                  }}
                  className="w-32 tabular-nums"
                />
                <span className="text-slate-500">€ →</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={p.taux}
                  onChange={(e) => {
                    const copie = [...paliers];
                    copie[i] = { ...copie[i], taux: Number(e.target.value) };
                    setPaliers(copie);
                  }}
                  className="w-20 tabular-nums"
                />
                <span className="text-slate-500">%</span>
                {paliers.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPaliers(paliers.filter((_, j) => j !== i))}
                  >
                    Retirer
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setPaliers([
                  ...paliers,
                  {
                    seuil: (paliers.at(-1)?.seuil ?? 0) + 3000,
                    taux: Math.max(0, (paliers.at(-1)?.taux ?? 18) - 2),
                  },
                ])
              }
            >
              Ajouter un palier
            </Button>
            <Button
              size="sm"
              disabled={enCours}
              onClick={() =>
                agir(() => enregistrerPaliers(enseigne.id, paliers), "Grille enregistrée.")
              }
            >
              Enregistrer la grille
            </Button>
          </div>
        </section>

        {/* ── Accès ── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Accès à l&apos;espace enseigne</h3>
          <p className="text-xs text-slate-500 mb-2">
            Consultation seule : les personnes listées voient le consolidé du réseau, sans
            pouvoir publier ni modifier quoi que ce soit.
          </p>
          {enseigne.acces.length > 0 && (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg mb-3">
              {enseigne.acces.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-slate-700">
                    {a.nom ?? "—"}
                    {a.email && <span className="text-slate-500"> · {a.email}</span>}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={enCours}
                    onClick={() => agir(() => retirerAcces(a.id), "Accès retiré.")}
                  >
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              type="email"
              value={emailAcces}
              onChange={(e) => setEmailAcces(e.target.value)}
              placeholder="E-mail d'un compte Kshare existant"
              className="flex-1"
            />
            <Button
              disabled={!emailAcces || enCours}
              onClick={() =>
                agir(() => ouvrirAcces(enseigne.id, emailAcces), "Accès ouvert.")
              }
            >
              Ouvrir l&apos;accès
            </Button>
          </div>
        </section>

        {/* ── Historique ── */}
        {enseigne.historique.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Taux appliqués</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              {enseigne.historique.slice(0, 6).map((h) => (
                <li key={h.periode} className="tabular-nums">
                  {h.periode} · {euros(h.ca)} sur {h.magasins} magasins →{" "}
                  <strong className="text-slate-900">{h.taux} %</strong> le mois suivant
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
