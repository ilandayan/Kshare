-- Add document columns to commerces
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS kbis_url TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- Add document columns to associations
ALTER TABLE associations ADD COLUMN IF NOT EXISTS rna_document_url TEXT;
ALTER TABLE associations ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- Create private storage bucket for registration documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('registration-documents', 'registration-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can upload their own documents
CREATE POLICY "Authenticated users can upload registration docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'registration-documents');

-- Policy: authenticated users can read registration docs
CREATE POLICY "Authenticated users can read registration docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'registration-documents');
