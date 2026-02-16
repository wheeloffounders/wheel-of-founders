/**
 * Server-side Supabase client for API routes
 * Uses service role key to bypass RLS when needed
 */
import { createClient } from '@supabase/supabase-js'

let serverSupabase: ReturnType<typeof createClient> | null = null

export function getServerSupabase() {
  if (!serverSupabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  return serverSupabase
}
