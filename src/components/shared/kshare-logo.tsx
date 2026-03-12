import Image from "next/image";

interface KshareLogoProps {
  size?: number;
  variant?: "default" | "white";
  showText?: boolean;
}

export function KshareLogo({ size = 36, variant = "default", showText = true }: KshareLogoProps) {
  const textColor = variant === "white" ? "text-white" : "text-gray-900";

  return (
    <div className="flex items-center gap-0.5">
      {/* Logo — image officielle */}
      <Image
        src="/logo.png"
        alt="Kshare"
        width={size}
        height={size}
        className="rounded-lg"
        style={{ width: size, height: size }}
        priority
      />

      {/* Brand text — "share" (the k is in the logo) */}
      {showText && (
        <span className={`font-display font-bold text-xl leading-none tracking-tight translate-y-[4px] ${textColor}`}>
          share
        </span>
      )}
    </div>
  );
}
