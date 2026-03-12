-- ============================================================
-- Audit logs table for security events
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id   text,
  ip_address  text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by action type and date
CREATE INDEX idx_audit_logs_action_created ON public.audit_logs (action, created_at DESC);
-- Index for querying by actor
CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert (used by server-side audit logger)
-- No explicit policy needed — service role bypasses RLS

-- Auto-cleanup: delete logs older than 90 days (optional cron)
COMMENT ON TABLE public.audit_logs IS 'Security audit trail. Retained for 90 days.';
