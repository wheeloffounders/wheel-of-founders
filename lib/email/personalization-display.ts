/**
 * Display-name helpers safe for client components (no server Supabase).
 * Server-only email context building lives in `personalization.ts`.
 */

export type AuthUserLike = {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
} | null

/**
 * First name for email greetings: "First Last" → First; "Last, First …" → First;
 * strips trailing comma on tokens. Empty if unparseable.
 */
export function emailGreetingFromDisplayString(raw: string | null | undefined): string {
  const t = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!t) return ''
  if (t.includes(',')) {
    const afterComma = t
      .split(',')
      .slice(1)
      .join(',')
      .trim()
    if (afterComma) {
      const first = afterComma.split(/\s+/)[0]?.replace(/[,;.:]+$/, '') ?? ''
      return first || afterComma
    }
    return t.split(',')[0]?.trim().replace(/[,;.:]+$/, '') ?? t
  }
  const firstWord = t.split(/\s+/)[0]?.replace(/[,;.:]+$/, '') ?? ''
  return firstWord || t
}

/**
 * 1. preferred_name (first name only) · 2. auth first_name / given_name · 3. profile full name → first name ·
 * 4. email local part (profile then auth) · 5. Founder
 */
export function resolveEmailDisplayName(
  profile: {
    preferred_name?: string | null
    name?: string | null
    email_address?: string | null
  } | null,
  auth?: AuthUserLike
): string {
  const fromPreferred = emailGreetingFromDisplayString(profile?.preferred_name)
  if (fromPreferred) return fromPreferred

  const meta = auth?.user_metadata
  const fn = meta?.first_name ?? meta?.given_name
  if (typeof fn === 'string' && fn.trim()) {
    const g = emailGreetingFromDisplayString(fn)
    if (g) return g
  }

  const authFull = meta?.full_name ?? meta?.name
  if (typeof authFull === 'string' && authFull.trim()) {
    const g = emailGreetingFromDisplayString(authFull)
    if (g) return g
  }

  const fromFull = emailGreetingFromDisplayString(profile?.name)
  if (fromFull) return fromFull

  const em = (profile?.email_address || auth?.email || '').trim()
  if (em.includes('@')) {
    const local = em.split('@')[0] ?? ''
    const g = emailGreetingFromDisplayString(local.replace(/[._+]/g, ' '))
    if (g) return g
    return local || 'Founder'
  }
  return 'Founder'
}
