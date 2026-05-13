"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Rocket, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveLaunchDate, lancerPlateforme, envoyerEmailsLancement } from "./_actions";

type Phase = "j7" | "j1" | "j0";
type Audience = "commerces" | "clients";

const PHASE_LABELS: Record<Phase, string> = {
  j7: "J-7 (une semaine avant)",
  j1: "J-1 (la veille)",
  j0: "J0 (jour du lancement)",
};

interface ConfirmDialogProps {
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  triggerClass?: string;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm";
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
}

function ConfirmDialog({
  triggerLabel,
  triggerIcon,
  triggerClass,
  variant,
  size,
  title,
  description,
  actionLabel,
  onConfirm,
  disabled,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={`gap-2 ${triggerClass ?? ""}`} disabled={disabled}>
          {triggerIcon}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={async () => {
              setOpen(false);
              await onConfirm();
            }}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  launched: boolean;
  launchDate: string;
  commercesCount: number;
  clientsCount: number;
}

export default function LaunchControls({ launched, launchDate, commercesCount, clientsCount }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(launchDate);
  const [savingDate, setSavingDate] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  async function onSaveDate() {
    if (!date) return;
    setSavingDate(true);
    const r = await saveLaunchDate(date);
    setSavingDate(false);
    if (r.success) {
      toast.success("Date de lancement enregistrée.");
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  async function onLaunch() {
    setLaunching(true);
    const r = await lancerPlateforme();
    setLaunching(false);
    if (r.success) {
      toast.success("🚀 Plateforme ouverte !");
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  async function onSendEmails(audience: Audience, phase: Phase) {
    const key = `${audience}-${phase}`;
    setSending(key);
    const r = await envoyerEmailsLancement(audience, phase);
    setSending(null);
    if (r.success) {
      toast.success(`${r.sent ?? 0} email(s) envoyé(s).`);
    } else {
      toast.error(r.error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Date de lancement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date de lancement officielle
          </CardTitle>
          <CardDescription>
            Personnalise les emails ET déclenche automatiquement l'ouverture de la publication
            à <strong>7h00 heure de Paris</strong> ce jour-là.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label htmlFor="launchDate">Date</Label>
              <Input
                id="launchDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button onClick={onSaveDate} disabled={savingDate || !date}>
              {savingDate && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bouton de lancement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Ouverture de la publication
          </CardTitle>
          <CardDescription>
            Tant que la plateforme n'est pas ouverte, seuls les comptes de démo (@kshare.fr) peuvent publier.
            Le déclenchement se fait <strong>automatiquement à 7h heure de Paris</strong> à la date enregistrée.
            Le bouton ci-dessous permet de forcer un lancement manuel anticipé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {launched ? (
            <p className="text-emerald-600 text-sm font-medium">
              ✅ Publication ouverte à tous les commerces validés.
            </p>
          ) : (
            <ConfirmDialog
              triggerLabel={launching ? "Lancement..." : "Forcer le lancement maintenant"}
              triggerIcon={launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              triggerClass="bg-emerald-600 hover:bg-emerald-700"
              title="Confirmer le lancement immédiat ?"
              description={`Cette action ouvre la publication de paniers à tous les ${commercesCount} commerces validés MAINTENANT, sans attendre la date prévue. Pense à envoyer l'email J0 séparément.`}
              actionLabel="Lancer 🚀"
              onConfirm={onLaunch}
              disabled={launching}
            />
          )}
        </CardContent>
      </Card>

      {/* Campagne email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Campagne email de lancement
          </CardTitle>
          <CardDescription>
            Envoi manuel à chaque phase. Les comptes @kshare.fr (démo) sont exclus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(["commerces", "clients"] as Audience[]).map((aud) => (
            <div key={aud}>
              <h4 className="text-sm font-semibold mb-2">
                {aud === "commerces" ? `Commerces validés (${commercesCount})` : `Clients inscrits (${clientsCount})`}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["j7", "j1", "j0"] as Phase[]).map((phase) => {
                  const key = `${aud}-${phase}`;
                  const isSending = sending === key;
                  const count = aud === "commerces" ? commercesCount : clientsCount;
                  return (
                    <ConfirmDialog
                      key={phase}
                      variant="outline"
                      size="sm"
                      triggerLabel={PHASE_LABELS[phase]}
                      triggerIcon={isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      title={`Envoyer l'email ${phase.toUpperCase()} aux ${aud} ?`}
                      description={`${count} destinataire(s). Cette action envoie immédiatement les emails via Resend.`}
                      actionLabel="Envoyer"
                      onConfirm={() => onSendEmails(aud, phase)}
                      disabled={isSending || !launchDate}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          {!launchDate && (
            <p className="text-xs text-amber-600">
              ⚠ Définis d'abord la date de lancement (utilisée dans les emails).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
