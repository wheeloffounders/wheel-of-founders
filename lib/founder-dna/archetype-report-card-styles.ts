import { founderDnaBlueprintCardStyle } from '@/lib/founder-dna/founder-dna-blueprint-styles'

/** 1px vibrant gradient frame — master archetype tier. */
export const archetypeGradientRingClassName =
  'relative w-full rounded-xl bg-gradient-to-br from-indigo-400/60 via-purple-400/40 to-transparent p-[1px] shadow-md'

/** Inner paper surface + blueprint grid; inset for left accent rail. */
export const archetypeReportCardInnerClassName =
  'relative w-full overflow-hidden rounded-[11px] bg-white py-6 pr-6 pl-8 dark:bg-gray-900/40'

/** Solid left edge over the gradient ring. */
export const archetypeLeftAccentClassName =
  'pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-[4px] rounded-l-[11px] bg-slate-900'

/** Brand amber left rail — Rhythm + weekly drift cards only (#FBBF24). */
export const rhythmLeftAccentClassName =
  'pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-[4px] rounded-l-[11px] bg-amber-400 dark:bg-amber-400'

/** Lighter gradient thread — Patterns pillar (macro cycles). */
export const patternsGradientRingClassName =
  'relative w-full rounded-xl bg-gradient-to-br from-indigo-400/40 via-slate-200 to-transparent p-[1px] shadow-md'

/** Brand coral left rail — Patterns pillar (#EF725C). */
export const patternsLeftAccentClassName =
  'pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-[4px] rounded-l-[11px] bg-[#ef725c] dark:bg-[#ef725c]'

/** Lighter gradient + slate anchor — Journey bento week cards. */
export const journeyGradientRingClassName =
  'relative w-full rounded-xl bg-gradient-to-br from-indigo-400/40 via-slate-200 to-transparent p-[1px] shadow-md'

export const journeyLeftAccentClassName =
  'pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-[3.5px] rounded-l-[11px] bg-slate-400/60 dark:bg-slate-500/50'

export const archetypeBlueprintCardStyle = founderDnaBlueprintCardStyle
