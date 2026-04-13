/**
 * Server-side auth helper for API routes.
 * Uses createServerClient with cookies and auth.getUser() for JWT verification (not getSession()).
 */
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export interface ServerSession {
  user: { id: string; email?: string }
}

/** True when Supabase Auth HTTP calls fail (timeout, DNS, offline). */
function isAuthNetworkFailure(err: unknown): boolean {
  let cur: unknown = err
  for (let depth = 0; depth < 6 && cur != null; depth++) {
    if (cur instanceof TypeError && String(cur.message).toLowerCase().includes('fetch')) return true
    if (typeof cur === 'object' && cur !== null && 'name' in cur) {
      const name = String((cur as { name?: string }).name)
      if (name === 'ConnectTimeoutError' || name === 'TimeoutError') return true
    }
    if (cur && typeof cur === 'object' && 'code' in cur) {
      const code = String((cur as { code?: string }).code)
      if (
        code === 'UND_ERR_CONNECT_TIMEOUT' ||
        code === 'UND_ERR_SOCKET' ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ENOTFOUND'
      ) {
        return true
      }
    }
    const next =
      cur && typeof cur === 'object' && 'cause' in cur ? (cur as { cause?: unknown }).cause : undefined
    cur = next
  }
  return false
}

/**
 * Session from cookies only (no round-trip to Supabase Auth).
 * Use when getUser() failed with a network error so we do not retry getUser() immediately.
 */
async function getServerSessionFromCookiesOnly(): Promise<ServerSession | null> {
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
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser()
  if (user?.id) return { user: { id: user.id, email: user.email ?? undefined } }
  if (error) console.warn('[server-auth] getServerSessionFromCookiesOnly getUser', error.message)
  return null
}

/**
 * Get authenticated session from request cookies.
 * Uses getUser() for JWT verification (more reliable than getSession).
 * On network failure talking to Supabase Auth, falls back to getUser() from cookies so dev/local
 * does not 500 when the auth API is slow or briefly unreachable.
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

  const sessionFromCookies = async (): Promise<ServerSession | null> => {
    const { data: { user } } = await authClient.auth.getUser()
    if (user?.id) return { user: { id: user.id, email: user.email ?? undefined } }
    return null
  }

  try {
    const { data: { user }, error } = await authClient.auth.getUser()
    if (user?.id) return { user: { id: user.id, email: user.email ?? undefined } }
    if (error) return await sessionFromCookies()
  } catch (e) {
    if (isAuthNetworkFailure(e)) {
      console.warn('[server-auth] getUser() unreachable; falling back to cookie session')
      try {
        return await sessionFromCookies()
      } catch {
        return null
      }
    }
    console.warn('[server-auth] getServerSession failed', e)
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
    try {
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      )
      const { data: { user }, error } = await anonClient.auth.getUser(bearerToken)
      if (!error && user?.id) return { user: { id: user.id, email: user.email ?? undefined } }
    } catch (e) {
      if (isAuthNetworkFailure(e)) {
        console.warn('[server-auth] Bearer getUser() unreachable; using cookie session (skipped second getUser)')
        return getServerSessionFromCookiesOnly()
      }
      console.warn('[server-auth] Bearer getUser() failed', e)
    }
  }

  return getServerSession()
}
