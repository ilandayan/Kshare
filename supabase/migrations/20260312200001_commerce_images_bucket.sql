-- Create a public storage bucket for commerce cover images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'commerce-images',
  'commerce-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the commerce-images bucket

-- Anyone can view images (bucket is public)
CREATE POLICY "Public read access for commerce images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'commerce-images');

-- Commerce owners can upload their own images
CREATE POLICY "Commerce owners can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'commerce-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.commerces
      WHERE user_id = auth.uid()
    )
  );

-- Commerce owners can update their own images
CREATE POLICY "Commerce owners can update images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'commerce-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.commerces
      WHERE user_id = auth.uid()
    )
  );

-- Commerce owners can delete their own images
CREATE POLICY "Commerce owners can delete images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'commerce-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.commerces
      WHERE user_id = auth.uid()
    )
  );
