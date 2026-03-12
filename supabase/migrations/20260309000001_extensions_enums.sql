-- ============================================================
-- Kshare — Migration 001 : Extensions & Enums
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ── Enums ───────────────────────────────────────────────────

-- Rôles utilisateurs
CREATE TYPE public.user_role AS ENUM (
  'client',
  'commerce',
  'association',
  'admin'
);

-- Statuts commerce / association
CREATE TYPE public.commerce_status AS ENUM (
  'pending',
  'validated',
  'refused',
  'complement_required'
);

CREATE TYPE public.association_status AS ENUM (
  'pending',
  'validated',
  'refused',
  'complement_required'
);

-- Types de paniers casher
CREATE TYPE public.basket_type AS ENUM (
  'bassari',   -- 🥩 Viande
  'halavi',    -- 🧀 Laitier
  'parve',     -- 🌿 Neutre
  'shabbat',   -- 🍷 Shabbat
  'mix'        -- ➕ Mélange
);

-- Jour de disponibilité
CREATE TYPE public.basket_day AS ENUM (
  'today',
  'tomorrow'
);

-- Statuts panier
CREATE TYPE public.basket_status AS ENUM (
  'draft',
  'published',
  'sold_out',
  'expired',
  'disabled'
);

-- Statuts commande
CREATE TYPE public.order_status AS ENUM (
  'created',
  'paid',
  'ready_for_pickup',
  'picked_up',
  'no_show',
  'refunded',
  'cancelled_admin'
);

-- Statuts abonnement
CREATE TYPE public.subscription_status AS ENUM (
  'active',
  'offered',
  'unpaid',
  'cancellation_requested'
);

-- Statuts ticket support
CREATE TYPE public.ticket_status AS ENUM (
  'open',
  'in_progress',
  'resolved'
);
