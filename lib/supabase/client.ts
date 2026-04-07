/**
 * Browser/client Supabase client.
 * Use in Client Components - createBrowserClient in browser (cookies for OAuth),
 * createClient on server/SSR (createBrowserClient throws in Node).
 *
 * Sessions are **per origin** (e.g. `localhost:3000` vs `*.vercel.app`): sign in on each host you use;
 * Supabase refresh tokens are stored in cookies scoped to that origin.
 */
import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const browserSupabase =
  typeof window !== 'undefined'
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : createClient(supabaseUrl, supabaseAnonKey)
