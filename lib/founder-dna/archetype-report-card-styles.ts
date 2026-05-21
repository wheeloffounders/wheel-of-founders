import type { CSSProperties } from 'react'

/** 1px vibrant gradient frame. */
export const archetypeGradientRingClassName =
  'relative w-full rounded-xl bg-gradient-to-br from-indigo-400/60 via-purple-400/40 to-transparent p-[1px] shadow-md'

/** Inner paper surface + blueprint grid (no outer border). */
export const archetypeReportCardInnerClassName =
  'relative w-full rounded-[11px] bg-white p-6 dark:bg-gray-900/40'

export const archetypeBlueprintCardStyle: CSSProperties = {
  backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
  backgroundSize: '16px 16px',
}
