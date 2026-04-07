import { supabase } from '@/lib/supabase'

/**
 * Bearer from the browser session so Route Handlers see auth when HttpOnly cookies lag
 * behind `localStorage` (common right after login / tab restore).
 */
export async function getClientAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

/** Same-origin fetch with credentials + optional Bearer (see getClientAuthHeaders). */
export async function fetchWithClientAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const auth = await getClientAuthHeaders()
  const headers = new Headers(init?.headers)
  if (auth.Authorization) headers.set('Authorization', auth.Authorization)
  return fetch(input, { credentials: 'include', ...init, headers })
}

/** Shared fetch helper for SWR / client hooks: credentials + JSON + consistent errors. */
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithClientAuth(input, init)
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `Request failed (${res.status})`)
  }
  return body as T
}
