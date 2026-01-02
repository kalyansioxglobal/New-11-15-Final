-- Supabase Storage Bucket Setup for Feedback Files
-- Run this SQL in your Supabase SQL Editor to create the bucket with proper configuration

-- Create storage bucket for feedback files
-- This bucket will store feedback attachments (PDF, images, videos, documents) with a 10MB size limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'FeedbackFiles',
  'FeedbackFiles',
  false, -- Private bucket (requires authentication)
  10485760, -- 10MB in bytes
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]::text[];

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads FeedbackFiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads FeedbackFiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes FeedbackFiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role all FeedbackFiles" ON storage.objects;

-- Create RLS policies for the bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads FeedbackFiles"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'FeedbackFiles'
);

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads FeedbackFiles"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'FeedbackFiles'
);

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes FeedbackFiles"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'FeedbackFiles'
);

-- Allow service role full access (for server-side operations)
CREATE POLICY "Allow service role all FeedbackFiles"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'FeedbackFiles')
WITH CHECK (bucket_id = 'FeedbackFiles');

