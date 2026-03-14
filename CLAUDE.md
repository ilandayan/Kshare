# CLAUDE.md — Kshare

## Vue d'ensemble du projet

Kshare est une marketplace digitale qui met en relation des commerces casher (boucheries, boulangeries, supermarchés, traiteurs, etc.) avec des consommateurs souhaitant acheter des paniers alimentaires casher à prix réduit. Les paniers contiennent des invendus ou des produits proches de leur date limite de consommation.

**Double objectif :**
- Réduire le gaspillage alimentaire
- Rendre l'alimentation casher plus accessible

Modèle similaire à Too Good To Go, spécialisé dans l'univers casher.

---

## Stack technique

| Technologie | Usage |
|---|---|
| **Next.js** (App Router) | Framework full-stack |
| **TypeScript** (strict) | Langage principal |
| **Supabase** | Base de données PostgreSQL + Auth + Storage |
| **Supabase Auth** | Authentification et gestion des sessions |
| **Stripe** | Paiements, commissions, abonnements |
| **Shadcn/ui** | Composants UI |
| **Tailwind CSS** | Styles |
| **Vercel** | Hébergement et déploiement |
| **GitHub** | Versionnement, Issues, PR, Projects, Actions CI |
| **Context7** | Documentation officielle via MCP |

---

## Architecture applicative

### Trois espaces distincts

**1. Application mobile (clients)**
- Expo / React Native (ou PWA Next.js selon arbitrage)
- 5 onglets : Accueil, Rechercher, Mes paniers, Favoris, Profil
- QR code de retrait en magasin

**2. Web App (commerces, associations, admin)**
- Next.js App Router
- `/` — Landing page publique
- `/shop/*` — Espace commerçant (gestion paniers, stats, profil)
- `/asso/*` — Espace association (paniers dons disponibles, réservations)
- `/admin/*` — Espace admin (URL masquée, accès restreint)

**3. Admin (URL masquée)**
- Validation des comptes
- Supervision des paniers
- Reporting global
- Support client
- Gestion financière

---

## Domaine métier

### Catégories de paniers

| Emoji | Nom | Type |
|---|---|---|
| 🥩 | Bassari | Viande |
| 🧀 | Halavi | Laitier |
| 🌿 | Parvé | Neutre |
| 🍷 | Shabbat | Spécial Shabbat |
| ➕ | Mix | Mélange |

### Rôles utilisateurs

- **client** — Achète des paniers, peut faire des dons (mitzva/tsedaka)
- **commerce** — Publie des paniers invendus, suit ses ventes
- **association** — Réserve et récupère les paniers dons
- **admin** — Supervision globale de la plateforme

### Modèle économique

- **Plan Starter** : gratuit, commission **18 %** par panier vendu
- **Plan Pro** : **29 €/mois** (SEPA), commission réduite à **12 %**
- Changement de plan possible **1 fois par an**
- Frais de service client : **1,5 % + 0,79 €** par commande
- Reversement hebdomadaire aux commerces (chaque mardi) via Stripe Connect

---

## Structure du projet

```
kshare/
├── src/
│   ├── app/                        # App Router Next.js
│   │   ├── (public)/               # Routes publiques
│   │   ├── (shop)/                 # Espace commerçant (auth requise)
│   │   ├── (asso)/                 # Espace association (auth requise)
│   │   ├── (admin)/                # Espace admin (URL masquée)
│   │   └── api/                    # Route Handlers
│   ├── components/
│   │   ├── ui/                     # Composants Shadcn
│   │   └── [feature]/              # Composants métier par feature
│   ├── lib/
│   │   ├── supabase/               # Clients Supabase (server/client/admin)
│   │   ├── stripe/                 # Helpers Stripe
│   │   └── utils/                  # Utilitaires partagés
│   ├── types/                      # Types TypeScript globaux
│   └── hooks/                      # React hooks personnalisés
├── supabase/
│   ├── migrations/                 # Migrations SQL versionnées
│   └── functions/                  # Edge Functions (webhooks Stripe, etc.)
├── public/
└── tests/
    ├── unit/
    └── e2e/
```

