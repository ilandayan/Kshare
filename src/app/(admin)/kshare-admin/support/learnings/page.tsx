import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LearningsList from "./_learnings-list";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  question_generale: "Question générale",
  probleme_commande: "Problème commande",
  inscription_commerce: "Inscription commerce",
  inscription_association: "Inscription association",
  bug_technique: "Bug technique",
  partenariat: "Partenariat",
  autre: "Autre",
};

const LANG_FLAGS: Record<string, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  he: "🇮🇱",
  es: "🇪🇸",
};

export default async function LearningsPage() {
  const supabase = await createClient();

  const { data: learnings } = await supabase
    .from("support_ai_learnings")
    .select("*")
    .order("usage_count", { ascending: false });

  const total = learnings?.length ?? 0;
  const active = learnings?.filter((l) => l.active).length ?? 0;
  const totalUsage = learnings?.reduce((s, l) => s + (l.usage_count ?? 0), 0) ?? 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/kshare-admin/support"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux tickets
        </Link>
        <h1 className="text-2xl font-bold text-foreground">🧠 Apprentissages de Kira</h1>
        <p className="text-muted-foreground mt-1">
          Base de connaissances apprise depuis vos résolutions. Kira consulte ces cas pour améliorer ses réponses.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-3xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Actifs</div>
            <div className="text-3xl font-bold text-emerald-600">{active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Utilisations cumulées</div>
            <div className="text-3xl font-bold text-blue-600">{totalUsage}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste des apprentissages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!learnings?.length ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm mb-2">Aucun apprentissage pour le moment.</p>
              <p className="text-xs">
                Depuis un ticket, utilisez le bouton <Badge variant="secondary" className="mx-1">🧠 Enseigner à Kira</Badge>
                pour ajouter des cas validés ici.
              </p>
            </div>
          ) : (
            <LearningsList
              learnings={learnings.map((l) => ({
                id: l.id,
                category: l.category,
                categoryLabel: CATEGORY_LABELS[l.category] ?? l.category,
                language: l.language,
                languageFlag: LANG_FLAGS[l.language] ?? l.language,
                userQuestion: l.user_question,
                adminResponse: l.admin_response,
                tags: l.tags ?? [],
                active: l.active,
                usageCount: l.usage_count ?? 0,
                createdAt: l.created_at,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
