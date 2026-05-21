import type { CSSProperties } from 'react'

/**
 * Founder DNA archetype panels — Option 3: Matrix Blueprint Grid Card
 *
 * Option 1 (debossed): bg-slate-50/50 rounded-xl shadow-[inset_0_2px_5px_rgba(15,23,42,0.05)] border border-slate-200/40 p-6
 * Option 2 (dual-leaf): bg-transparent border-t border-b border-slate-200/80 py-8 my-4 rounded-none + micro-label
 */

/** Whisper-quiet blueprint dot grid over paper-white. */
export const archetypeBlueprintCardStyle: CSSProperties = {
  backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
  backgroundSize: '16px 16px',
}

export const archetypeReportCardClassName =
  'relative w-full rounded-xl border border-slate-100/50 bg-white p-6 shadow-md dark:border-slate-700/50 dark:bg-gray-900/40'
