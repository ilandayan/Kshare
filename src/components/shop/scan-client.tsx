"use client";

import React, { useState, useRef, useEffect, useCallback, Component, type ReactNode } from "react";
import { ScanLine, Search, XCircle, Package, Clock, User, Hash, Loader2, Info, Camera, Keyboard, CheckCircle2 } from "lucide-react";
import { rechercherParCode, validerPresenceClient, type ScanResult } from "@/app/(shop)/shop/scan/_actions";

/* ── Error Boundary ── */
class QrErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/* ── Constants ── */
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  paid:             { label: "Payé",            color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  ready_for_pickup: { label: "Prêt à retirer",  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  picked_up:        { label: "Retiré",          color: "text-gray-500",   bg: "bg-gray-50 border-gray-200" },
  no_show:          { label: "Non venu",        color: "text-red-700",    bg: "bg-red-50 border-red-200" },
};

const BASKET_LABELS: Record<string, { label: string; color: string }> = {
  bassari: { label: "Bassari", color: "text-red-600" },
  halavi:  { label: "Halavi",  color: "text-blue-600" },
  parve:   { label: "Parvé",   color: "text-green-600" },
  shabbat: { label: "Shabbat", color: "text-amber-600" },
  mix:     { label: "Mix",     color: "text-purple-600" },
};

type OrderData = Extract<ScanResult, { success: true }>["order"];
type InputMode = "code" | "qr";

/* ── QR Scanner ── */
function QrScanner({ onScan, onSwitchToCode }: { onScan: (code: string) => void; onSwitchToCode: () => void }) {
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null);
  const [started, setStarted] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const hasFiredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled || !scannerRef.current) return;

        const Html5Qrcode = mod.Html5Qrcode;
        const scannerId = "qr-reader-" + Date.now();
        scannerRef.current.id = scannerId;

        const scanner = new Html5Qrcode(scannerId);
        html5QrRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (!hasFiredRef.current) {
              hasFiredRef.current = true;
              onScan(decodedText);
            }
          },
          () => {}
        );
        if (!cancelled) setStarted(true);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Impossible d'accéder à la caméra";
          setCameraError(msg);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      try {
        if (html5QrRef.current) {
          html5QrRef.current.stop().catch(() => {});
          try { html5QrRef.current.clear(); } catch { /* ignore */ }
          html5QrRef.current = null;
        }
      } catch {
        // Cleanup errors are non-fatal
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cameraError) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Camera className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Caméra non disponible</p>
            <p className="text-xs text-amber-600 mt-1">
              Vérifiez que votre navigateur a accès à la caméra ou utilisez la saisie manuelle du code.
            </p>
          </div>
        </div>
        <button
          onClick={onSwitchToCode}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1e2a78] to-[#4f6df5] text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Keyboard className="w-4 h-4" />
          Saisir le code manuellement
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scannerRef}
        className="rounded-xl overflow-hidden bg-black"
        style={{ minHeight: 300 }}
      />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 rounded-xl">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}

/* ── Camera Fallback (shown when QR crashes) ── */
function CameraFallback({ onSwitchToCode }: { onSwitchToCode: () => void }) {
  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Camera className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Scanner non disponible</p>
          <p className="text-xs text-amber-600 mt-1">
            Utilisez la saisie manuelle du code de retrait.
          </p>
        </div>
      </div>
      <button
        onClick={onSwitchToCode}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1e2a78] to-[#4f6df5] text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <Keyboard className="w-4 h-4" />
        Saisir le code manuellement
      </button>
    </div>
  );
}

