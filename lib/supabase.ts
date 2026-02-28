import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Browser Supabase client - uses cookies to match server-side session.
 * Required for OAuth: auth callback sets cookies, this client reads them.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
