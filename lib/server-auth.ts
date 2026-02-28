/**
 * Server-side auth helper for API routes.
 * Uses createServerClient with cookies and getUser() for JWT verification.
 */
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export interface ServerSession {
  user: { id: string; email?: string }
}

/**
 * Get authenticated session from request cookies.
 * Uses getUser() for JWT verification (more reliable than getSession).
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies()
  const authClient = createServerClient(
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
  // getUser() verifies JWT (preferred); fallback to getSession() if getUser fails
  const { data: { user }, error } = await authClient.auth.getUser()
  if (user?.id) return { user: { id: user.id, email: user.email ?? undefined } }
  if (error) {
    const { data: { session } } = await authClient.auth.getSession()
    if (session?.user?.id) return { user: { id: session.user.id, email: session.user.email ?? undefined } }
  }
  return null
}

/**
 * Get session from request: tries Authorization Bearer token first (session in localStorage),
 * then falls back to cookies. Use this for API routes called from client fetch when
 * auth callback may not have set cookies.
 */
export async function getServerSessionFromRequest(req: Request): Promise<ServerSession | null> {
  const authHeader = req.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (bearerToken) {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: { user }, error } = await anonClient.auth.getUser(bearerToken)
    if (!error && user?.id) return { user: { id: user.id, email: user.email ?? undefined } }
  }

  return getServerSession()
}
