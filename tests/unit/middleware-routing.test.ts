import { describe, it, expect } from "vitest";

/**
 * Tests de la logique de routing du middleware.
 * On extrait la logique pure (sans Supabase/Next) pour la tester unitairement.
 */

const PUBLIC_EXACT = [
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/notre-mission",
  "/je-suis-client",
  "/contact",
  "/cgu",
  "/faq",
  "/confidentialite",
  "/connexion",
  "/inscription-commercant",
  "/inscription-association",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
  "/definir-mot-de-passe",
];

const PUBLIC_PREFIXES = [
  "/api/",
  "/notre-mission/",
  "/je-suis-client/",
  "/contact/",
  "/connexion/",
];

function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function getRedirectForRole(role: string, pathname: string): string | null {
  if (pathname.startsWith("/shop") && role !== "commerce") return "/";
  if (pathname.startsWith("/asso") && role !== "association") return "/";
  if (pathname.startsWith("/client") && role !== "client") return "/";
  if (pathname.startsWith("/kshare-admin") && role !== "admin") return "/";
  return null;
}

describe("isPublicRoute", () => {
  it("accepte la landing page", () => {
    expect(isPublicRoute("/")).toBe(true);
  });

  it("accepte les pages publiques connues", () => {
    expect(isPublicRoute("/faq")).toBe(true);
    expect(isPublicRoute("/contact")).toBe(true);
    expect(isPublicRoute("/cgu")).toBe(true);
    expect(isPublicRoute("/connexion")).toBe(true);
  });

  it("accepte robots.txt et sitemap.xml", () => {
    expect(isPublicRoute("/robots.txt")).toBe(true);
    expect(isPublicRoute("/sitemap.xml")).toBe(true);
  });

  it("accepte les sous-routes API", () => {
    expect(isPublicRoute("/api/stripe/webhook")).toBe(true);
    expect(isPublicRoute("/api/auth/callback")).toBe(true);
  });

  it("rejette les routes protégées", () => {
    expect(isPublicRoute("/shop/dashboard")).toBe(false);
    expect(isPublicRoute("/asso/dashboard")).toBe(false);
    expect(isPublicRoute("/client/paniers")).toBe(false);
    expect(isPublicRoute("/kshare-admin")).toBe(false);
  });
});

describe("getRedirectForRole", () => {
  it("laisse un commerce accéder à /shop", () => {
    expect(getRedirectForRole("commerce", "/shop/dashboard")).toBeNull();
  });

  it("redirige un client hors de /shop", () => {
    expect(getRedirectForRole("client", "/shop/dashboard")).toBe("/");
  });

  it("laisse une association accéder à /asso", () => {
    expect(getRedirectForRole("association", "/asso/dashboard")).toBeNull();
  });

  it("redirige un commerce hors de /asso", () => {
    expect(getRedirectForRole("commerce", "/asso/dashboard")).toBe("/");
  });

  it("laisse un admin accéder à /kshare-admin", () => {
    expect(getRedirectForRole("admin", "/kshare-admin")).toBeNull();
  });

  it("redirige un client hors de /kshare-admin", () => {
    expect(getRedirectForRole("client", "/kshare-admin")).toBe("/");
  });
});
