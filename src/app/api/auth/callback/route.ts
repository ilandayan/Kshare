import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Auth callback handler.
 * Supabase sends users here after they click an email link (invite, recovery, magic link).
 * We exchange the code for a session and redirect to the appropriate page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const hint = searchParams.get("hint");

  // Construit l'URL /lien-expire avec hint si présent (pré-remplit le formulaire)
  const lienExpireUrl = new URL("/lien-expire", origin);
  if (hint) lienExpireUrl.searchParams.set("hint", hint);

  // Supabase peut transmettre des erreurs (lien expiré, déjà utilisé)
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const isExpired =
    errorCode === "otp_expired" ||
    errorParam === "access_denied" ||
    (errorParam && errorParam.toLowerCase().includes("expired"));

  // Le flux recovery (création/reset mot de passe) doit rediriger
  // vers /lien-expire si lien périmé, et non vers /connexion.
  const isRecoveryFlow = next.includes("/definir-mot-de-passe");

  if (code) {
    const response = NextResponse.redirect(new URL(next, origin));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }

    // Code échangeable mais session échouée : probablement déjà consommé / expiré
    if (isRecoveryFlow) {
      return NextResponse.redirect(lienExpireUrl);
    }
  }

  // Pas de code ou erreur explicite Supabase
  if (isExpired || isRecoveryFlow) {
    return NextResponse.redirect(new URL("/lien-expire", origin));
  }

  return NextResponse.redirect(new URL("/connexion?error=auth_callback", origin));
}
