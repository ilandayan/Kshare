"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/constants";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

interface SmartDownloadButtonProps {
  /** Force une plateforme (ignore la détection auto) */
  force?: Platform;
  /** Classe CSS du bouton */
  className?: string;
  /** Contenu personnalisé (optionnel) */
  children?: React.ReactNode;
  /** Style "compact" (icône seule) ou "full" (avec texte) */
  variant?: "full" | "compact";
}

/**
 * Bouton intelligent qui détecte la plateforme de l'utilisateur (iOS / Android / autre)
 * et redirige vers le store approprié.
 *
 * - iOS Safari/Chrome → App Store
 * - Android → Google Play
 * - Desktop → ouvre une nouvelle fenêtre vers le Google Play (par défaut, plus accessible)
 */
export function SmartDownloadButton({
  force,
  className = "",
  children,
  variant = "full",
}: SmartDownloadButtonProps) {
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    setPlatform(force ?? detectPlatform());
  }, [force]);

  const url =
    platform === "ios"
      ? APP_STORE_URL
      : platform === "android"
        ? GOOGLE_PLAY_URL
        : GOOGLE_PLAY_URL; // fallback desktop

  const storeName =
    platform === "ios" ? "App Store" : platform === "android" ? "Google Play" : "App Store / Google Play";

  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ||
        "inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl px-5 py-3 transition-colors cursor-pointer text-white"
      }
    >
      {children ?? (
        <>
          {/* Icône Apple si iOS, Google Play sinon */}
          {platform === "ios" ? (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
            </svg>
          )}
          {variant === "full" && (
            <div>
              <div className="text-[0.625rem] text-gray-400 leading-none">Télécharger sur</div>
              <div className="text-sm font-semibold leading-snug">{storeName}</div>
            </div>
          )}
        </>
      )}
    </Link>
  );
}
