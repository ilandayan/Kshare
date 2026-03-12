import { type ReactNode } from "react";
import { PackageOpen, SearchX, ShoppingBag, Heart, ClipboardList } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "compact";
}

const PRESETS = {
  "no-baskets": {
    icon: <PackageOpen className="w-12 h-12 text-gray-300" />,
    title: "Aucun panier disponible",
    description: "Les commerces n'ont pas encore publie de paniers pour aujourd'hui.",
  },
  "no-results": {
    icon: <SearchX className="w-12 h-12 text-gray-300" />,
    title: "Aucun resultat",
    description: "Essayez avec d'autres criteres de recherche.",
  },
  "no-orders": {
    icon: <ClipboardList className="w-12 h-12 text-gray-300" />,
    title: "Aucune commande",
    description: "Vous n'avez pas encore passe de commande.",
  },
  "no-favorites": {
    icon: <Heart className="w-12 h-12 text-gray-300" />,
    title: "Aucun favori",
    description: "Ajoutez des commerces a vos favoris pour les retrouver facilement.",
  },
  "no-shop-baskets": {
    icon: <ShoppingBag className="w-12 h-12 text-gray-300" />,
    title: "Aucun panier cree",
    description: "Publiez votre premier panier pour commencer a vendre.",
  },
} as const;

export type EmptyStatePreset = keyof typeof PRESETS;

export function EmptyState({ icon, title, description, action, variant = "default" }: EmptyStateProps) {
  const isCompact = variant === "compact";

  return (
    <div className={`flex flex-col items-center justify-center text-center ${isCompact ? "py-8 px-4" : "py-16 px-6"}`}>
      {icon && <div className={isCompact ? "mb-3" : "mb-4"}>{icon}</div>}
      <h3 className={`font-semibold text-gray-600 ${isCompact ? "text-sm" : "text-base"}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-gray-400 mt-1 max-w-sm ${isCompact ? "text-xs" : "text-sm"}`}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Convenience wrapper using presets */
export function EmptyStatePreset({
  preset,
  action,
  variant,
}: {
  preset: EmptyStatePreset;
  action?: ReactNode;
  variant?: "default" | "compact";
}) {
  const config = PRESETS[preset];
  return <EmptyState {...config} action={action} variant={variant} />;
}
