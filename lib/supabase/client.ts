/**
 * Browser/client Supabase client.
 * Use in Client Components - createBrowserClient in browser (cookies for OAuth),
 * createClient on server/SSR (createBrowserClient throws in Node).
 */
import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const browserSupabase =
  typeof window !== 'undefined'
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : createClient(supabaseUrl, supabaseAnonKey)
