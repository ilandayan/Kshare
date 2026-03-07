import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BASKET_TYPES } from "@/lib/constants";
import {
  ShoppingBag,
  MapPin,
  QrCode,
  TrendingDown,
  Users,
  Heart,
  Store,
  ArrowRight,
  CheckCircle,
  Star,
  Smartphone,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">Kshare</span>
              <Badge variant="secondary" className="text-xs">Beta</Badge>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
              <Link href="#mission" className="hover:text-foreground transition-colors">Notre mission</Link>
              <Link href="#comment-ca-marche" className="hover:text-foreground transition-colors">Comment ça marche</Link>
              <Link href="#commercants" className="hover:text-foreground transition-colors">Commerçants</Link>
              <Link href="#contact" className="hover:text-foreground transition-colors">Contact</Link>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/connexion">Se connecter</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/inscription-commercant">Je suis commerçant</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/20 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 px-4 py-1.5 text-sm font-medium bg-accent text-accent-foreground border-0">
            🌿 La nourriture casher anti-gaspillage
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Des paniers casher<br />
            <span className="text-primary">à prix réduit</span>,<br />
            livrés près de chez vous
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Kshare connecte les commerces casher avec les consommateurs pour lutter contre le gaspillage alimentaire.
            Réservez, payez, récupérez. Simple, solidaire, casher.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base px-8" asChild>
              <Link href="#telecharger">
                <Smartphone className="mr-2 h-5 w-5" />
                Télécharger l&apos;app
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <Link href="/inscription-commercant">
                <Store className="mr-2 h-5 w-5" />
                Inscrire mon commerce
              </Link>
            </Button>
          </div>
          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "15%", label: "Commission seulement" },
              { value: "0€", label: "Pour les dons" },
              { value: "30€", label: "Abonnement/mois" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BASKET CATEGORIES */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-3">5 types de paniers disponibles</h2>
            <p className="text-muted-foreground">Tous certifiés casher selon vos exigences</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {BASKET_TYPES.map((type) => (
              <Card key={type.value} className="w-40 text-center hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6 pb-4">
                  <div className="text-4xl mb-2">{type.emoji}</div>
                  <div className="font-semibold text-foreground">{type.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* NOTRE MISSION */}
      <section id="mission" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingDown,
                title: "Anti-gaspillage",
                desc: "Des millions de repas casher sont jetés chaque année. Kshare les redistribue avant qu'il ne soit trop tard.",
                color: "text-green-600",
                bg: "bg-green-50 dark:bg-green-950",
              },
              {
                icon: Users,
                title: "Accessibilité",
                desc: "L'alimentation casher peut être coûteuse. Nos paniers à prix réduit la rendent accessible à tous.",
                color: "text-blue-600",
                bg: "bg-blue-50 dark:bg-blue-950",
              },
              {
                icon: Heart,
                title: "Solidarité (Tsedaka)",
                desc: "Les clients peuvent offrir un panier en don (mitzva) qui sera récupéré par une association partenaire.",
                color: "text-rose-600",
                bg: "bg-rose-50 dark:bg-rose-950",
              },
            ].map((item) => (
              <Card key={item.title} className="border-0 shadow-sm">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="comment-ca-marche" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Comment ça marche ?</h2>
            <p className="text-muted-foreground text-lg">Simple en 3 étapes</p>
          </div>
          <div className="grid md:grid-cols-2 gap-16">
            {/* Pour les clients */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <Smartphone className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Pour les clients</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: "1", icon: MapPin, title: "Trouvez", desc: "Découvrez les commerces casher à proximité avec leurs paniers disponibles" },
                  { step: "2", icon: ShoppingBag, title: "Réservez & payez", desc: "Choisissez votre panier, sélectionnez la quantité et payez en ligne" },
                  { step: "3", icon: QrCode, title: "Récupérez", desc: "Présentez votre QR code en magasin à l'heure indiquée et récupérez votre panier" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{item.title}</div>
                      <div className="text-muted-foreground text-sm mt-1">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Pour les commerçants */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <Store className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Pour les commerçants</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: "1", icon: Store, title: "Inscrivez-vous", desc: "Créez votre compte commerçant et renseignez les informations de votre commerce" },
                  { step: "2", icon: ShoppingBag, title: "Publiez vos paniers", desc: "Créez vos paniers invendus chaque jour avec prix, quantité et horaire de retrait" },
                  { step: "3", icon: TrendingDown, title: "Récupérez vos revenus", desc: "Recevez vos paiements chaque semaine directement sur votre compte bancaire" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm shrink-0 border border-border">
                      {item.step}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{item.title}</div>
                      <div className="text-muted-foreground text-sm mt-1">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION COMMERÇANTS */}
      <section id="commercants" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-accent text-accent-foreground border-0">Offre de lancement</Badge>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Rejoignez les premiers<br />commerçants Kshare
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Valorisez vos invendus, augmentez votre chiffre d&apos;affaires et rejoignez une communauté de commerçants casher engagés.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Tableau de bord complet pour gérer vos paniers",
                  "Paiements sécurisés via Stripe",
                  "Reversement hebdomadaire sur votre compte",
                  "Reporting détaillé de vos ventes",
                  "Aucun engagement — résiliable à tout moment",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-foreground text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" asChild>
                <Link href="/inscription-commercant">
                  S&apos;inscrire maintenant <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-primary text-primary-foreground border-0">
                <CardContent className="pt-6 pb-6">
                  <div className="text-4xl font-bold mb-1">50</div>
                  <div className="text-sm opacity-80 mb-3">premiers commerçants</div>
                  <div className="text-sm font-medium">3 mois offerts + commission 10%</div>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardContent className="pt-6 pb-6">
                  <div className="text-4xl font-bold text-foreground mb-1">1 mois</div>
                  <div className="text-sm text-muted-foreground mb-3">offert à tous les autres</div>
                  <div className="text-sm font-medium text-foreground">puis 30€/mois + 15%</div>
                </CardContent>
              </Card>
              <Card className="border border-border col-span-2">
                <CardContent className="pt-4 pb-4 px-6">
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <div>
                      <div className="font-semibold text-sm text-foreground">Commission 0% sur les dons</div>
                      <div className="text-xs text-muted-foreground">Reversement intégral pour les paniers don</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* TÉLÉCHARGER L'APP */}
      <section id="telecharger" className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Téléchargez l&apos;application Kshare</h2>
          <p className="opacity-80 mb-8 max-w-lg mx-auto">
            Disponible sur App Store et Google Play. Trouvez des paniers casher près de chez vous en quelques secondes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-base">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              App Store
            </Button>
            <Button size="lg" variant="secondary" className="text-base">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76c.35.2.76.23 1.15.08L15.31 12 3.33.16C2.94.01 2.53.04 2.18.24 1.48.64 1 1.38 1 2.23v19.54c0 .85.48 1.59 1.18 1.99zm14.55-12.36l-2.91-2.91-9.4 9.4 12.31-6.49zM17.73.24L5.42 6.73l2.91 2.91 9.4-9.4zM20.82 10.7l-2.95-1.56-3.16 3.16 3.16 3.16 2.95-1.56c.84-.45 1.18-1.28 1.18-2 0-.72-.34-1.55-1.18-2z"/>
              </svg>
              Google Play
            </Button>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Une question ?</h2>
          <p className="text-muted-foreground mb-8">Notre équipe est disponible pour vous aider</p>
          <Button size="lg" variant="outline" asChild>
            <Link href="mailto:contact@k-share.fr">contact@k-share.fr</Link>
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-bold text-xl text-primary">Kshare</div>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/cgu" className="hover:text-foreground transition-colors">CGU</Link>
              <Link href="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link href="/connexion" className="hover:text-foreground transition-colors">Espace pro</Link>
            </nav>
            <div className="text-sm text-muted-foreground">© 2026 Kshare. Tous droits réservés.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
