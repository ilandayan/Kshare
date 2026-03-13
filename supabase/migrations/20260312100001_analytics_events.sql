-- Analytics events table for lightweight product metrics.
-- Inserts happen via the service-role client (bypasses RLS).
-- Only admins can read rows through the API.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text        NOT NULL,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Composite index for time-range queries filtered by event type
CREATE INDEX idx_analytics_events_name_created
  ON public.analytics_events (event_name, created_at DESC);

-- Enable RLS (service-role bypasses automatically)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Admin-only read policy
CREATE POLICY "Admins can read analytics events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- No insert/update/delete policies for regular users.
-- All writes go through the service-role client which bypasses RLS.

COMMENT ON TABLE public.analytics_events IS 'Fire-and-forget product analytics events';
