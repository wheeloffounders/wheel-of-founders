/**
 * Short-lived in-memory cache for admin read APIs (server process only).
 * Does not affect tracking writes — only how fast admin dashboards re-read aggregates.
 */

type CacheEntry<T> = {
  expiresAt: number
  value: T
}

const store = new Map<string, CacheEntry<unknown>>()

export const DEFAULT_ADMIN_CACHE_TTL_MS = 3 * 60 * 1000

export function adminCacheBypassRequested(searchParams: URLSearchParams): boolean {
  const refresh = searchParams.get('refresh')?.trim()
  return refresh === '1' || refresh === 'true'
}

export function getAdminCached<T>(key: string): T | null {
  const hit = store.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    store.delete(key)
    return null
  }
  return hit.value as T
}

export function setAdminCached<T>(key: string, value: T, ttlMs = DEFAULT_ADMIN_CACHE_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function invalidateAdminCachePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

/** Wrap an admin GET handler result; skip cache when `?refresh=1`. */
export async function withAdminCache<T>(
  key: string,
  searchParams: URLSearchParams,
  loader: () => Promise<T>,
  ttlMs = DEFAULT_ADMIN_CACHE_TTL_MS
): Promise<{ data: T; cached: boolean; cacheKey: string }> {
  if (adminCacheBypassRequested(searchParams)) {
    invalidateAdminCachePrefix(key.split(':')[0] ?? key)
  } else {
    const hit = getAdminCached<T>(key)
    if (hit) return { data: hit, cached: true, cacheKey: key }
  }
  const data = await loader()
  setAdminCached(key, data, ttlMs)
  return { data, cached: false, cacheKey: key }
}
