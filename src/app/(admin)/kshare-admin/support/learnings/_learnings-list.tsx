"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Calendar, BarChart3 } from "lucide-react";
import { deleteLearning, toggleLearningActive } from "../_actions";

interface Learning {
  id: string;
  category: string;
  categoryLabel: string;
  language: string;
  languageFlag: string;
  userQuestion: string;
  adminResponse: string;
  tags: string[];
  active: boolean;
  usageCount: number;
  createdAt: string;
}

export default function LearningsList({ learnings }: { learnings: Learning[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="divide-y">
      {learnings.map((l) => (
        <LearningRow
          key={l.id}
          learning={l}
          expanded={expandedId === l.id}
          onToggle={() => setExpandedId(expandedId === l.id ? null : l.id)}
        />
      ))}
    </div>
  );
}

function LearningRow({
  learning: l,
  expanded,
  onToggle,
}: {
  learning: Learning;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState(l.active);

  const handleToggle = (checked: boolean) => {
    setActive(checked);
    startTransition(async () => {
      await toggleLearningActive(l.id, checked);
    });
  };

  const handleDelete = () => {
    if (!confirm("Supprimer définitivement cet apprentissage ?")) return;
    startTransition(async () => {
      await deleteLearning(l.id);
    });
  };

  return (
    <div className={`p-4 ${!active ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">{l.languageFlag}</Badge>
            <Badge variant="outline" className="text-xs">{l.categoryLabel}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              {l.usageCount} utilisation{l.usageCount !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(l.createdAt).toLocaleDateString("fr-FR")}
            </span>
          </div>
          <div className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
            Q: {l.userQuestion}
          </div>
          {expanded && (
            <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
              R: {l.adminResponse}
            </div>
          )}
          {l.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {l.tags.slice(0, 8).map((tag) => (
                <span key={tag} className="text-xs px-1.5 py-0.5 bg-muted rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Switch checked={active} onCheckedChange={handleToggle} disabled={isPending} />
            <span className="text-xs text-muted-foreground">
              {active ? "Actif" : "Inactif"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
