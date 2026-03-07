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
  const publicPrefixes = [
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
    "/api/stripe/webhook",
  ];

  const isPublicRoute = publicPrefixes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

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

    const role = profile?.role;

    // Shop routes — commerce uniquement
    if (pathname.startsWith("/shop") && role !== "commerce") {
      return NextResponse.redirect(new URL("/connexion?role=commerce", request.url));
    }

    // Asso routes — association uniquement
    if (pathname.startsWith("/asso") && role !== "association") {
      return NextResponse.redirect(new URL("/connexion?role=association", request.url));
    }

    // Admin routes — admin uniquement
    if (pathname.startsWith("/kshare-admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Utilisateur connecté sur /connexion → rediriger vers son espace
    if (pathname === "/connexion" && role) {
      const redirectMap: Record<string, string> = {
        commerce:    "/shop/dashboard",
        association: "/asso/paniers-dons",
        admin:       "/kshare-admin",
        client:      "/",
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
