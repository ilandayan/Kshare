import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://k-share.fr";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/notre-mission",
          "/je-suis-client",
          "/contact",
          "/cgu",
          "/faq",
          "/confidentialite",
        ],
        disallow: [
          "/shop/",
          "/asso/",
          "/client/",
          "/kshare-admin/",
          "/api/",
          "/connexion",
          "/inscription-commercant",
          "/inscription-association",
          "/mot-de-passe-oublie",
          "/reinitialiser-mot-de-passe",
          "/definir-mot-de-passe",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
