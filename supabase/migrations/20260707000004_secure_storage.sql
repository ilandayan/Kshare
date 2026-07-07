-- Sécurité Storage : contraintes de dossier sur les buckets
-- registration-documents : uploads faits exclusivement en service_role
--   (createAdminClient) -> on interdit toute écriture client directe.
-- commerce-images : upload par le commerce authentifié -> on contraint le dossier
--   à un commerce que possède l'utilisateur (chemin = {commerce_id}/cover.ext).

-- ── registration-documents : écriture service_role uniquement ──
DROP POLICY IF EXISTS "Users can upload own registration docs" ON storage.objects;

-- Lecture : admin (déjà couvert) OU propriétaire du dossier.
-- Chemins : commerces/{id}/... , associations/{id}/... , contracts/{id}/...
-- => l'identifiant est le 2e segment (foldername[2]).
DROP POLICY IF EXISTS "Users can read own registration docs" ON storage.objects;
CREATE POLICY "Users can read own registration docs" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'registration-documents'
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
      OR (storage.foldername(name))[2] IN (
        SELECT c.id::text FROM public.commerces c WHERE c.profile_id = auth.uid()
        UNION
        SELECT a.id::text FROM public.associations a WHERE a.profile_id = auth.uid()
      )
    )
  );

-- ── commerce-images : upload/update/delete contraints au dossier du commerce ──
DROP POLICY IF EXISTS "Commerce owners can upload their images" ON storage.objects;
CREATE POLICY "Commerce owners can upload their images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'commerce-images'
    AND (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.commerces c WHERE c.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Commerce owners can update their images" ON storage.objects;
CREATE POLICY "Commerce owners can update their images" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'commerce-images'
    AND (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.commerces c WHERE c.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'commerce-images'
    AND (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.commerces c WHERE c.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Commerce owners can delete their images" ON storage.objects;
CREATE POLICY "Commerce owners can delete their images" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'commerce-images'
    AND (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.commerces c WHERE c.profile_id = auth.uid()
    )
  );
