-- Supabase Storage Bucket Setup for Holding Asset Documents
-- Run this SQL in your Supabase SQL Editor to create the bucket with proper configuration

-- Create storage bucket for holding asset documents
-- This bucket will store PDF documents for holding assets with a 10MB size limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'holdingAssetDocs',
  'holdingAssetDocs',
  false, -- Private bucket (requires authentication)
  10485760, -- 10MB in bytes
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf']::text[];

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads holdingAssetDocs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads holdingAssetDocs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes holdingAssetDocs" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role all holdingAssetDocs" ON storage.objects;

-- Create RLS policies for the bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads holdingAssetDocs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'holdingAssetDocs'
);

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads holdingAssetDocs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'holdingAssetDocs'
);

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes holdingAssetDocs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'holdingAssetDocs'
);

-- Allow service role full access (for server-side operations)
CREATE POLICY "Allow service role all holdingAssetDocs"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'holdingAssetDocs')
WITH CHECK (bucket_id = 'holdingAssetDocs');
