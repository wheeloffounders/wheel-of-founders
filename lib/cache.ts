// Simple in-memory cache for server-side usage.
// Note: In serverless environments this is per-process and not cross-region.

type CacheEntry<T = unknown> = {
  value: T
  expiry: number
}

const cache = new Map<string, CacheEntry>()

export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const entry = cache.get(key)
  if (!entry) return null

  if (entry.expiry < Date.now()) {
    cache.delete(key)
    return null
  }

  return entry.value as T
}

export async function setCache<T = unknown>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const expiry = Date.now() + ttlSeconds * 1000
  cache.set(key, { value, expiry })
}

