import type { CSSProperties } from 'react'
import { cn } from '@/components/ui/utils'

/** Premium horizontal stationery ruling — profile dossier cards only (no dot matrix). */
export const profileStationeryCardStyle: CSSProperties = {
  backgroundImage: 'linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)',
  backgroundSize: '100% 28px',
}

export const profileStationeryCardStyleDark: CSSProperties = {
  backgroundImage: 'linear-gradient(to bottom, rgb(51 65 85 / 0.4) 1px, transparent 1px)',
  backgroundSize: '100% 28px',
}

export const profileStationeryCardInnerClassName =
  'relative w-full overflow-hidden rounded-[11px] border border-slate-200/60 bg-white p-6 pr-6 pl-8 shadow-sm dark:border-slate-700/60 dark:bg-gray-900/40'

/** Master identity header — dark indigo anchor. */
export const profileIdentityLeftAccentClassName =
  'pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-[3.5px] rounded-l-[11px] bg-indigo-600 dark:bg-indigo-500'

/** Strategic anchors column — slate anchor. */
export const profileStrategicLeftAccentClassName =
  'pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-[3.5px] rounded-l-[11px] bg-slate-400/60 dark:bg-slate-500/50'

/** Operational parameters — sage anchor. */
export const profileOperationalLeftAccentClassName =
  'pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-[3.5px] rounded-l-[11px] bg-emerald-600/70 dark:bg-emerald-500/60'

export const profileDossierLabelClassName =
  'block font-mono text-xs tracking-wider uppercase text-slate-400 dark:text-slate-500 mb-2'

export const profileDossierSectionTitleClassName =
  'font-mono text-xs tracking-wider uppercase text-slate-500 dark:text-slate-400'

export const profileDossierInputClassName =
  'w-full rounded-lg border border-slate-200 bg-white/90 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 dark:border-slate-600 dark:bg-gray-900/80 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-gray-900'

export const profileDossierHintClassName = 'mt-1 text-xs text-slate-500 dark:text-slate-400'

export function profileDossierChipClassName(selected: boolean) {
  return cn(
    'rounded-lg border p-3 text-left transition-all',
    selected
      ? 'border-slate-900 bg-white shadow-sm dark:border-slate-200 dark:bg-gray-900'
      : 'border-slate-200 bg-white/80 hover:border-slate-300 dark:border-slate-700 dark:bg-gray-900/70 dark:hover:border-slate-500',
  )
}
