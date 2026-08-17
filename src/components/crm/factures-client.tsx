"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText, Loader2, Download, Send, Ban, RefreshCw, Trash2, Check,
  AlertTriangle, Archive, Receipt, CreditCard, ChevronDown, ChevronUp, Clock, Lock,
} from "lucide-react";
import {
  preparerFactures, emettreFacture, recalculerBrouillon, supprimerBrouillon,
  annulerFacture, envoyerFacture, regenererPdf, lienFacture,
} from "@/app/(crm)/kshare-crm/factures/_actions";
import type { RecapCommission, RecapAbonnement, FactureExistante } from "@/lib/invoicing/compute";

interface Props {
  periode: string;
  periodes: { valeur: string; libelle: string }[];
  commissions: RecapCommission[];
  abonnements: RecapAbonnement[];
  emetteurIncomplet: string[];
  emetteurNom: string;
  conservationAnnees: number;
  /** Commandes encaissées qu'aucune période ne réclamera. */
  commandesOrphelines: number;
  /** Commission suspendue par un signalement, en attente d'arbitrage. */
  enAttente: { commandes: number; commission: number };
  /** Rien ne s'émet tant que l'ouverture officielle n'a pas eu lieu. */
  plateformeLancee: boolean;
}

type Agir = (
  cle: string,
  fn: () => Promise<{ success: boolean; message?: string; error?: string }>,
) => void;

function euros(v: number): string {
  const signe = v < 0 ? "− " : "";
  return `${signe}${Math.abs(v).toFixed(2).replace(".", ",")} €`;
}

const STATUT_FACTURE: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-gray-100 text-gray-700" },
  issued: { label: "Émise", cls: "bg-green-100 text-green-700" },
  canceled: { label: "Annulée", cls: "bg-red-100 text-red-700" },
};

