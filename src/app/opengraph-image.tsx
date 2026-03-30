import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kshare - Paniers casher anti-gaspi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e2a78 0%, #3744C8 50%, #4f6df5 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 28,
            background: "rgba(255,255,255,0.15)",
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "white",
              lineHeight: 1,
            }}
          >
            K
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          Kshare
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          Paniers casher anti-gaspi a prix reduit
        </div>

        {/* Tags */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
          }}
        >
          {["Boucheries", "Boulangeries", "Traiteurs"].map((tag) => (
            <div
              key={tag}
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: 50,
                padding: "10px 24px",
                fontSize: 20,
                color: "rgba(255,255,255,0.9)",
                fontWeight: 500,
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
            fontWeight: 400,
          }}
        >
          k-share.fr
        </div>
      </div>
    ),
    { ...size }
  );
}
