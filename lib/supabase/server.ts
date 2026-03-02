/**
 * Server-side Supabase client (service role).
 * Use in API routes and Server Components for DB operations that bypass RLS.
 * NEVER import in client components.
 */
if (typeof window !== 'undefined') {
  throw new Error('lib/supabase/server.ts must only be imported on the server')
}

import '../env-validate'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Supabase not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n' +
      'For Vercel Production: Set both variables in Production environment.\n' +
      'For Vercel Preview: Set both variables in Preview environment.'
  )
}

let supabaseInstance: ReturnType<typeof createClient> | null = null

export function serverSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl as string, supabaseServiceKey as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return supabaseInstance
}
