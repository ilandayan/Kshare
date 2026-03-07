"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, XCircle, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { validerCompte, refuserCompte, demanderComplements } from "./_actions";

interface AccountActionsProps {
  id: string;
  type: "commerce" | "association";
  currentStatus: string;
}

export default function AccountActions({ id, type, currentStatus }: AccountActionsProps) {
  const router = useRouter();
  const [validating, setValidating] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [complementOpen, setComplementOpen] = useState(false);
  const [complementMessage, setComplementMessage] = useState("");
  const [sendingComplement, setSendingComplement] = useState(false);

  const isActive = currentStatus === "pending" || currentStatus === "complement_required";

  async function handleValidate() {
    setValidating(true);
    try {
      const result = await validerCompte(id, type);
      if (result.success) {
        toast.success(
          type === "commerce" ? "Commerce validé avec succès." : "Association validée avec succès."
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setValidating(false);
    }
  }

  async function handleRefuse() {
    setRefusing(true);
    try {
      const result = await refuserCompte(id, type);
      if (result.success) {
        toast.success("Compte refusé.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setRefusing(false);
    }
  }

  async function handleComplement() {
    setSendingComplement(true);
    try {
      const result = await demanderComplements(id, type, complementMessage);
      if (result.success) {
        toast.success("Demande de compléments envoyée.");
        setComplementOpen(false);
        setComplementMessage("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setSendingComplement(false);
    }
  }

  if (!isActive) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            Ce compte a déjà été traité (statut : <strong>{currentStatus}</strong>).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions de validation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {/* Valider */}
          <Button onClick={handleValidate} disabled={validating} className="gap-2">
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Valider
          </Button>

          {/* Refuser */}
          <Button variant="destructive" onClick={handleRefuse} disabled={refusing} className="gap-2">
            {refusing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Refuser
          </Button>

          {/* Demander des compléments */}
          <Dialog open={complementOpen} onOpenChange={setComplementOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Demander des compléments
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Demander des informations complémentaires</DialogTitle>
                <DialogDescription>
                  Ce message sera transmis au{" "}
                  {type === "commerce" ? "commerce" : "responsable de l&apos;association"} pour
                  compléter son dossier.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="complementMessage">Message</Label>
                <Textarea
                  id="complementMessage"
                  placeholder="Merci de fournir une copie de votre certificat de supervision casher..."
                  rows={5}
                  value={complementMessage}
                  onChange={(e) => setComplementMessage(e.target.value)}
                />
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setComplementOpen(false)}
                  disabled={sendingComplement}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleComplement}
                  disabled={sendingComplement || !complementMessage.trim()}
                >
                  {sendingComplement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Envoyer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
