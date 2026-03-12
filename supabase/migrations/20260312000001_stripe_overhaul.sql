-- ============================================================
-- Kshare — Migration : Refonte Stripe Connect
-- Nouveaux enums, tables (ledger, payouts, disputes),
-- modifications commerces/subscriptions, RLS + triggers
-- ============================================================

-- ── 1. Nouveaux enums ─────────────────────────────────────────

CREATE TYPE public.subscription_plan AS ENUM ('starter', 'pro');

CREATE TYPE public.ledger_entry_type AS ENUM (
  'payment',
  'commission',
  'service_fee',
  'payout',
  'refund'
);

CREATE TYPE public.payout_status AS ENUM ('pending', 'paid', 'failed');

CREATE TYPE public.dispute_status AS ENUM ('open', 'won', 'lost', 'under_review');

-- ── 2. Modifications tables existantes ────────────────────────

-- commerces : ajouter subscription_plan, supprimer early adopter
ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS subscription_plan public.subscription_plan;

ALTER TABLE public.commerces
  DROP COLUMN IF EXISTS is_early_adopter;

ALTER TABLE public.commerces
  DROP COLUMN IF EXISTS early_adopter_expires_at;

-- commerces : track last plan change (1 change per year max)
ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS last_plan_change_at TIMESTAMPTZ;

-- subscriptions : ajouter plan + pending plan change
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan public.subscription_plan NOT NULL DEFAULT 'starter';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan public.subscription_plan;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_effective_at TIMESTAMPTZ;

-- ── 3. Table ledger_entries ───────────────────────────────────

CREATE TABLE public.ledger_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id     UUID NOT NULL REFERENCES public.commerces(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payout_id       UUID,  -- FK ajoutée après création table payouts
  type            public.ledger_entry_type NOT NULL,
  debit           NUMERIC(10,2) NOT NULL DEFAULT 0,
  credit          NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_after   NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'eur',
  description     TEXT,
  stripe_object_id TEXT,
  idempotency_key TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_commerce ON public.ledger_entries(commerce_id);
CREATE INDEX idx_ledger_order ON public.ledger_entries(order_id);
CREATE INDEX idx_ledger_type ON public.ledger_entries(type);
CREATE INDEX idx_ledger_created ON public.ledger_entries(commerce_id, created_at DESC);

-- ── 4. Table payouts ──────────────────────────────────────────

CREATE TABLE public.payouts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id       UUID NOT NULL REFERENCES public.commerces(id) ON DELETE CASCADE,
  stripe_payout_id  TEXT NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL,
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'eur',
  status            public.payout_status NOT NULL DEFAULT 'pending',
  arrival_date      TIMESTAMPTZ,
  period_start      TIMESTAMPTZ,
  period_end        TIMESTAMPTZ,
  failure_message   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_commerce ON public.payouts(commerce_id);
CREATE INDEX idx_payouts_stripe ON public.payouts(stripe_payout_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);

-- FK ledger_entries → payouts
ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_payout_id_fkey
  FOREIGN KEY (payout_id) REFERENCES public.payouts(id) ON DELETE SET NULL;

-- ── 5. Table disputes ─────────────────────────────────────────

CREATE TABLE public.disputes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  commerce_id       UUID NOT NULL REFERENCES public.commerces(id) ON DELETE CASCADE,
  stripe_dispute_id TEXT NOT NULL UNIQUE,
  stripe_charge_id  TEXT,
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'eur',
  reason            TEXT,
  status            public.dispute_status NOT NULL DEFAULT 'open',
  evidence_due_by   TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_commerce ON public.disputes(commerce_id);
CREATE INDEX idx_disputes_order ON public.disputes(order_id);
CREATE INDEX idx_disputes_stripe ON public.disputes(stripe_dispute_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);

-- ── 6. Triggers updated_at ────────────────────────────────────

CREATE TRIGGER trigger_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trigger_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── 7. RLS ────────────────────────────────────────────────────

-- ledger_entries
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_select_own" ON public.ledger_entries
  FOR SELECT USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "ledger_admin_all" ON public.ledger_entries
  FOR ALL USING (public.is_admin());

-- payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payouts_select_own" ON public.payouts
  FOR SELECT USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "payouts_admin_all" ON public.payouts
  FOR ALL USING (public.is_admin());

-- disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_select_own" ON public.disputes
  FOR SELECT USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "disputes_admin_all" ON public.disputes
  FOR ALL USING (public.is_admin());

-- ── 8. Commentaires ───────────────────────────────────────────

COMMENT ON TABLE public.ledger_entries IS 'Double-entry financial ledger for commerce transactions';
COMMENT ON TABLE public.payouts IS 'Stripe payout tracking per connected account';
COMMENT ON TABLE public.disputes IS 'Stripe dispute/chargeback tracking';
COMMENT ON COLUMN public.commerces.subscription_plan IS 'Plan choisi : starter (0€/18%) ou pro (29€/12%). NULL = pas encore choisi.';
COMMENT ON COLUMN public.subscriptions.plan IS 'Plan d abonnement : starter ou pro';
