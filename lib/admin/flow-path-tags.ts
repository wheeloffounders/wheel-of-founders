/**
 * Canonical flow tags for admin path breadcrumbs (from `page_views` paths).
 * Aligns with product language: email = heartbeat, calendar = voluntary hook.
 */

export type FlowPathTag = 'Onboard' | 'Morning' | 'DNA' | 'Evening' | 'Emergency' | 'Lesson' | 'Explore'

/** One step in the admin path analyzer: tag + dwell before next view (or on last row, optional DB duration). */
export type FlowPathStep = {
  tag: string
  /** Seconds until the next page view, or last row’s `duration_seconds` when present. */
  dwellSeconds: number | null
  /** True when dwell is short enough to suggest skimming / rage-tap (<5s). */
  bypassed: boolean
}

export function formatDwellSeconds(seconds: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return ''
  return `${Math.max(0, Math.round(seconds))}s`
}

/** Tailwind classes for small pills in admin tables / tooltips (full strings for JIT). */
export const FLOW_TAG_BADGE_CLASS: Record<FlowPathTag, string> = {
  Onboard: 'bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-100',
  Morning: 'bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100',
  DNA: 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/60 dark:text-fuchsia-100',
  Evening: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100',
  Emergency: 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100',
  Lesson: 'bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-100',
  Explore: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
}

export function flowTagClass(tag: string): string {
  return FLOW_TAG_BADGE_CLASS[tag as FlowPathTag] ?? FLOW_TAG_BADGE_CLASS.Explore
}

/**
 * Map a tracked pathname to a short flow tag for the admin "Recent path" column.
 */
export function pathToFlowTag(rawPath: string): FlowPathTag {
  const path = (rawPath ?? '').split('?')[0]?.split('#')[0] ?? ''
  const lower = path.toLowerCase()
  if (!path || path === '/') return 'Explore'

  if (lower.startsWith('/onboarding') || lower.startsWith('/auth')) return 'Onboard'
  if (lower.startsWith('/morning')) return 'Morning'
  if (lower.includes('founder-dna')) return 'DNA'
  if (lower.startsWith('/evening')) return 'Evening'
  if (lower.startsWith('/emergency')) return 'Emergency'
  if (
    lower.startsWith('/insights') ||
    lower.startsWith('/monthly-insight') ||
    lower.startsWith('/weekly') ||
    lower.startsWith('/quarterly') ||
    lower.startsWith('/trajectory')
  ) {
    return 'Lesson'
  }

  return 'Explore'
}

export function formatMinutesToFirstMorning(m: number | null): string {
  if (m == null || Number.isNaN(m)) return ''
  const rounded = Math.max(0, Math.round(m))
  if (rounded < 60) return `${rounded}m`
  if (rounded < 1440) return `${Math.round(rounded / 60)}h`
  return `${Math.round(rounded / 1440)}d`
}

/** Whole minutes from signup to first committed morning plan (may be negative if clocks skew; clamped to ≥0). */
export function minutesBetweenIso(signupIso: string, eventIso: string): number | null {
  const a = new Date(signupIso).getTime()
  const b = new Date(eventIso).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.max(0, Math.round((b - a) / 60000))
}
