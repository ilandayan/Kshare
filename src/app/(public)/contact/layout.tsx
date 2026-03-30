import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez l'équipe Kshare pour toute question sur les paniers casher anti-gaspi, les partenariats commerces ou le programme solidaire.",
  openGraph: {
    title: "Contact | Kshare",
    description:
      "Contactez l'équipe Kshare pour toute question.",
    url: "https://k-share.fr/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
