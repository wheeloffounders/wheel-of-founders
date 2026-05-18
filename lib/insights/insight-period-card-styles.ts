import { cn } from '@/components/ui/utils'
import { MORNING_LOOP_SECTION_TITLE_CLASS } from '@/lib/morning/morning-loop-card-styles'

/** Weekly / monthly insight master card — morning lift + 4px brand left accent. */
export const INSIGHT_PERIOD_CARD_CLASS =
  'relative rounded-xl border border-slate-100/50 border-l-4 bg-white p-6 shadow-md dark:border-slate-700/80 dark:bg-gray-800/95 dark:shadow-md'

export const INSIGHT_PERIOD_CARD_HEADER_CLASS =
  'mb-4 flex flex-wrap items-center justify-between gap-2'

export const INSIGHT_PERIOD_SECTION_TITLE_CLASS = MORNING_LOOP_SECTION_TITLE_CLASS

export const INSIGHT_PERIOD_ACCENT = {
  reflection: 'border-l-[#ef725c] dark:border-l-[#ef725c]',
  patterns: 'border-l-teal-500 dark:border-l-teal-400',
  mood: 'border-l-amber-400 dark:border-l-amber-400',
  goal: 'border-l-[#152b50] dark:border-l-sky-400',
  wins: 'border-l-teal-500 dark:border-l-teal-400',
  lessons: 'border-l-[#ef725c] dark:border-l-[#ef725c]',
  progress: 'border-l-amber-400 dark:border-l-amber-400',
  transformation: 'border-l-[#152b50] dark:border-l-sky-400',
  stats: 'border-l-[#152b50] dark:border-l-sky-400',
} as const

export type InsightPeriodAccent = keyof typeof INSIGHT_PERIOD_ACCENT

export function insightPeriodCardClass(accent: InsightPeriodAccent, extra?: string) {
  return cn(INSIGHT_PERIOD_CARD_CLASS, INSIGHT_PERIOD_ACCENT[accent], extra)
}
