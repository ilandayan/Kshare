"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateContractPdf } from "@/lib/pdf/generate-contract-pdf";
import { sendEmailWithAttachment, emailContratSigne } from "@/lib/resend";

export async function signerContrat(): Promise<{ success: boolean; error?: string }> {
  try {
    // ── 1. Authentifier l'utilisateur ──
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Non authentifié." };
    }

    // ── 2. Récupérer le commerce ──
    const { data: commerce } = await supabase
      .from("commerces")
      .select("id, name, email, address, city, postal_code, contract_signed_at")
      .eq("profile_id", user.id)
      .single();

    if (!commerce) {
      return { success: false, error: "Commerce introuvable." };
    }

    // Double signature guard
    if (commerce.contract_signed_at) {
      return { success: true }; // Déjà signé
    }

    // ── 3. Récupérer le profil (nom du signataire) ──
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const signerName = profile?.full_name ?? commerce.name;
    const signerEmail = profile?.email ?? commerce.email;

    // ── 4. Capturer les métadonnées ──
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const signerIp = forwardedFor?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
    const userAgent = headersList.get("user-agent") ?? "unknown";
    const signedAt = new Date().toISOString();

    // ── 5. Générer le PDF ──
    const pdfBuffer = generateContractPdf({
      commerceName: commerce.name,
      commerceAddress: commerce.address ?? "",
      commerceCity: commerce.city ?? "",
      commercePostalCode: commerce.postal_code ?? "",
      signerName,
      signerEmail,
      signedAt,
      signerIp,
    });

    // ── 6. Upload le PDF dans Supabase Storage ──
    const admin = createAdminClient();
    const storagePath = `contracts/${commerce.id}/contrat-partenariat.pdf`;

    const { error: uploadError } = await admin.storage
      .from("registration-documents")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[contrat] Upload error:", uploadError);
      // On continue quand même — l'enregistrement en DB est plus important
    }

    // ── 7. Mettre à jour la table commerces ──
    const { error: updateError } = await admin
      .from("commerces")
      .update({
        contract_signed_at: signedAt,
        contract_ip: signerIp,
        contract_user_agent: userAgent,
        contract_pdf_url: uploadError ? null : storagePath,
      })
      .eq("id", commerce.id)
      .is("contract_signed_at", null); // Guard: only update if not already signed

    if (updateError) {
      console.error("[contrat] Update error:", updateError);
      return { success: false, error: "Erreur lors de l'enregistrement de la signature." };
    }

    // ── 8. Envoyer l'email avec le PDF ──
    const { subject, html } = emailContratSigne(commerce.name);
    await sendEmailWithAttachment({
      to: signerEmail,
      subject,
      html,
      attachments: [
        {
          filename: `contrat-kshare-${commerce.name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return { success: true };
  } catch (err) {
    console.error("[contrat] Unexpected error:", err);
    return { success: false, error: "Une erreur inattendue est survenue." };
  }
}
