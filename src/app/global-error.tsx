"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F4F5F9",
            padding: "24px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "48px",
              textAlign: "center",
              maxWidth: "420px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #e2e5f0",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "#FEE2E2",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "28px",
              }}
            >
              !
            </div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#111827",
                marginBottom: "8px",
              }}
            >
              Une erreur est survenue
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#6B7280",
                marginBottom: "24px",
                lineHeight: 1.5,
              }}
            >
              Impossible de charger cette page. Veuillez réessayer.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={reset}
                style={{
                  padding: "10px 20px",
                  background: "#3744C8",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Réessayer
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                style={{
                  padding: "10px 20px",
                  background: "white",
                  color: "#374151",
                  border: "1px solid #e2e5f0",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Accueil
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
