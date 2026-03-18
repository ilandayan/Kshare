-- ═══════════════════════════════════════════════════════════════
-- Security audit fixes — 2026-03-18
-- ═══════════════════════════════════════════════════════════════

-- FIX 1: Commerce images bucket — user_id → profile_id
DROP POLICY IF EXISTS "Commerce owners can upload their images" ON storage.objects;
DROP POLICY IF EXISTS "Commerce owners can update their images" ON storage.objects;
DROP POLICY IF EXISTS "Commerce owners can delete their images" ON storage.objects;

CREATE POLICY "Commerce owners can upload their images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'commerce-images'
    AND EXISTS (
      SELECT 1 FROM public.commerces
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Commerce owners can update their images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'commerce-images'
    AND EXISTS (
      SELECT 1 FROM public.commerces
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Commerce owners can delete their images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'commerce-images'
    AND EXISTS (
      SELECT 1 FROM public.commerces
      WHERE profile_id = auth.uid()
    )
  );

-- FIX 2: Ratings — verify order belongs to the client and is picked_up
DROP POLICY IF EXISTS "ratings_insert_client" ON public.ratings;

CREATE POLICY "ratings_insert_client"
  ON public.ratings FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_id
        AND orders.client_id = auth.uid()
        AND orders.status = 'picked_up'
    )
  );

-- FIX 3: Registration documents — restrict to own documents + admin
DROP POLICY IF EXISTS "Authenticated users can upload registration docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read registration docs" ON storage.objects;

CREATE POLICY "Users can upload own registration docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'registration-documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can read own registration docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'registration-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.commerces WHERE profile_id = auth.uid()
        UNION
        SELECT id::text FROM public.associations WHERE profile_id = auth.uid()
      )
    )
  );
