"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FolderOpen, Upload, Download, Trash2, Loader2, FileText, Image as ImageIcon,
  Table as TableIcon, Archive,
} from "lucide-react";
import {
  televerserDocument,
  supprimerDocument,
  lienDocument,
} from "@/app/(crm)/kshare-crm/documents/_actions";
import {
  CATEGORIES_DOCUMENT,
  LIBELLES_CATEGORIE,
  type CategorieDocument,
} from "@/lib/crm/categories";

export interface DocumentRow {
  id: string;
  title: string;
  category: string;
  file_url: string | null;
  issued_on: string | null;
  notes: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

interface Props {
  documents: DocumentRow[];
  filtre: string | null;
  conservationAnnees: number;
}

function poids(octets: number | null): string {
  if (!octets) return "—";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function Icone({ mime }: { mime: string | null }) {
  if (mime?.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (mime?.includes("sheet") || mime === "text/csv") return <TableIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function DocumentsClient({ documents, filtre, conservationAnnees }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const compteurs = documents.reduce<Record<string, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + 1;
    return acc;
  }, {});

  function deposer(formData: FormData) {
    setEnCours("depot");
    startTransition(async () => {
      const res = await televerserDocument(formData);
      setEnCours(null);
      if (res.success) {
        toast.success(res.message ?? "Document ajouté.");
        formRef.current?.reset();
        setFormulaireOuvert(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function supprimer(id: string, titre: string) {
    if (!confirm(`Supprimer « ${titre} » ? Le fichier sera effacé définitivement.`)) return;
    setEnCours(id);
    startTransition(async () => {
      const res = await supprimerDocument(id);
      setEnCours(null);
      if (res.success) {
        toast.success(res.message ?? "Supprimé.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  async function telecharger(id: string) {
    const res = await lienDocument(id);
    if (res.success) window.open(res.url, "_blank");
    else toast.error(res.error);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-[#3744C8]" />
            Documents
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Les pièces de l&apos;entreprise, rangées et retrouvables.
          </p>
        </div>

        <button
          onClick={() => setFormulaireOuvert((v) => !v)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] text-white text-sm font-semibold shadow-sm hover:opacity-90 cursor-pointer inline-flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Déposer un document
        </button>
      </div>

      {formulaireOuvert && (
        <form
          ref={formRef}
          action={deposer}
          className="bg-white rounded-2xl border border-[#e2e5f0] p-5 mb-5 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Titre</span>
              <input
                name="titre"
                required
                placeholder="Attestation de vigilance URSSAF"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Catégorie</span>
              <select
                name="categorie"
                defaultValue="autre"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              >
                {CATEGORIES_DOCUMENT.map((c) => (
                  <option key={c} value={c}>
                    {LIBELLES_CATEGORIE[c as CategorieDocument]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">
                Date du document <span className="font-normal text-gray-400">(facultatif)</span>
              </span>
              <input
                type="date"
                name="emisLe"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Fichier</span>
              <input
                type="file"
                name="fichier"
                required
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.xlsx,.docx,.csv"
                className="mt-1 w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#f0f1fb] file:text-[#3744C8] file:text-sm file:font-medium cursor-pointer"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">
              Notes <span className="font-normal text-gray-400">(facultatif)</span>
            </span>
            <textarea
              name="notes"
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e2e5f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-[#3744C8] text-white text-sm font-semibold hover:bg-[#2d38a8] disabled:opacity-40 cursor-pointer inline-flex items-center gap-2"
            >
              {enCours === "depot" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Déposer
            </button>
            <span className="text-xs text-gray-400">
              PDF, image, tableur ou document texte. 20 Mo maximum.
            </span>
          </div>
        </form>
      )}

      {/* Filtres par catégorie */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Pastille
          actif={filtre === null}
          onClick={() => router.push("/kshare-crm/documents")}
        >
          Tous ({documents.length})
        </Pastille>
        {CATEGORIES_DOCUMENT.filter((c) => compteurs[c] || filtre === c).map((c) => (
          <Pastille
            key={c}
            actif={filtre === c}
            onClick={() => router.push(filtre === c ? "/kshare-crm/documents" : `/kshare-crm/documents?categorie=${c}`)}
          >
            {LIBELLES_CATEGORIE[c]} ({compteurs[c] ?? 0})
          </Pastille>
        ))}
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] p-12 text-center">
          <Archive className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {filtre
              ? "Aucun document dans cette catégorie."
              : "Aucun document déposé. Statuts, attestations, contrats fournisseurs, relevés — tout ce qu'on cherche toujours au mauvais moment."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e2e5f0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f7f8fc] text-gray-500 text-xs">
                  <th className="text-left font-semibold px-4 py-2.5">Document</th>
                  <th className="text-left font-semibold px-3 py-2.5">Catégorie</th>
                  <th className="text-left font-semibold px-3 py-2.5">Date</th>
                  <th className="text-right font-semibold px-3 py-2.5">Poids</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-t border-[#f0f1f5] hover:bg-[#fafbff]">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">
                          <Icone mime={d.mime_type} />
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900">{d.title}</div>
                          {d.notes && (
                            <div className="text-xs text-gray-500 mt-0.5">{d.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {LIBELLES_CATEGORIE[d.category as CategorieDocument] ?? d.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                      {d.issued_on
                        ? new Date(d.issued_on).toLocaleDateString("fr-FR")
                        : `déposé le ${new Date(d.created_at).toLocaleDateString("fr-FR")}`}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-500 whitespace-nowrap">
                      {poids(d.file_size)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => telecharger(d.id)}
                          title="Télécharger"
                          aria-label="Télécharger"
                          className="p-2 rounded-lg border border-[#e2e5f0] text-gray-500 hover:text-[#3744C8] hover:border-[#3744C8]/40 hover:bg-[#f7f8ff] transition-colors cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => supprimer(d.id, d.title)}
                          disabled={enCours === d.id}
                          title="Supprimer"
                          aria-label="Supprimer"
                          className="p-2 rounded-lg border border-[#e2e5f0] text-gray-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          {enCours === d.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        Stockage privé, réservé à l&apos;administration. Les pièces comptables se conservent{" "}
        {conservationAnnees} ans.
      </p>
    </div>
  );
}

function Pastille({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
        actif
          ? "bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] text-white shadow-sm"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
