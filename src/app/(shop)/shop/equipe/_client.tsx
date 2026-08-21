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
 * Le compte employé du magasin, créé par son responsable.
 *
 * Un seul compte, partagé par l'équipe : une adresse, un mot de passe, qu'il
 * choisit lui-même et transmet de vive voix. Pas d'invitation par courriel à
 * attendre en fin de journée, au moment précis où il faut publier les invendus,
 * et pas de liste de comptes nominatifs à tenir à jour.
 */
export default function EquipeClient({
  magasin,
  employe,
}: {
  magasin: string;
  employe: Employe | null;
}) {
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [enCours, demarrer] = useTransition();
  const [changeMdp, setChangeMdp] = useState(false);
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
        setChangeMdp(false);
        setNouveauMdp("");
      }
    });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compte de l&apos;équipe</h1>
        <p className="text-slate-600 mt-1">
          Un accès distinct du vôtre pour les personnes qui publient les paniers et scannent
          les retraits chez {magasin}. Elles ne verront ni vos chiffres, ni vos coordonnées
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

      {employe ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compte actif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <div className="text-sm text-slate-900 font-medium">{employe.nom ?? "—"}</div>
              <div className="text-sm text-slate-600 mt-0.5">{employe.email}</div>
              <div className="text-xs text-slate-400 mt-1">
                Créé le{" "}
                {new Date(employe.depuis).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>

            {changeMdp ? (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={nouveauMdp}
                  onChange={(e) => setNouveauMdp(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  autoFocus
                />
                <p className="text-xs text-slate-500">
                  Au moins 8 caractères, lettres et chiffres mêlés.
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={!nouveauMdp || enCours}
                    onClick={() =>
                      agir(
                        () => redefinirMotDePasse(employe.id, nouveauMdp),
                        "Mot de passe changé.",
                      )
                    }
                  >
                    Enregistrer
                  </Button>
                  <Button variant="ghost" onClick={() => setChangeMdp(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" disabled={enCours} onClick={() => setChangeMdp(true)}>
                  Changer le mot de passe
                </Button>
                <Button
                  variant="ghost"
                  disabled={enCours}
                  onClick={() =>
                    agir(() => retirerCompteEmploye(employe.id), "Accès retiré.")
                  }
                >
                  Supprimer l&apos;accès
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Créer le compte</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={(formData) => agir(() => creerCompteEmploye(formData), "Compte créé.")}
              className="space-y-3"
            >
              <Input name="nom" placeholder="Nom de la personne, ou « Équipe du soir »" required />
              <Input name="email" type="email" placeholder="Adresse e-mail du compte" required />
              <div>
                <Input
                  name="mot_de_passe"
                  type="text"
                  placeholder="Mot de passe que vous communiquerez"
                  required
                  minLength={8}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Au moins 8 caractères, lettres et chiffres mêlés. Il reste lisible pendant
                  la saisie : c&apos;est vous qui le transmettez, autant le relire.
                </p>
              </div>
              <Button type="submit" disabled={enCours}>
                {enCours ? "Création…" : "Créer le compte"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-slate-500">
        Un seul compte par magasin, partagé par l&apos;équipe. Si quelqu&apos;un quitte le
        commerce, changez simplement le mot de passe.
      </p>
    </div>
  );
}
