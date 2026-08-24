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

  // Note : les redirections d'alias (ex: /confidentialité → /confidentialite)
  // sont gérées dans next.config.ts (redirects()) — plus fiable que le middleware.

  // ── Routes publiques — toujours accessibles ──────────────────
  const publicExact = [
    "/",
    "/robots.txt",
    "/sitemap.xml",
    "/notre-mission",
    "/je-suis-commercant",
    "/je-suis-commercant/demande-infos",
    "/je-suis-client",
    "/contact",
    "/cgu",
    "/faq",
    "/confidentialite",
    "/suppression-compte",
    "/connexion",
    "/inscription-commercant",
    "/inscription-association",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
    "/definir-mot-de-passe",
  ];

  const publicPrefixes = [
    "/api/",           // Toutes les routes API (protégées par leur propre logique)
    "/notre-mission/",
    "/je-suis-commercant/",
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
    // Transmettre le rôle pour afficher le bon variant de connexion
    if (pathname.startsWith("/kshare-admin") || pathname.startsWith("/kshare-crm")) {
      url.searchParams.set("role", "admin");
    } else if (pathname.startsWith("/asso")) {
      url.searchParams.set("role", "association");
    }
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
      return NextResponse.redirect(new URL("/connexion?changer=1", request.url));
    }

    // Asso routes — association uniquement
    if (pathname.startsWith("/asso") && role !== "association") {
      return NextResponse.redirect(new URL("/connexion?changer=1", request.url));
    }

    // Client routes — client uniquement
    if (pathname.startsWith("/client") && role !== "client") {
      return NextResponse.redirect(new URL("/connexion?changer=1", request.url));
    }

    // Admin routes — admin uniquement.
    //
    // L'espace de gestion `/kshare-crm` est ajouté ici : il n'était protégé que
    // par la garde de son layout. Elle suffisait, mais la défense tenait à un
    // seul fichier, et une page ajoutée hors de ce layout serait passée au
    // travers.
    if (
      (pathname.startsWith("/kshare-admin") || pathname.startsWith("/kshare-crm")) &&
      role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/connexion?changer=1", request.url));
    }

    // Un utilisateur deja connecte qui demande /connexion repart vers son
    // espace : cliquer « Espace commercant » quand on est deja commercant doit
    // ouvrir son tableau de bord, pas un formulaire.
    //
    // Sauf s'il vient pour changer de compte. Sans cette porte, les deux regles
    // se refermaient l'une sur l'autre : connecte en commerce, /kshare-admin
    // renvoyait a l'accueil faute du bon role et /connexion renvoyait au
    // tableau de bord commercant — aucune sortie, sans rapport avec les
    // identifiants. Les gardes ci-dessus posent donc `changer=1` en renvoyant
    // ici, et la page propose alors de se deconnecter.
    if (pathname === "/connexion" && request.nextUrl.searchParams.get("changer") !== "1") {
      const redirectMap: Record<string, string> = {
        commerce:    "/shop/dashboard",
        association: "/asso/dashboard",
        admin:       "/kshare-admin",
        client:      "/client/paniers",
      };
      return NextResponse.redirect(new URL(redirectMap[role] ?? "/", request.url));
    }
  }

  // Ajouter le pathname dans les headers pour lecture dans les layouts
  supabaseResponse.headers.set("x-pathname", pathname);

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
  ],
};
