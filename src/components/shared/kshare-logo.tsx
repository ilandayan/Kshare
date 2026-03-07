interface KshareLogoProps {
  size?: number;
  variant?: "default" | "white";
  showText?: boolean;
}

export function KshareLogo({ size = 36, variant = "default", showText = true }: KshareLogoProps) {
  const textColor = variant === "white" ? "text-white" : "text-gray-900";

  return (
    <div className="flex items-center gap-2.5">
      {/* Icon — K inside a gradient square */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="kshare-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3744C8" />
            <stop offset="100%" stopColor="#5B6EF5" />
          </linearGradient>
        </defs>
        {/* Background rounded square */}
        <rect width="36" height="36" rx="10" fill="url(#kshare-grad)" />
        {/* Subtle inner highlight */}
        <rect x="0" y="0" width="36" height="18" rx="10" fill="white" fillOpacity="0.06" />
        {/* K letterform */}
        <path
          d="M11 9.5V26.5M11 18L21.5 9.5M11 18L22 26.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Text — "share" only (the K is in the icon) */}
      {showText && (
        <span className={`font-bold text-xl leading-none tracking-tight ${textColor}`}>
          share
        </span>
      )}
    </div>
  );
}
