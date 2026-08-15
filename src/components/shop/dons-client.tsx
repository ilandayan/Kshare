"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Users } from "lucide-react";
import { choisirAssociation, signalerAssociation } from "@/app/(shop)/shop/dons/_actions";

interface AssociationPublique {
  id: string;
  name: string;
  city: string | null;
}

interface Demande {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

const LIBELLE_STATUT: Record<string, string> = {
  new: "Transmise",
  contacted: "Contactée par Kshare",
  registered: "Inscrite sur Kshare",
  rejected: "Non retenue",
};

interface Props {
  associations: AssociationPublique[];
  associationChoisie: string | null;
  demandes: Demande[];
}

export function DonsClient({ associations, associationChoisie, demandes }: Props) {
  const [choix, setChoix] = useState<string | null>(associationChoisie);
  const [enregistrement, demarrerEnregistrement] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [envoi, demarrerEnvoi] = useTransition();
  const [nouvelle, setNouvelle] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
  });

  function enregistrerChoix(valeur: string | null) {
    setChoix(valeur);
    setMessage(null);
    setErreur(null);
    demarrerEnregistrement(async () => {
      const r = await choisirAssociation(valeur);
      if (r.success) {
        setMessage("Choix enregistré.");
      } else {
        setErreur(r.error);
        setChoix(associationChoisie);
      }
    });
  }

  function envoyerDemande(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setErreur(null);
    demarrerEnvoi(async () => {
      const r = await signalerAssociation(nouvelle);
      if (r.success) {
        setMessage("Demande transmise. Nous prenons contact avec elle.");
        setNouvelle({ name: "", contactName: "", email: "", phone: "", address: "" });
        setFormulaireOuvert(false);
      } else {
        setErreur(r.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Association bénéficiaire ───────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#e2e5f0] p-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-[#3744C8]" />
          <h2 className="font-semibold text-foreground">Association bénéficiaire</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Vous pouvez laisser vos dons ouverts à toutes les associations proches,
          ou en privilégier une. Le panier lui est alors réservé{" "}
          <strong className="font-semibold text-foreground">pendant deux heures</strong>,
          puis proposé aux autres — pour qu&apos;il ne soit jamais perdu si elle
          ne peut pas venir.
        </p>

        <div className="space-y-2">
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
              choix === null
                ? "border-[#3744C8] bg-[#3744C8]/5"
                : "border-[#e2e5f0] hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="association"
              className="mt-0.5 accent-[#3744C8]"
              checked={choix === null}
              onChange={() => enregistrerChoix(null)}
              disabled={enregistrement}
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Toutes les associations proches
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Le panier part à la première qui le réserve, dans un rayon de 50 km.
              </span>
            </span>
          </label>

          {associations.map((a) => (
            <label
              key={a.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                choix === a.id
                  ? "border-[#3744C8] bg-[#3744C8]/5"
                  : "border-[#e2e5f0] hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="association"
                className="mt-0.5 accent-[#3744C8]"
                checked={choix === a.id}
                onChange={() => enregistrerChoix(a.id)}
                disabled={enregistrement}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{a.name}</span>
                {a.city && (
                  <span className="block text-xs text-muted-foreground mt-0.5">{a.city}</span>
                )}
              </span>
            </label>
          ))}

          {associations.length === 0 && (
            <p className="text-sm text-muted-foreground px-1 py-2">
              Aucune association n&apos;est encore inscrite. Signalez-nous celle
              que vous connaissez, nous prendrons contact avec elle.
            </p>
          )}
        </div>

        {enregistrement && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Enregistrement…
          </p>
        )}
        {message && !enregistrement && (
          <p className="mt-4 flex items-center gap-2 text-sm text-green-700">
            <Check className="h-3.5 w-3.5" />
            {message}
          </p>
        )}
        {erreur && <p className="mt-4 text-sm text-red-600">{erreur}</p>}
      </section>

      {/* ── Signaler une association ───────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#e2e5f0] p-6">
        <h2 className="font-semibold text-foreground mb-1">
          L&apos;association que vous cherchez n&apos;est pas dans la liste ?
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Donnez-nous son nom, nous nous chargeons de la contacter. Le reste est
          facultatif : si vous ne connaissez que le nom, cela nous suffit.
        </p>

        {!formulaireOuvert ? (
          <button
            type="button"
            onClick={() => setFormulaireOuvert(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#3744C8] hover:underline"
          >
            <Plus className="h-4 w-4" />
            Signaler une association
          </button>
        ) : (
          <form onSubmit={envoyerDemande} className="space-y-3">
            <div>
              <label htmlFor="asso-nom" className="block text-sm font-medium text-foreground mb-1">
                Nom de l&apos;association <span className="text-red-500">*</span>
              </label>
              <input
                id="asso-nom"
                required
                value={nouvelle.name}
                onChange={(e) => setNouvelle({ ...nouvelle, name: e.target.value })}
                className="w-full rounded-xl border border-[#e2e5f0] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="asso-contact" className="block text-sm font-medium text-foreground mb-1">
                  Nom du contact
                </label>
                <input
                  id="asso-contact"
                  value={nouvelle.contactName}
                  onChange={(e) => setNouvelle({ ...nouvelle, contactName: e.target.value })}
                  className="w-full rounded-xl border border-[#e2e5f0] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
                />
              </div>
              <div>
                <label htmlFor="asso-tel" className="block text-sm font-medium text-foreground mb-1">
                  Téléphone
                </label>
                <input
                  id="asso-tel"
                  type="tel"
                  value={nouvelle.phone}
                  onChange={(e) => setNouvelle({ ...nouvelle, phone: e.target.value })}
                  className="w-full rounded-xl border border-[#e2e5f0] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
                />
              </div>
            </div>

            <div>
              <label htmlFor="asso-email" className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <input
                id="asso-email"
                type="email"
                value={nouvelle.email}
                onChange={(e) => setNouvelle({ ...nouvelle, email: e.target.value })}
                className="w-full rounded-xl border border-[#e2e5f0] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
            </div>

            <div>
              <label htmlFor="asso-adresse" className="block text-sm font-medium text-foreground mb-1">
                Adresse
              </label>
              <input
                id="asso-adresse"
                value={nouvelle.address}
                onChange={(e) => setNouvelle({ ...nouvelle, address: e.target.value })}
                className="w-full rounded-xl border border-[#e2e5f0] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setFormulaireOuvert(false)}
                className="rounded-xl border border-[#e2e5f0] px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={envoi || !nouvelle.name.trim()}
                className="flex-1 rounded-xl bg-[#3744C8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2d38a8] disabled:opacity-50"
              >
                {envoi ? "Envoi…" : "Transmettre à Kshare"}
              </button>
            </div>
          </form>
        )}

        {demandes.length > 0 && (
          <div className="mt-6 border-t border-[#e2e5f0] pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Vos signalements
            </h3>
            <ul className="space-y-1.5">
              {demandes.map((d) => (
                <li key={d.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{d.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {LIBELLE_STATUT[d.status] ?? d.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
