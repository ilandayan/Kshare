-- ============================================================
-- Kshare — Migration 002 : Tables principales
-- ============================================================

-- ── 1. profiles ─────────────────────────────────────────────
-- Créée automatiquement à chaque inscription via trigger
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  role        public.user_role NOT NULL DEFAULT 'client',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Profils utilisateurs étendus (lié à auth.users)';

-- ── 2. commerces ────────────────────────────────────────────
CREATE TABLE public.commerces (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  email                   TEXT,
  phone                   TEXT,
  address                 TEXT NOT NULL,
  city                    TEXT NOT NULL,
  postal_code             TEXT,
  commerce_type           TEXT NOT NULL DEFAULT 'Autre',
  hashgakha               TEXT NOT NULL DEFAULT 'Autre',
  description             TEXT,
  logo_url                TEXT,
  photos                  TEXT[],
  average_rating          NUMERIC(3,2),
  total_ratings           INTEGER DEFAULT 0,
  basket_types            public.basket_type[] DEFAULT '{}',
  commission_rate         NUMERIC(5,2) NOT NULL DEFAULT 15,
  status                  public.commerce_status NOT NULL DEFAULT 'pending',
  is_early_adopter        BOOLEAN NOT NULL DEFAULT FALSE,
  early_adopter_expires_at TIMESTAMPTZ,
  stripe_account_id       TEXT,
  stripe_customer_id      TEXT,
  subscription_status     public.subscription_status,
  location                GEOGRAPHY(POINT, 4326),
  opening_hours           JSONB,
  iban                    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at            TIMESTAMPTZ,
  validated_by            UUID REFERENCES public.profiles(id),

  CONSTRAINT commerces_profile_unique UNIQUE (profile_id)
);
COMMENT ON TABLE public.commerces IS 'Commerces casher partenaires';

CREATE INDEX idx_commerces_profile ON public.commerces(profile_id);
CREATE INDEX idx_commerces_status ON public.commerces(status);
CREATE INDEX idx_commerces_stripe_account ON public.commerces(stripe_account_id);
CREATE INDEX idx_commerces_stripe_customer ON public.commerces(stripe_customer_id);
CREATE INDEX idx_commerces_location ON public.commerces USING GIST(location);

-- ── 3. associations ─────────────────────────────────────────
CREATE TABLE public.associations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  contact       TEXT,
  zone_region   TEXT,
  availability  TEXT,
  status        public.association_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at  TIMESTAMPTZ,
  validated_by  UUID REFERENCES public.profiles(id),

  CONSTRAINT associations_profile_unique UNIQUE (profile_id)
);
COMMENT ON TABLE public.associations IS 'Associations partenaires pour les paniers dons';

CREATE INDEX idx_associations_profile ON public.associations(profile_id);
CREATE INDEX idx_associations_status ON public.associations(status);

-- ── 4. baskets ──────────────────────────────────────────────
CREATE TABLE public.baskets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id       UUID NOT NULL REFERENCES public.commerces(id) ON DELETE CASCADE,
  type              public.basket_type NOT NULL DEFAULT 'mix',
  day               public.basket_day NOT NULL DEFAULT 'today',
  description       TEXT,
  original_price    NUMERIC(8,2) NOT NULL,
  sold_price        NUMERIC(8,2) NOT NULL,
  quantity_total    INTEGER NOT NULL DEFAULT 1,
  quantity_sold     INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  pickup_start      TEXT NOT NULL,
  pickup_end        TEXT NOT NULL,
  is_donation       BOOLEAN NOT NULL DEFAULT FALSE,
  status            public.basket_status NOT NULL DEFAULT 'draft',
  published_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT baskets_price_check CHECK (sold_price <= original_price),
  CONSTRAINT baskets_quantity_check CHECK (quantity_sold <= quantity_total),
  CONSTRAINT baskets_pickup_check CHECK (pickup_end > pickup_start)
);
COMMENT ON TABLE public.baskets IS 'Paniers alimentaires casher proposés par les commerces';

CREATE INDEX idx_baskets_commerce ON public.baskets(commerce_id);
CREATE INDEX idx_baskets_status ON public.baskets(status);
CREATE INDEX idx_baskets_donation ON public.baskets(is_donation) WHERE is_donation = TRUE;
CREATE INDEX idx_baskets_published ON public.baskets(status, day) WHERE status = 'published';