---

## Règles de développement

### TypeScript
- Mode strict activé (`strict: true` dans tsconfig)
- Pas de `any` implicite
- Types explicites pour toutes les fonctions publiques
- Utiliser les types générés par Supabase (`database.types.ts`)

### Architecture Next.js
- Logique applicative dans **Route Handlers** (`app/api/`) et **Server Actions**
- **Supabase Edge Functions** uniquement pour : webhooks Stripe, traitements externes, tâches isolées
- Composants Server par défaut, `'use client'` seulement si nécessaire
- Pas de logique métier dans les composants UI

### Conventions de nommage
- Fichiers/dossiers : `kebab-case`
- Composants React : `PascalCase`
- Variables/fonctions : `camelCase`
- Constantes : `UPPER_SNAKE_CASE`
- Types/interfaces : `PascalCase`

### Qualité du code
- ESLint + Prettier configurés et respectés
- Tests unitaires sur la logique critique (calcul commissions, gestion stocks, validations)
- Tests E2E sur les parcours clés (réservation panier, paiement, QR code)
- Validation des formulaires côté client ET serveur
- Gestion d'erreurs systématique avec messages utilisateur explicites

---

## Sécurité

### Supabase
- **Row Level Security (RLS) activée sur toutes les tables**
- Séparation stricte : données publiques / privées / admin
- Client Supabase côté serveur pour les opérations sensibles
- Client Supabase côté client uniquement pour les lectures publiques

### Secrets et variables d'environnement
- Aucune clé sensible exposée côté client (`NEXT_PUBLIC_` uniquement pour ce qui peut l'être)
- Secrets gérés via variables d'environnement Vercel et GitHub
- Variables requises :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server only)
  - `STRIPE_SECRET_KEY` (server only)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`

### Authentification
- Supabase Auth pour toutes les sessions
- Middleware Next.js pour protéger les routes privées
- Séparation des rôles via JWT claims custom (role: client | commerce | association | admin)

---

## Paiements (Stripe)

- Paiement client dans l'app via Stripe Checkout / Payment Intent
- Commission 15 % prélevée automatiquement (Stripe Connect)
- Reversement hebdomadaire au commerce
- Abonnement 30 €/mois via SEPA Direct Debit
- Webhooks Stripe gérés via Supabase Edge Function
- Pas de données bancaires stockées côté Kshare

---

## UX/UI

- **Mobile-first** : responsive obligatoire sur tous les écrans
- **Thème clair/sombre** : supporté via Shadcn + Tailwind CSS variables
- **Accessibilité** : ARIA labels, contraste suffisant, navigation clavier
- **Design system** : composants Shadcn comme base, extensions cohérentes
- Référence visuelle : maquettes Figma (web app + app mobile)

---

## Observabilité

- Logs structurés exploitables (pas de `console.log` en production)
- Tracking des erreurs (Sentry ou équivalent)
- Analytics produit minimales (paniers créés, réservations, taux de conversion)
- Monitoring des performances Vercel (Core Web Vitals)

---

## Workflow Git

- Branche principale : `main` (production)
- Développement : branches feature `feat/nom-feature`
- Fixes : `fix/description`
- PR obligatoire pour merger sur `main`
- GitHub Actions : lint + tests sur chaque PR
- Déploiement automatique sur Vercel à chaque merge sur `main`

---

## Commandes courantes

```bash
# Développement
npm run dev

# Build
npm run build

# Lint
npm run lint

# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e
```

---

## À ne pas faire

- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté client
- Ne jamais bypasser le RLS Supabase avec le service role key dans les composants client
- Ne jamais stocker de données de paiement brutes (numéros de carte, IBAN)
- Ne pas créer de logique métier dans les composants UI
- Ne pas désactiver TypeScript strict
- Ne pas merger sans passer les checks CI
