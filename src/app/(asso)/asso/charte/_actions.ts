"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCharterPdf } from "@/lib/pdf/generate-charter-pdf";
import { sendEmailWithAttachment, emailCharteSigne } from "@/lib/resend";

export async function signerCharte(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Non authentifié." };
    }

    const { data: asso } = await supabase
      .from("associations")
      .select("id, name, email, address, city, contact, charter_signed_at")
      .eq("profile_id", user.id)
      .single();

    if (!asso) {
      return { success: false, error: "Association introuvable." };
    }

    if (asso.charter_signed_at) {
      return { success: true };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const contactName = profile?.full_name ?? asso.contact;
    const contactEmail = profile?.email ?? asso.email;

    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const signerIp = forwardedFor?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
    const userAgent = headersList.get("user-agent") ?? "unknown";
    const signedAt = new Date().toISOString();

    const pdfBuffer = generateCharterPdf({
      assoName: asso.name,
      assoAddress: asso.address ?? "",
      assoCity: asso.city ?? "",
      contactName,
      contactEmail,
      signedAt,
      signerIp,
    });

    const admin = createAdminClient();
    const storagePath = `charters/${asso.id}/charte-engagement.pdf`;

    const { error: uploadError } = await admin.storage
      .from("registration-documents")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[charte] Upload error:", uploadError);
    }

    const { error: updateError } = await admin
      .from("associations")
      .update({
        charter_signed_at: signedAt,
        charter_ip: signerIp,
        charter_user_agent: userAgent,
        charter_pdf_url: uploadError ? null : storagePath,
      })
      .eq("id", asso.id)
      .is("charter_signed_at", null);

    if (updateError) {
      console.error("[charte] Update error:", updateError);
      return { success: false, error: "Erreur lors de l'enregistrement de la signature." };
    }

    const { subject, html } = emailCharteSigne(asso.name);
    await sendEmailWithAttachment({
      to: contactEmail,
      subject,
      html,
      attachments: [
        {
          filename: `charte-kshare-${asso.name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return { success: true };
  } catch (err) {
    console.error("[charte] Unexpected error:", err);
    return { success: false, error: "Une erreur inattendue est survenue." };
  }
}
