/**
 * Supabase admin client (service role).
 * Use for server-side operations that need to bypass RLS (e.g., storage uploads).
 * Returns null if SERVICE_ROLE_KEY is not set - use for optional features like storage.
 * NEVER expose this client to the browser.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set - storage uploads will fall back to direct download')
}

export const adminSupabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null
