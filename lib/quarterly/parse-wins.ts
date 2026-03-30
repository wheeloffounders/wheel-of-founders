/** Parse `evening_reviews.wins` column (JSON array or legacy string). */

export function parseWinsFromReview(val: unknown): string[] {
  if (!val) return []
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed)
        ? parsed.filter((s: unknown): s is string => typeof s === 'string' && Boolean(s.trim()))
        : parsed && typeof parsed === 'string'
          ? [parsed]
          : []
    } catch {
      return val.trim() ? [val] : []
    }
  }
  if (Array.isArray(val)) {
    return val.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
  }
  return []
}
