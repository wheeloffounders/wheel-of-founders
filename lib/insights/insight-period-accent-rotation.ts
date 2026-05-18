import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

/** Pool of visually distinct left-border accents (rotated per period, not per section meaning). */
export const INSIGHT_PERIOD_ACCENT_POOL: InsightPeriodAccent[] = [
  'reflection',
  'patterns',
  'mood',
  'goal',
  'lessons',
  'progress',
  'transformation',
]

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates shuffle; same seed → same order (stable per week/month/quarter). */
export function shuffleInsightAccents(seed: string, count: number): InsightPeriodAccent[] {
  const pool = [...INSIGHT_PERIOD_ACCENT_POOL]
  const rand = mulberry32(hashSeed(seed))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return Array.from({ length: count }, (_, i) => pool[i % pool.length])
}

export function buildShuffledAccentMap<const T extends string>(
  seed: string,
  sectionKeys: readonly T[]
): Record<T, InsightPeriodAccent> {
  const accents = shuffleInsightAccents(seed, sectionKeys.length)
  return Object.fromEntries(sectionKeys.map((key, i) => [key, accents[i]])) as Record<T, InsightPeriodAccent>
}

export const WEEKLY_INSIGHT_SECTION_KEYS = [
  'progress',
  'reflection',
  'patterns',
  'mood',
  'goal',
  'intention',
  'wins',
  'insights',
] as const

export type WeeklyInsightSectionAccentKey = (typeof WEEKLY_INSIGHT_SECTION_KEYS)[number]

export function weeklyInsightAccentMap(weekStart: string): Record<WeeklyInsightSectionAccentKey, InsightPeriodAccent> {
  return buildShuffledAccentMap(`weekly-${weekStart}`, WEEKLY_INSIGHT_SECTION_KEYS)
}

export const MONTHLY_INSIGHT_SECTION_KEYS = [
  'preview',
  'reflection',
  'stats',
  'themes',
  'transformation',
] as const

export type MonthlyInsightSectionAccentKey = (typeof MONTHLY_INSIGHT_SECTION_KEYS)[number]

export function monthlyInsightAccentMap(monthKey: string): Record<MonthlyInsightSectionAccentKey, InsightPeriodAccent> {
  return buildShuffledAccentMap(`monthly-${monthKey}`, MONTHLY_INSIGHT_SECTION_KEYS)
}

export const QUARTERLY_INSIGHT_SECTION_KEYS = [
  'preview',
  'reflection',
  'narrative',
  'shift',
  'thread',
  'carried',
  'surprise',
  'question',
  'intention',
  'glance',
  'wins',
] as const

export type QuarterlyInsightSectionAccentKey = (typeof QUARTERLY_INSIGHT_SECTION_KEYS)[number]

export function quarterlyInsightAccentMap(
  quarterKey: string
): Record<QuarterlyInsightSectionAccentKey, InsightPeriodAccent> {
  return buildShuffledAccentMap(`quarterly-${quarterKey}`, QUARTERLY_INSIGHT_SECTION_KEYS)
}
