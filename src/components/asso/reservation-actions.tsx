"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, TriangleAlert, PackageCheck } from "lucide-react";
import { confirmerCollecte, annulerReservation } from "@/app/(asso)/asso/mes-reservations/_actions";
import { toast } from "sonner";

interface ReservationActionsProps {
  orderId: string;
  status: string;
  quantity: number;
  typeName?: string;
  isClientDonation?: boolean;
}

export function ReservationActions({ orderId, status, quantity, typeName, isClientDonation }: ReservationActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirmCollecte, setShowConfirmCollecte] = useState(false);
  const [showConfirmAnnuler, setShowConfirmAnnuler] = useState(false);
  const router = useRouter();

  function handleCollecte() {
    startTransition(async () => {
      const result = await confirmerCollecte(orderId);
      if (result.success) {
        setShowConfirmCollecte(false);
        toast.success("Collecte validée avec succès !");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAnnuler() {
    startTransition(async () => {
      const result = await annulerReservation(orderId);
      if (result.success) {
        setShowConfirmAnnuler(false);
        toast.success("Réservation annulée.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          disabled={isPending}
          onClick={() => setShowConfirmCollecte(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          title="Valider la collecte"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" />
          )}
          Valider la collecte
        </button>
        {(status === "created" || (isClientDonation && status === "paid")) && (
          <button
            disabled={isPending}
            onClick={() => setShowConfirmAnnuler(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Annuler la réservation"
          >
            <XCircle className="h-3.5 w-3.5" />
            Annuler
          </button>
        )}
      </div>

      {/* Modal confirmation collecte */}
      {showConfirmCollecte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                <PackageCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Valider la collecte</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Confirmez-vous avoir récupéré{" "}
                  <span className="font-semibold text-gray-900">
                    {quantity} panier{quantity > 1 ? "s" : ""}
                    {typeName ? ` ${typeName}` : ""}
                  </span>{" "}
                  auprès du commerce ?
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
              <TriangleAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                En validant, vous confirmez que les paniers ont bien été récupérés physiquement.
                Cette action est irréversible.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmCollecte(false)}
                disabled={isPending}
                className="flex-1 border border-[#e2e5f0] text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Retour
              </button>
              <button
                onClick={handleCollecte}
                disabled={isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Confirmer la collecte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation annulation */}
      {showConfirmAnnuler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Annuler la réservation</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Êtes-vous sûr de vouloir annuler cette réservation de{" "}
                  <span className="font-semibold text-gray-900">
                    {quantity} panier{quantity > 1 ? "s" : ""}
                    {typeName ? ` ${typeName}` : ""}
                  </span>{" "}?
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {isClientDonation
                    ? "Le don sera remis à disposition des autres associations. Le client ne sera pas débité."
                    : "Les paniers seront remis à disposition des autres associations."}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmAnnuler(false)}
                disabled={isPending}
                className="flex-1 border border-[#e2e5f0] text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Conserver
              </button>
              <button
                onClick={handleAnnuler}
                disabled={isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Confirmer l&apos;annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
