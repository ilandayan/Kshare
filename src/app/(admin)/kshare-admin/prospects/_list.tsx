"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  MapPin,
  Building,
  MessageSquare,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { updateProspectStatus, updateProspectNotes, deleteProspect } from "./_actions";

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string;
  commerceType: string;
  commerceTypeLabel: string;
  city: string;
  postalCode: string | null;
  planInterest: string | null;
  planLabel: string;
  message: string | null;
  status: string;
  statusLabel: string;
  adminNotes: string | null;
  createdAt: string;
  contactedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  demo_scheduled: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  rejected: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  no_response: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default function ProspectsList({ prospects }: { prospects: Prospect[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const openDialog = (p: Prospect) => {
    setSelected(p);
    setNotes(p.adminNotes ?? "");
    setStatus(p.status);
  };

  const handleSave = () => {
    if (!selected) return;
    startTransition(async () => {
      if (status !== selected.status) {
        await updateProspectStatus(selected.id, status as Prospect["status"] as never);
      }
      if (notes !== (selected.adminNotes ?? "")) {
        await updateProspectNotes(selected.id, notes);
      }
      toast.success("Prospect mis à jour");
      setSelected(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!confirm(`Supprimer définitivement le prospect ${selected.firstName} ${selected.lastName} ?`)) return;
    startTransition(async () => {
      await deleteProspect(selected.id);
      toast.success("Prospect supprimé");
      setSelected(null);
      router.refresh();
    });
  };

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Commerce</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Contact</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Ville</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Plan</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Reçu</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((p) => (
            <tr
              key={p.id}
              className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => openDialog(p)}
            >
              <td className="py-3 px-4">
                <div className="font-medium text-foreground">{p.companyName}</div>
                <div className="text-xs text-muted-foreground">{p.commerceTypeLabel}</div>
              </td>
              <td className="py-3 px-4">
                <div className="text-foreground">{p.firstName} {p.lastName}</div>
                <div className="text-xs text-muted-foreground">{p.email}</div>
              </td>
              <td className="py-3 px-4 text-foreground">
                {p.city}
                {p.postalCode && <span className="text-muted-foreground"> ({p.postalCode})</span>}
              </td>
              <td className="py-3 px-4 text-muted-foreground">{p.planLabel}</td>
              <td className="py-3 px-4 text-muted-foreground">
                {new Date(p.createdAt).toLocaleDateString("fr-FR")}
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? ""}`}>
                  {p.statusLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Dialog detail */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-xl font-bold">{selected.firstName} {selected.lastName}</div>
                    <div className="text-sm text-muted-foreground font-normal mt-0.5">
                      {selected.companyName} · {selected.commerceTypeLabel}
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[selected.status]}>{selected.statusLabel}</Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Infos contact */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selected.email}`} className="text-[#3744C8] hover:underline">
                      {selected.email}
                    </a>
                  </div>
                  {selected.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selected.phone}`} className="text-[#3744C8] hover:underline">
                        {selected.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {selected.city}{selected.postalCode ? ` (${selected.postalCode})` : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    Plan : <strong>{selected.planLabel}</strong>
                  </div>
                </div>

                {/* Message */}
                {selected.message && (
                  <div className="bg-muted/50 border-l-4 border-[#3744C8] rounded-lg p-4">
                    <p className="text-xs font-semibold text-[#3744C8] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> Message du prospect
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{selected.message}</p>
                  </div>
                )}

                {/* Statut */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Statut</Label>
                  <Select value={status} onValueChange={setStatus} disabled={isPending}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nouveau</SelectItem>
                      <SelectItem value="contacted">Contacté</SelectItem>
                      <SelectItem value="demo_scheduled">RDV prévu</SelectItem>
                      <SelectItem value="converted">Converti</SelectItem>
                      <SelectItem value="rejected">Refusé</SelectItem>
                      <SelectItem value="no_response">Sans réponse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Notes internes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Appelé le 12/04, demande à être rappelé la semaine prochaine..."
                    rows={3}
                    disabled={isPending}
                  />
                </div>

                {/* Dates */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Reçu le {new Date(selected.createdAt).toLocaleString("fr-FR")}</div>
                  {selected.contactedAt && (
                    <div>Contacté le {new Date(selected.contactedAt).toLocaleString("fr-FR")}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={isPending} className="flex-1">
                    Enregistrer
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`mailto:${selected.email}?subject=Kshare — Bienvenue ${selected.firstName}`}>
                      <Mail className="h-4 w-4 mr-1.5" /> Email
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