/* ── Main Component ── */
export function ScanClient() {
  const [mode, setMode] = useState<InputMode>("qr");
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchingRef = useRef(false);

  useEffect(() => {
    if (mode === "code") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [mode]);

  const doSearch = useCallback((token: string) => {
    if (!token.trim() || searchingRef.current) return;
    searchingRef.current = true;
    setIsSearching(true);
    setError("");
    setOrder(null);

    rechercherParCode(token.trim())
      .then((result) => {
        searchingRef.current = false;
        setIsSearching(false);
        if (result.success) {
          setOrder(result.order);
        } else {
          setError(result.error);
        }
      })
      .catch((err) => {
        searchingRef.current = false;
        setIsSearching(false);
        console.error("[scan-client] Server action error:", err);
        setError("Erreur de connexion. Veuillez réessayer.");
      });
  }, []);

  function handleSearch() {
    doSearch(code);
  }

  function handleQrScan(scannedCode: string) {
    setCode(scannedCode);
    doSearch(scannedCode);
  }

  function handleValidatePresence() {
    if (!order) return;
    setIsConfirming(true);
    validerPresenceClient(order.id)
      .then((result) => {
        setIsConfirming(false);
        if (result.success) {
          setConfirmed(true);
          setOrder({ ...order, status: "ready_for_pickup" });
        } else {
          setError(result.error);
        }
      })
      .catch(() => {
        setIsConfirming(false);
        setError("Erreur lors de la validation. Veuillez réessayer.");
      });
  }

  function switchMode(newMode: InputMode) {
    setMode(newMode);
    setError("");
    setIsSearching(false);
    searchingRef.current = false;
    setCode("");
  }

  function handleReset() {
    setCode("");
    setOrder(null);
    setError("");
    setConfirmed(false);
    setIsSearching(false);
    searchingRef.current = false;
    if (mode === "code") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  const statusInfo = order ? STATUS_LABELS[order.status] ?? { label: order.status, color: "text-gray-500", bg: "bg-gray-50 border-gray-200" } : null;
  const basketInfo = order ? BASKET_LABELS[order.basketType] ?? { label: order.basketType, color: "text-gray-600" } : null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* ── Mode tabs ── */}
      {!order && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {/* Tab selector */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => switchMode("qr")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "qr"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Camera className="w-4 h-4" />
              Scanner QR
            </button>
            <button
              onClick={() => switchMode("code")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "code"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Code retrait
            </button>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e2a78] to-[#4f6df5] flex items-center justify-center">
              {mode === "qr" ? (
                <ScanLine className="w-5 h-5 text-white" />
              ) : (
                <Keyboard className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {mode === "qr" ? "Scanner le QR code" : "Code de retrait"}
              </h2>
              <p className="text-xs text-gray-400">
                {mode === "qr"
                  ? "Scannez le QR code affiché par le client"
                  : "Saisissez le code affiché par le client"}
              </p>
            </div>
          </div>

          {/* QR mode */}
          {mode === "qr" && !isSearching && (
            <QrErrorBoundary
              fallback={<CameraFallback onSwitchToCode={() => switchMode("code")} />}
            >
              <QrScanner
                onScan={handleQrScan}
                onSwitchToCode={() => switchMode("code")}
              />
            </QrErrorBoundary>
          )}

          {/* QR searching state */}
          {mode === "qr" && isSearching && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-[#2d4de0] animate-spin" />
              <p className="text-sm text-gray-500">Recherche de la commande…</p>
            </div>
          )}

          {/* Code mode */}
          {mode === "code" && (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ex : 847291"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#2d4de0]/30 focus:border-[#2d4de0] placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-sans"
                disabled={isSearching}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !code.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#1e2a78] to-[#4f6df5] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
              >
                {isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Order details ── */}
      {order && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Commande</p>
              <p className="text-base font-bold text-gray-900">{order.orderNumber}</p>
            </div>
            {statusInfo && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Client</span>
              <span className="ml-auto text-sm font-medium text-gray-900">{order.clientName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Panier</span>
              <span className={`ml-auto text-sm font-semibold ${basketInfo?.color}`}>
                {basketInfo?.label} x{order.quantity}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Total</span>
              <span className="ml-auto text-sm font-bold text-gray-900">
                {order.isDonation ? "Don" : `${order.totalAmount.toFixed(2)} €`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Créneau</span>
              <span className="ml-auto text-sm text-gray-900">{order.pickupStart} – {order.pickupEnd}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-100 space-y-3">
            {confirmed ? (
              <>
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Présence validée !</p>
                    <p className="text-xs text-green-600 mt-0.5">Le client peut maintenant confirmer le retrait depuis son application.</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1e2a78] to-[#4f6df5] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Nouveau scan
                </button>
              </>
            ) : order.status === "paid" ? (
              <>
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Vérifiez l&apos;identité du client puis validez sa présence. Le client confirmera le retrait depuis son application.
                  </p>
                </div>
                <button
                  onClick={handleValidatePresence}
                  disabled={isConfirming}
                  className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isConfirming ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  Valider la présence du client
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </>
            ) : order.status === "ready_for_pickup" ? (
              <>
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Commande prête au retrait. En attente de la confirmation du client depuis son application.
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1e2a78] to-[#4f6df5] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Nouveau scan
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    {order.status === "picked_up"
                      ? "Ce panier a déjà été retiré."
                      : "Cette commande ne peut pas être confirmée dans son état actuel."}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1e2a78] to-[#4f6df5] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Nouveau scan
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
