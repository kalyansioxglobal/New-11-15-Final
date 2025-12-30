-- Supabase Storage Bucket Setup for Insurance Policy Files
-- Run this SQL in your Supabase SQL Editor to create the bucket with proper configuration

-- Drop the old 'files' bucket if it exists (optional - only if you want to migrate)
-- Note: This will delete all files in the old bucket, so be careful!
-- DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects WHERE bucket_id = 'files';
-- DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects WHERE bucket_id = 'files';
-- DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects WHERE bucket_id = 'files';
-- DELETE FROM storage.buckets WHERE id = 'files';

-- Create storage bucket for insurance policy files
-- This bucket will store policy documents (PDF, JPG, PNG) with a 5MB size limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'insurancePolicies',
  'insurancePolicies',
  false, -- Private bucket (requires authentication)
  5242880, -- 5MB in bytes
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[];

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads insurancePolicies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads insurancePolicies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes insurancePolicies" ON storage.objects;

-- Create RLS policies for the bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads insurancePolicies"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'insurancePolicies'
);

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads insurancePolicies"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'insurancePolicies'
);

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes insurancePolicies"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'insurancePolicies'
);