-- ── 5. orders ───────────────────────────────────────────────
CREATE TABLE public.orders (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basket_id                 UUID REFERENCES public.baskets(id) ON DELETE SET NULL,
  client_id                 UUID NOT NULL REFERENCES public.profiles(id),
  commerce_id               UUID NOT NULL REFERENCES public.commerces(id),
  association_id            UUID REFERENCES public.associations(id),
  quantity                  INTEGER NOT NULL DEFAULT 1,
  unit_price                NUMERIC(8,2) NOT NULL DEFAULT 0,
  total_amount              NUMERIC(8,2) NOT NULL DEFAULT 0,
  commission_amount         NUMERIC(8,2) NOT NULL DEFAULT 0,
  net_amount                NUMERIC(8,2) NOT NULL DEFAULT 0,
  status                    public.order_status NOT NULL DEFAULT 'created',
  is_donation               BOOLEAN NOT NULL DEFAULT FALSE,
  notes                     TEXT,
  stripe_payment_intent_id  TEXT,
  stripe_charge_id          TEXT,
  qr_code_token             TEXT,
  qr_code                   TEXT,
  pickup_date               DATE,
  pickup_start              TEXT,
  pickup_end                TEXT,
  picked_up_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.orders IS 'Commandes et réservations de paniers';

CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_commerce ON public.orders(commerce_id);
CREATE INDEX idx_orders_basket ON public.orders(basket_id);
CREATE INDEX idx_orders_association ON public.orders(association_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_stripe_pi ON public.orders(stripe_payment_intent_id);

-- ── 6. subscriptions ────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id             UUID NOT NULL REFERENCES public.commerces(id) ON DELETE CASCADE,
  status                  public.subscription_status NOT NULL DEFAULT 'active',
  monthly_price           NUMERIC(8,2) NOT NULL DEFAULT 30,
  commission_rate         NUMERIC(5,2) NOT NULL DEFAULT 15,
  stripe_subscription_id  TEXT,
  stripe_mandate_id       TEXT,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  offer_expires_at        TIMESTAMPTZ,
  canceled_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_commerce_unique UNIQUE (commerce_id)
);
COMMENT ON TABLE public.subscriptions IS 'Abonnements mensuels des commerces (30€/mois)';

CREATE INDEX idx_subscriptions_commerce ON public.subscriptions(commerce_id);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);

-- ── 7. support_tickets ──────────────────────────────────────
CREATE TABLE public.support_tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID REFERENCES public.profiles(id),
  commerce_id   UUID REFERENCES public.commerces(id),
  order_id      UUID REFERENCES public.orders(id),
  category      TEXT NOT NULL DEFAULT 'autre',
  description   TEXT NOT NULL,
  status        public.ticket_status NOT NULL DEFAULT 'open',
  metadata      JSONB DEFAULT '{}',
  messages      JSONB DEFAULT '[]',
  photo_urls    TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES public.profiles(id)
);
COMMENT ON TABLE public.support_tickets IS 'Tickets de support client';

CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_client ON public.support_tickets(client_id);
CREATE INDEX idx_support_tickets_category ON public.support_tickets(category);

-- ── 8. ratings ──────────────────────────────────────────────
CREATE TABLE public.ratings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES public.profiles(id),
  commerce_id UUID NOT NULL REFERENCES public.commerces(id),
  score       SMALLINT NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ratings_order_unique UNIQUE (order_id)
);
COMMENT ON TABLE public.ratings IS 'Notes clients sur les commerces (1-5)';

CREATE INDEX idx_ratings_commerce ON public.ratings(commerce_id);

-- ── 9. favorites ────────────────────────────────────────────
CREATE TABLE public.favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commerce_id UUID NOT NULL REFERENCES public.commerces(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT favorites_unique UNIQUE (client_id, commerce_id)
);
COMMENT ON TABLE public.favorites IS 'Commerces favoris des clients';

CREATE INDEX idx_favorites_client ON public.favorites(client_id);

-- ── Updated_at triggers ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'profiles', 'commerces', 'associations', 'baskets',
    'orders', 'subscriptions', 'support_tickets'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trigger_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;
