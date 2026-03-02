/**
 * API route Supabase client with cookie-based session.
 * Use when you need to run queries AS the authenticated user (RLS applies).
 * For most API routes, use serverSupabase() instead (service role, bypasses RLS).
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function apiSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as object)
          })
        },
      },
    }
  )
}
