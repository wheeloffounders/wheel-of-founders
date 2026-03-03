/**
 * Client utilities for AI API calls.
 * Fetches signed headers when request signing is enabled.
 */

const SIGNED_HEADERS_CACHE_MS = 4 * 60 * 1000 // 4 min (signature valid 5 min)
let cachedHeaders: { headers: Record<string, string>; expiresAt: number } | null = null

/**
 * Fetch signed headers for AI requests.
 * Caches for 4 minutes. Returns empty object when signing is disabled.
 */
export async function getSignedHeaders(accessToken?: string): Promise<Record<string, string>> {
  const res = await fetch('/api/auth/request-signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    credentials: 'include',
  })

  if (!res.ok) return {}

  const data = (await res.json()) as { timestamp?: number; signature?: string }
  if (!data.timestamp || !data.signature) return {}

  const headers: Record<string, string> = {
    'X-Timestamp': String(data.timestamp),
    'X-Signature': data.signature,
  }

  cachedHeaders = {
    headers,
    expiresAt: Date.now() + SIGNED_HEADERS_CACHE_MS,
  }

  return headers
}

/**
 * Get cached signed headers if still valid. Otherwise fetch fresh.
 */
export async function getSignedHeadersCached(accessToken?: string): Promise<Record<string, string>> {
  if (cachedHeaders && Date.now() < cachedHeaders.expiresAt) {
    return cachedHeaders.headers
  }
  return getSignedHeaders(accessToken)
}
