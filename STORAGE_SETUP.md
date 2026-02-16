# Supabase Storage Setup for Exports

This guide explains how to configure Supabase Storage for the data export feature.

## Overview

- **Bucket**: `exports` (private)
- **Path structure**: `{user_id}/{export_id}/{filename}`
- **Retention**: 30 days (tracked in `data_exports.expires_at`)
- **File types**: JSON, CSV, PDF

## Step 1: Run the Migration

Execute `018_create_exports_storage_bucket.sql` in Supabase SQL Editor:

```sql
-- Create the exports bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for user access
CREATE POLICY "Users can read own exports"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Service role manages exports"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'exports')
WITH CHECK (bucket_id = 'exports');
```

## Step 2: Create Bucket via Dashboard (Alternative)

If the migration fails or you prefer the UI:

1. Go to **Supabase Dashboard** → **Storage**
2. Click **New bucket**
3. Name: `exports`
4. Public: **Off** (private)
5. File size limit: 50MB (optional)
6. Allowed MIME types: `application/json`, `text/csv`, `application/pdf` (optional)

Then add the RLS policies above via SQL Editor.

## Step 3: Environment Variable

Add to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find it:** Supabase Dashboard → Settings → API → `service_role` (secret)

**Important:** Never expose the service role key to the client. It bypasses RLS.

## Step 4: Verify Setup

1. Run an export from Settings → Data Export
2. Check Storage → `exports` bucket for the new file
3. Verify the download URL works

## How It Works

### Export Flow

1. User requests export → API generates JSON data
2. If `SUPABASE_SERVICE_ROLE_KEY` is set:
   - Upload to `exports/{user_id}/{export_id}/{filename}`
   - Create signed URL (1 hour expiry)
   - Save `file_url` in `data_exports` table
3. If not set: Fall back to inline JSON download (no storage)

### Download Flow

- **Immediate**: Response includes `downloadUrl` (signed URL)
- **Later**: `GET /api/export/[exportId]/download` generates a new signed URL

### Expiration

- `data_exports.expires_at` = created_at + 30 days
- Implement a cron job or Supabase Edge Function to delete expired files
- Or use Supabase Storage lifecycle rules if available

## File Path Structure

```
exports/
  {user_id}/
    {export_id}/
      wheel-of-founders-export-full_history-2026-02-01-143022.json
```

## Troubleshooting

### "Storage not configured"
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Restart the dev server after adding env vars

### "Failed to generate download URL"
- Verify bucket exists and is named `exports`
- Check RLS policies allow service role access
- Ensure file was uploaded successfully

### Upload fails silently
- Check Supabase Dashboard → Storage → Logs
- Verify service role key is correct
- Ensure bucket allows the file type

## Cleanup (Optional)

To delete expired exports from storage, create a scheduled job:

```typescript
// Example: Delete files where data_exports.expires_at < now
const { data: expired } = await supabaseAdmin
  .from('data_exports')
  .select('id, user_id, file_name')
  .lt('expires_at', new Date().toISOString())

for (const exp of expired || []) {
  await supabaseAdmin.storage
    .from('exports')
    .remove([`${exp.user_id}/${exp.id}/${exp.file_name}`])
}
```

## Files

- `supabase/migrations/018_create_exports_storage_bucket.sql` - Bucket + policies
- `lib/supabase-admin.ts` - Service role client
- `app/api/export/route.ts` - Upload on export
- `app/api/export/[exportId]/download/route.ts` - Signed URL for existing exports
