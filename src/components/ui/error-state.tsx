"use client";

import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: "default" | "compact" | "inline";
}

export function ErrorState({
  title = "Une erreur est survenue",
  message = "Veuillez reessayer dans quelques instants.",
  onRetry,
  variant = "default",
}: ErrorStateProps) {
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
        <p className="text-sm text-red-700">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto text-xs font-medium text-red-600 hover:text-red-800 underline shrink-0"
          >
            Reessayer
          </button>
        )}
      </div>
    );
  }

  const isCompact = variant === "compact";

  return (
    <div className={`flex flex-col items-center justify-center text-center ${isCompact ? "py-8 px-4" : "py-16 px-6"}`}>
      <div className={`rounded-full bg-red-50 ${isCompact ? "p-3 mb-3" : "p-4 mb-4"}`}>
        <AlertTriangle className={`text-red-400 ${isCompact ? "w-8 h-8" : "w-10 h-10"}`} />
      </div>
      <h3 className={`font-semibold text-gray-700 ${isCompact ? "text-sm" : "text-base"}`}>
        {title}
      </h3>
      <p className={`text-gray-400 mt-1 max-w-sm ${isCompact ? "text-xs" : "text-sm"}`}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reessayer
        </button>
      )}
    </div>
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Pas de connexion"
      message="Verifiez votre connexion internet et reessayez."
      onRetry={onRetry}
      variant="default"
    />
  );
}
