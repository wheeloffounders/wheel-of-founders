/** Shared title normalization for strategic memory, blueprints, and similarity checks. */

export function normalizeTaskTitleKey(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Word-level Jaccard on significant tokens (length > 2). */
export function taskTitleWordJaccard(a: string, b: string): number {
  const wa = new Set(
    normalizeTaskTitleKey(a)
      .split(/\s+/)
      .filter((w) => w.length > 2)
  )
  const wb = new Set(
    normalizeTaskTitleKey(b)
      .split(/\s+/)
      .filter((w) => w.length > 2)
  )
  if (wa.size === 0 || wb.size === 0) return 0
  let inter = 0
  for (const w of wa) {
    if (wb.has(w)) inter++
  }
  const union = wa.size + wb.size - inter
  return union ? inter / union : 0
}

/** Loose match for “similar title” (memory candidates, blueprint drift). */
export function taskTitlesSimilar(a: string, b: string): boolean {
  const na = normalizeTaskTitleKey(a)
  const nb = normalizeTaskTitleKey(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.length >= 5 && nb.length >= 5 && (na.includes(nb) || nb.includes(na))) return true
  const j = taskTitleWordJaccard(a, b)
  if (j >= 0.45) return true
  const wa = new Set(na.split(' ').filter((w) => w.length > 2))
  const wb = new Set(nb.split(' ').filter((w) => w.length > 2))
  if (wa.size === 0 || wb.size === 0) return false
  let overlap = 0
  for (const w of wa) {
    if (wb.has(w)) overlap++
  }
  const min = Math.min(wa.size, wb.size)
  return overlap / min >= 0.45
}