export function FacturesClient({
  periode,
  periodes,
  commissions,
  abonnements,
  emetteurIncomplet,
  emetteurNom,
  conservationAnnees,
  commandesOrphelines,
  enAttente,
  plateformeLancee,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enCours, setEnCours] = useState<string | null>(null);

  const totalCommission = commissions.reduce((s, r) => s + r.commission, 0);
  const totalRemises = commissions.reduce((s, r) => s + r.remise + r.rembPeriode, 0);
  const totalVentes = commissions.reduce((s, r) => s + r.ventes, 0);
  const totalAbonnements = abonnements.reduce((s, a) => s + a.montant, 0);
  const sansFacture =
    commissions.filter((r) => r.facture === null).length +
    abonnements.filter((a) => a.facture === null).length;

  function agir(
    cle: string,
    fn: () => Promise<{ success: boolean; message?: string; error?: string }>,
  ) {
    setEnCours(cle);
    startTransition(async () => {
      const res = await fn();
      setEnCours(null);
      if (res.success) {
        toast.success(res.message ?? "C'est fait.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur inattendue.");
      }
    });
  }

  async function telecharger(id: string) {
    const res = await lienFacture(id);
    if (res.success) window.open(res.url, "_blank");
    else toast.error(res.error);
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-[#3744C8]" />
            Factures
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Commission et abonnement font deux documents distincts, par commerce et par mois.
          </p>
        </div>

        <select
          value={periode}
          onChange={(e) => router.push(`/kshare-crm/factures?periode=${e.target.value}`)}
          className="px-4 py-2 rounded-xl border border-[#e2e5f0] bg-white text-sm font-medium text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
        >
          {periodes.map((p) => (
            <option key={p.valeur} value={p.valeur}>
              {p.libelle.charAt(0).toUpperCase() + p.libelle.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Avant l'ouverture, aucun document ne prend de numéro. Le dire ici
          plutôt que de laisser le bouton échouer : une émission refusée sans
          explication ressemble à une panne. */}
      {!plateformeLancee && (
        <div className="mb-5 rounded-2xl border border-[#3744C8]/25 bg-[#f7f8ff] p-4 flex gap-3">
          <Lock className="h-5 w-5 text-[#3744C8] shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-gray-900">
              Plateforme non lancée : aucune émission possible.
            </p>
            <p className="mt-1">
              Vous pouvez préparer et vérifier les brouillons — ils ne consomment aucun numéro.
              L&apos;émission et l&apos;envoi automatique du 1er reprendront après l&apos;ouverture
              officielle.
            </p>
          </div>
        </div>
      )}

      {/* L'identité de l'émetteur conditionne la régularité des factures :
          on le dit avant que l'utilisateur clique sur « Émettre ». */}
      {emetteurIncomplet.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Émission bloquée : identité de l&apos;émetteur incomplète.</p>
            <p className="mt-1">
              Une entreprise individuelle doit faire figurer son nom suivi de la mention
              « Entrepreneur individuel », son adresse et son SIRET. Manque encore :{" "}
              {emetteurIncomplet.join(", ")}. À renseigner en variables d&apos;environnement Vercel.
            </p>
          </div>
        </div>
      )}

      {/* Une commande encaissée sans date de capture n'appartient à aucun mois :
          elle ne serait pas facturée en retard, elle ne le serait jamais. */}
      {commandesOrphelines > 0 && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <p className="font-semibold">
              {commandesOrphelines} commande{commandesOrphelines > 1 ? "s" : ""} encaissée
              {commandesOrphelines > 1 ? "s" : ""} sans date de capture.
            </p>
            <p className="mt-1">
              Leur commission n&apos;apparaîtra dans aucune période et ne sera donc jamais
              facturée. À rattraper en base avant d&apos;émettre.
            </p>
          </div>
        </div>
      )}

      {/* Un signalement suspend la capture : la commission n'est pas encore
          acquise, elle ne se facture donc pas ce mois-ci. Le dire évite de
          chercher l'écart entre le chiffre d'affaires et la facturation. */}
      {enAttente.commandes > 0 && (
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
          <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">
              {enAttente.commandes} commande{enAttente.commandes > 1 ? "s" : ""} en attente de
              décision — {euros(enAttente.commission)} de commission non facturable.
            </p>
            <p className="mt-1">
              Un signalement client suspend la capture. Ces commandes seront facturées le mois
              où vous trancherez, pas le mois de la vente.
            </p>
          </div>
        </div>
      )}

      {/* Chiffres de la période */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Ventes encaissées", valeur: euros(totalVentes) },
          { label: "Commission", valeur: euros(totalCommission), fort: true },
          {
            label: "Commission non appliquée",
            valeur: euros(totalRemises),
            rouge: totalRemises < 0,
          },
          { label: "Abonnements Pro", valeur: euros(totalAbonnements) },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-[#e2e5f0] p-4">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div
              className={`text-xl font-bold mt-1 ${
                c.rouge ? "text-red-600" : c.fort ? "text-[#3744C8]" : "text-gray-900"
              }`}
            >
              {c.valeur}
            </div>
          </div>
        ))}
      </div>

      {/* Barre d'action */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {sansFacture > 0 ? (
            <>
              <span className="font-semibold text-gray-900">{sansFacture}</span> document
              {sansFacture > 1 ? "s" : ""} à préparer sur cette période
            </>
          ) : (
            "Tous les brouillons de la période sont créés."
          )}
        </div>

        <button
          onClick={() => agir("preparer", () => preparerFactures(periode))}
          disabled={isPending || sansFacture === 0}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
        >
          {enCours === "preparer" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Préparer les brouillons
        </button>
      </div>

      {/* Commissions */}
      <Section
        titre="Commissions"
        icone={<Receipt className="h-4 w-4" />}
        vide="Aucune commission encaissée sur cette période."
        nombre={commissions.length}
      >
        {commissions.map((r) => (
          <LigneCommission
            key={r.commerceId}
            recap={r}
            enCours={enCours}
            bloque={emetteurIncomplet.length > 0 || !plateformeLancee}
            onAgir={agir}
            onTelecharger={telecharger}
          />
        ))}
      </Section>

      {/* Abonnements */}
      <Section
        titre="Abonnements Pro"
        icone={<CreditCard className="h-4 w-4" />}
        vide="Aucun abonnement Pro en cours sur cette période."
        nombre={abonnements.length}
      >
        {abonnements.map((a) => (
          <LigneAbonnement
            key={a.commerceId}
            recap={a}
            enCours={enCours}
            bloque={emetteurIncomplet.length > 0 || !plateformeLancee}
            onAgir={agir}
            onTelecharger={telecharger}
          />
        ))}
      </Section>

      <p className="text-xs text-gray-400 mt-6 text-center">
        {emetteurNom} — factures conservées {conservationAnnees} ans. Une facture émise
        s&apos;annule, elle ne se supprime pas.
      </p>
    </div>
  );
}

function Section({
  titre,
  icone,
  vide,
  nombre,
  children,
}: {
  titre: string;
  icone: React.ReactNode;
  vide: string;
  nombre: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[#3744C8]">{icone}</span>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{titre}</h2>
        <span className="text-xs text-gray-400">({nombre})</span>
      </div>
      {nombre === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-8 text-center">
          <Archive className="h-6 w-6 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">{vide}</p>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

/** Actions communes aux deux séries, une fois la facture au bon statut. */
function ActionsFacture({
  facture,
  enCours,
  bloque,
  onAgir,
  onTelecharger,
  onDemanderAnnulation,
}: {
  facture: FactureExistante;
  enCours: string | null;
  bloque: boolean;
  onAgir: Agir;
  onTelecharger: (id: string) => void;
  onDemanderAnnulation: () => void;
}) {
  if (facture.status === "draft") {
    return (
      <>
        <Bouton
          titre="Recalculer"
          icone={<RefreshCw className="h-4 w-4" />}
          charge={enCours === `recalc-${facture.id}`}
          onClick={() => onAgir(`recalc-${facture.id}`, () => recalculerBrouillon(facture.id))}
        />
        <Bouton
          titre="Supprimer le brouillon"
          icone={<Trash2 className="h-4 w-4" />}
          charge={enCours === `suppr-${facture.id}`}
          onClick={() => onAgir(`suppr-${facture.id}`, () => supprimerBrouillon(facture.id))}
        />
        <button
          onClick={() => onAgir(`emettre-${facture.id}`, () => emettreFacture(facture.id))}
          disabled={bloque || enCours === `emettre-${facture.id}`}
          className="px-3 py-1.5 rounded-lg bg-[#3744C8] text-white text-xs font-semibold hover:bg-[#2d38a8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5"
        >
          {enCours === `emettre-${facture.id}` ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Émettre
        </button>
      </>
    );
  }

  if (facture.status === "issued") {
    return (
      <>
        <Bouton
          titre="Télécharger le PDF"
          icone={<Download className="h-4 w-4" />}
          onClick={() => onTelecharger(facture.id)}
        />
        <Bouton
          titre="Régénérer le PDF"
          icone={<RefreshCw className="h-4 w-4" />}
          charge={enCours === `pdf-${facture.id}`}
          onClick={() => onAgir(`pdf-${facture.id}`, () => regenererPdf(facture.id))}
        />
        <Bouton
          titre="Envoyer au commerce"
          icone={<Send className="h-4 w-4" />}
          charge={enCours === `envoi-${facture.id}`}
          onClick={() => onAgir(`envoi-${facture.id}`, () => envoyerFacture(facture.id))}
        />
        <Bouton
          titre="Annuler la facture"
          icone={<Ban className="h-4 w-4" />}
          onClick={onDemanderAnnulation}
        />
      </>
    );
  }

  return null;
}

function Entete({
  nom,
  facture,
  ecart,
}: {
  nom: string;
  facture: FactureExistante | null;
  ecart: boolean;
}) {
  const statut = facture ? STATUT_FACTURE[facture.status] : null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-semibold text-gray-900">{nom}</span>
      {statut && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statut.cls}`}>
          {statut.label}
        </span>
      )}
      {facture?.number && (
        <span className="text-xs font-mono text-gray-400">{facture.number}</span>
      )}
      {facture?.sent_at && (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3 w-3" /> envoyée
        </span>
      )}
      {ecart && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          Montant à recalculer
        </span>
      )}
    </div>
  );
}

function BlocAnnulation({
  facture,
  enCours,
  onAgir,
  onFerme,
}: {
  facture: FactureExistante;
  enCours: string | null;
  onAgir: Agir;
  onFerme: () => void;
}) {
  const [motif, setMotif] = useState("");
  return (
    <div className="mt-3 pt-3 border-t border-[#f0f1f5] flex flex-wrap items-center gap-2">
      <input
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder="Motif de l'annulation (obligatoire)"
        className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
      />
      <button
        onClick={() =>
          onAgir(`annul-${facture.id}`, async () => {
            const res = await annulerFacture(facture.id, motif);
            if (res.success) onFerme();
            return res;
          })
        }
        disabled={!motif.trim() || enCours === `annul-${facture.id}`}
        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {enCours === `annul-${facture.id}` ? "…" : "Annuler la facture"}
      </button>
      <span className="text-xs text-gray-400">
        Le numéro reste consommé, et les commandes redeviennent facturables.
      </span>
    </div>
  );
}

function LigneCommission({
  recap,
  enCours,
  bloque,
  onAgir,
  onTelecharger,
}: {
  recap: RecapCommission;
  enCours: string | null;
  bloque: boolean;
  onAgir: Agir;
  onTelecharger: (id: string) => void;
}) {
  const [annulationOuverte, setAnnulationOuverte] = useState(false);
  const [detailOuvert, setDetailOuvert] = useState(false);
  const facture = recap.facture;

  // Le brouillon a été calculé à un instant donné ; les commandes ont pu bouger
  // depuis. L'écart se voit, et se corrige d'un clic.
  const ecart =
    facture?.status === "draft" && Math.abs(Number(facture.amount_ttc) - recap.total) >= 0.01;

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex-1 min-w-[200px]">
          <Entete nom={recap.nom} facture={facture} ecart={ecart} />
          <div className="text-xs text-gray-500 mt-1">
            {recap.paniers} panier{recap.paniers > 1 ? "s" : ""} · {euros(recap.ventes)} de ventes ·
            commission {recap.tauxCommission.toFixed(2).replace(".", ",")} %
            {recap.paniersRembourses > 0 && (
              <span className="text-red-600">
                {" "}
                · {recap.paniersRembourses} remboursée{recap.paniersRembourses > 1 ? "s" : ""}
              </span>
            )}
            {recap.rembPeriode !== 0 && (
              <span className="text-red-600">
                {" "}
                · {euros(recap.rembPeriode)} sur {euros(recap.rembPeriodeBase)} remboursés dans
                la période ({recap.rembPeriodeCommandes} commande
                {recap.rembPeriodeCommandes > 1 ? "s" : ""})
              </span>
            )}
            {recap.remise !== 0 && (
              <span className="text-red-600">
                {" "}
                · {euros(recap.remise)} sur {euros(recap.remiseBase)} remboursés après facture
                ({recap.remiseCommandes} commande
                {recap.remiseCommandes > 1 ? "s" : ""} de périodes antérieures)
              </span>
            )}
            {recap.reprise !== 0 && (
              <span>
                {" "}
                · reprise {euros(recap.reprise)} sur {recap.repriseCommandes} commande
                {recap.repriseCommandes > 1 ? "s" : ""} non facturée
                {recap.repriseCommandes > 1 ? "s" : ""}
              </span>
            )}
            {!recap.siret && <span className="text-amber-700"> · SIRET manquant</span>}
          </div>
        </div>

        <div className="text-right">
          <div
            className={`text-lg font-bold ${recap.total < 0 ? "text-red-600" : "text-[#3744C8]"}`}
          >
            {euros(recap.total)}
          </div>
          <div className="text-xs text-gray-400">à facturer</div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {recap.commandes.length > 0 && (
            <Bouton
              titre="Voir le détail des commandes"
              icone={
                detailOuvert ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )
              }
              onClick={() => setDetailOuvert((v) => !v)}
            />
          )}
          {facture && (
            <ActionsFacture
              facture={facture}
              enCours={enCours}
              bloque={bloque}
              onAgir={onAgir}
              onTelecharger={onTelecharger}
              onDemanderAnnulation={() => setAnnulationOuverte((v) => !v)}
            />
          )}
        </div>
      </div>

      {detailOuvert && (
        <div className="mt-3 pt-3 border-t border-[#f0f1f5]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="font-medium pb-1">Commande</th>
                <th className="font-medium pb-1">Date</th>
                <th className="font-medium pb-1 text-center">Montant initial</th>
                <th className="font-medium pb-1 text-center">Vente</th>
                <th className="font-medium pb-1 text-center">Taux</th>
                <th className="font-medium pb-1 text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {recap.commandes.map((c) => {
                // Dès qu'un remboursement est en jeu, toute la ligne passe au
                // rouge : on parcourt ce tableau en diagonale, et une couleur
                // sur le seul montant se laisse manquer.
                const touchee = c.rembourse > 0 || c.commission < 0;
                return (
                  <tr
                    key={c.reference + c.date}
                    className={`border-t border-[#f7f8fc] ${touchee ? "text-red-600" : ""}`}
                  >
                    <td className={`py-1 font-mono ${touchee ? "" : "text-gray-700"}`}>
                      {c.reference}
                      {c.regularisation && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700">
                          régul.
                        </span>
                      )}
                    </td>
                    <td className={`py-1 ${touchee ? "" : "text-gray-500"}`}>
                      {new Date(c.date).toLocaleDateString("fr-FR")}
                      {c.remboursementIntegral ? (
                        <span className="ml-2">remboursée intégralement</span>
                      ) : c.rembourse > 0 ? (
                        <span className="ml-2">
                          remboursée partiellement ({euros(c.rembourse)})
                        </span>
                      ) : null}
                    </td>
                    <td className={`py-1 text-center ${touchee ? "" : "text-gray-600"}`}>
                      {euros(c.montantInitial)}
                    </td>
                    <td className={`py-1 text-center ${touchee ? "" : "text-gray-600"}`}>
                      {euros(c.vente)}
                    </td>
                    <td className={`py-1 text-center ${touchee ? "" : "text-gray-500"}`}>
                      {/* Le taux vaut pour la commande, pas pour ce qu'il en
                          reste : il s'affiche même intégralement remboursée. */}
                      {c.tauxApplique !== null
                        ? `${c.tauxApplique.toFixed(2).replace(".", ",")} %`
                        : "—"}
                    </td>
                    <td
                      className={`py-1 text-right font-medium ${touchee ? "" : "text-gray-800"}`}
                    >
                      {euros(c.commission)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {annulationOuverte && facture && (
        <BlocAnnulation
          facture={facture}
          enCours={enCours}
          onAgir={onAgir}
          onFerme={() => setAnnulationOuverte(false)}
        />
      )}
    </div>
  );
}

function LigneAbonnement({
  recap,
  enCours,
  bloque,
  onAgir,
  onTelecharger,
}: {
  recap: RecapAbonnement;
  enCours: string | null;
  bloque: boolean;
  onAgir: Agir;
  onTelecharger: (id: string) => void;
}) {
  const [annulationOuverte, setAnnulationOuverte] = useState(false);
  const facture = recap.facture;
  const ecart =
    facture?.status === "draft" && Math.abs(Number(facture.amount_ttc) - recap.montant) >= 0.01;

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5f0] p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex-1 min-w-[200px]">
          <Entete nom={recap.nom} facture={facture} ecart={ecart} />
          <div className="text-xs text-gray-500 mt-1">
            Abonnement Pro · prélevé par SEPA
            {!recap.siret && <span className="text-amber-700"> · SIRET manquant</span>}
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-[#3744C8]">{euros(recap.montant)}</div>
          <div className="text-xs text-gray-400">à facturer</div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {facture && (
            <ActionsFacture
              facture={facture}
              enCours={enCours}
              bloque={bloque}
              onAgir={onAgir}
              onTelecharger={onTelecharger}
              onDemanderAnnulation={() => setAnnulationOuverte((v) => !v)}
            />
          )}
        </div>
      </div>

      {annulationOuverte && facture && (
        <BlocAnnulation
          facture={facture}
          enCours={enCours}
          onAgir={onAgir}
          onFerme={() => setAnnulationOuverte(false)}
        />
      )}
    </div>
  );
}

function Bouton({
  titre,
  icone,
  onClick,
  charge,
}: {
  titre: string;
  icone: React.ReactNode;
  onClick: () => void;
  charge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={titre}
      aria-label={titre}
      disabled={charge}
      className="p-2 rounded-lg border border-[#e2e5f0] text-gray-500 hover:text-[#3744C8] hover:border-[#3744C8]/40 hover:bg-[#f7f8ff] transition-colors disabled:opacity-40 cursor-pointer"
    >
      {charge ? <Loader2 className="h-4 w-4 animate-spin" /> : icone}
    </button>
  );
}
