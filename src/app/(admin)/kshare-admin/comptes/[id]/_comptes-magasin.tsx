"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ouvrirCompteMagasin, fermerCompteMagasin } from "./_actions";

export type CompteDelegue = {
  id: string;
  nom: string | null;
  email: string | null;
};

/**
 * Les comptes qui peuvent exploiter le magasin, à côté de son propriétaire.
 *
 * L'équipe du soir compose et publie les paniers : elle a besoin d'un accès
 * propre, pas de l'identifiant du gérant. Le délégué ne peut en revanche ni
 * modifier la fiche, ni toucher aux coordonnées bancaires, ni signer le
 * contrat.
 */
export default function ComptesMagasin({
  commerceId,
  proprietaire,
  delegues,
}: {
  commerceId: string;
  proprietaire: { nom: string | null; email: string | null };
  delegues: CompteDelegue[];
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [enCours, demarrer] = useTransition();

  const agir = (
    action: () => Promise<{ success: true } | { success: false; error: string }>,
    ok: string,
  ) =>
    demarrer(async () => {
      const r = await action();
      if (r.success) {
        setEmail("");
        setMessage({ texte: ok, erreur: false });
      } else {
        setMessage({ texte: r.error, erreur: true });
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comptes du magasin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          <div className="flex items-center justify-between px-3 py-2 text-sm">
            <span>
              <span className="text-slate-900">{proprietaire.nom ?? "—"}</span>
              {proprietaire.email && (
                <span className="text-slate-500"> · {proprietaire.email}</span>
              )}
            </span>
            <span className="text-xs uppercase tracking-wide text-slate-400">Propriétaire</span>
          </div>

          {delegues.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>
                <span className="text-slate-900">{d.nom ?? "—"}</span>
                {d.email && <span className="text-slate-500"> · {d.email}</span>}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={enCours}
                onClick={() => agir(() => fermerCompteMagasin(d.id), "Accès retiré.")}
              >
                Retirer
              </Button>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          Un compte délégué publie des paniers, traite les commandes et scanne les retraits.
          Il ne peut pas modifier la fiche du commerce, ni les coordonnées bancaires, ni
          signer le contrat.
        </p>

        <div className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail d'un compte Kshare existant"
            className="flex-1"
          />
          <Button
            disabled={!email || enCours}
            onClick={() => agir(() => ouvrirCompteMagasin(commerceId, email), "Compte ajouté.")}
          >
            Ajouter
          </Button>
        </div>

        {message && (
          <p className={`text-sm ${message.erreur ? "text-red-700" : "text-green-700"}`}>
            {message.texte}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
