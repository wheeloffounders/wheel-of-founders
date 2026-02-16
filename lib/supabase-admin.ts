import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client with service role key.
 * Use for server-side operations that need to bypass RLS (e.g., storage uploads).
 * NEVER expose this client to the browser.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set - storage uploads will fall back to direct download')
}

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null
