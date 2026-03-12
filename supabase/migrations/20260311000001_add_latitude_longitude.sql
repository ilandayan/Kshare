-- Add latitude/longitude columns used by the mobile app
ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

COMMENT ON COLUMN public.commerces.latitude IS 'Latitude GPS du commerce';
COMMENT ON COLUMN public.commerces.longitude IS 'Longitude GPS du commerce';
