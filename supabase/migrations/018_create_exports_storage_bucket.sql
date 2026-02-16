-- Wheel of Founders: Create Exports Storage Bucket
-- Run this in Supabase SQL Editor or via Supabase CLI
--
-- Also adds INSERT/UPDATE policy for data_exports (users create/update their own records)
--
-- Creates a private bucket for user data exports with 30-day retention.
-- Files are stored at: {user_id}/{export_id}/{filename}
--
-- Alternative: Create bucket via Supabase Dashboard > Storage > New bucket
-- Name: exports, Public: false, File size limit: 50MB

-- Create the exports bucket (private - no public access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can read their own exports only
-- Path format: {user_id}/{export_id}/{filename}
CREATE POLICY "Users can read own exports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow service role to manage all exports (for API uploads)
CREATE POLICY "Service role manages exports"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'exports')
WITH CHECK (bucket_id = 'exports');

-- Allow authenticated users to insert/update their own export records
CREATE POLICY "Users can insert own exports" ON data_exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exports" ON data_exports
  FOR UPDATE USING (auth.uid() = user_id);
