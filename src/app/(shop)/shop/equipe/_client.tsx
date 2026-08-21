"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { creerCompteEmploye, redefinirMotDePasse, retirerCompteEmploye } from "./_actions";

type Employe = {
  id: string;
  nom: string | null;
  email: string | null;
  depuis: string;
};

type Retour = { success: true; message?: string } | { success: false; error: string };

/**
 * Les comptes de l'équipe, créés par le responsable du magasin.
 *
 * Il choisit lui-même le mot de passe et le transmet de vive voix : pas
 * d'invitation par e-mail à attendre en fin de journée, au moment précis où il
 * faut publier les invendus.
 */
export default function EquipeClient({
  magasin,
  employes,
}: {
  magasin: string;
  employes: Employe[];
}) {
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [enCours, demarrer] = useTransition();
  const [reinitialise, setReinitialise] = useState<string | null>(null);
  const [nouveauMdp, setNouveauMdp] = useState("");

  const agir = (action: () => Promise<Retour>, defaut: string) =>
    demarrer(async () => {
      const r = await action();
      setMessage(
        r.success
          ? { texte: r.message ?? defaut, erreur: false }
          : { texte: r.error, erreur: true },
      );
      if (r.success) {
        setReinitialise(null);
        setNouveauMdp("");
      }
    });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Comptes de l&apos;équipe</h1>
        <p className="text-slate-600 mt-1">
          Donnez un accès propre aux personnes qui publient les paniers et scannent les
          retraits chez {magasin}. Elles ne verront ni vos chiffres, ni vos coordonnées
          bancaires, ni votre contrat.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une personne</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => agir(() => creerCompteEmploye(formData), "Compte créé.")}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Input name="nom" placeholder="Nom et prénom" required />
            <Input name="email" type="email" placeholder="Adresse e-mail" required />
            <div className="sm:col-span-2">
              <Input
                name="mot_de_passe"
                type="text"
                placeholder="Mot de passe que vous lui communiquerez"
                required
                minLength={8}
              />
              <p className="text-xs text-slate-500 mt-1">
                Au moins 8 caractères, avec des lettres et des chiffres. Il reste affiché
                pendant la saisie : c&apos;est vous qui le transmettez, autant le relire.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={enCours}>
                {enCours ? "Création…" : "Créer le compte"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {employes.length === 0
              ? "Aucun compte pour le moment"
              : `${employes.length} compte${employes.length > 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Vous êtes seul à accéder au magasin. Tant que c&apos;est le cas, votre
              identifiant sert aussi à publier les paniers.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {employes.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">
                      <span className="text-slate-900 font-medium">{e.nom ?? "—"}</span>
                      {e.email && <span className="text-slate-500"> · {e.email}</span>}
                    </span>
                    <span className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={enCours}
                        onClick={() => setReinitialise(reinitialise === e.id ? null : e.id)}
                      >
                        Mot de passe
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={enCours}
                        onClick={() =>
                          agir(() => retirerCompteEmploye(e.id), "Accès retiré.")
                        }
                      >
                        Retirer
                      </Button>
                    </span>
                  </div>

                  {reinitialise === e.id && (
                    <div className="flex gap-2 mt-3">
                      <Input
                        type="text"
                        value={nouveauMdp}
                        onChange={(ev) => setNouveauMdp(ev.target.value)}
                        placeholder="Nouveau mot de passe"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        disabled={!nouveauMdp || enCours}
                        onClick={() =>
                          agir(
                            () => redefinirMotDePasse(e.id, nouveauMdp),
                            "Mot de passe changé.",
                          )
                        }
                      >
                        Changer
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
