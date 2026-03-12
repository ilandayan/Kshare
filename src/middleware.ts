import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Routes publiques — toujours accessibles ──────────────────
  const publicExact = [
    "/",
    "/notre-mission",
    "/je-suis-client",
    "/contact",
    "/cgu",
    "/confidentialite",
    "/connexion",
    "/inscription-commercant",
    "/inscription-association",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
  ];

  const publicPrefixes = [
    "/api/",           // Toutes les routes API (protégées par leur propre logique)
    "/notre-mission/",
    "/je-suis-client/",
    "/contact/",
    "/connexion/",
  ];

  const isPublicRoute =
    publicExact.includes(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix));

  // Utilisateur non connecté → rediriger vers connexion si route protégée
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Rôle uniquement depuis la table profiles (jamais depuis user_metadata)
    const role = profile?.role as string | undefined;

    // Si le rôle ne peut pas être déterminé → rediriger vers connexion (sauf routes publiques)
    if (!role) {
      if (isPublicRoute) return supabaseResponse;
      const url = request.nextUrl.clone();
      url.pathname = "/connexion";
      return NextResponse.redirect(url);
    }

    // Shop routes — commerce uniquement → rediriger vers HOME (pas /connexion pour éviter les boucles)
    if (pathname.startsWith("/shop") && role !== "commerce") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Asso routes — association uniquement
    if (pathname.startsWith("/asso") && role !== "association") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Client routes — client uniquement
    if (pathname.startsWith("/client") && role !== "client") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Admin routes — admin uniquement
    if (pathname.startsWith("/kshare-admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Utilisateur connecté sur /connexion → rediriger vers son espace
    if (pathname === "/connexion") {
      const redirectMap: Record<string, string> = {
        commerce:    "/shop/dashboard",
        association: "/asso/dashboard",
        admin:       "/kshare-admin",
        client:      "/client/paniers",
      };
      return NextResponse.redirect(
        new URL(redirectMap[role] ?? "/", request.url)
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
  ],
};
