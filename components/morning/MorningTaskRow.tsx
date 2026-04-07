'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/** When filled priority count exceeds this, tighten row spacing and typography (“marathon” mode). */
export const MORNING_COMPACT_TASK_THRESHOLD = 5

export function morningTaskListGapClass(compact: boolean): string {
  return compact ? 'space-y-2' : 'space-y-5'
}

export function buildMorningTaskRowLiClassName(opts: {
  isRefined: boolean
  isBaseRow: boolean
  compact: boolean
  /** Dashboard DNA: slim accent rail + white row (no gray fill) */
  dashboardRail?: boolean
}): string {
  const { isRefined, isBaseRow, compact, dashboardRail } = opts
  const border = dashboardRail
    ? isRefined
      ? 'border-l-2 border-l-[#ef725c] bg-white dark:border-l-[#f0886c] dark:bg-gray-800'
      : isBaseRow
        ? 'border-l-2 border-l-orange-500/55 bg-white dark:border-l-orange-400/45 dark:bg-gray-800'
        : 'border-l-2 border-l-transparent bg-white dark:bg-gray-800'
    : isRefined
      ? 'border-l-[3px] border-l-[#ef725c] bg-[#fff7f4]/90 dark:border-l-[#f0886c] dark:bg-white/[0.06]'
      : isBaseRow
        ? 'border-l-[3px] border-l-[#152b50]/25 bg-[#152b50]/[0.06] dark:border-l-sky-400/35 dark:bg-sky-500/[0.08]'
        : 'border-l-[3px] border-l-transparent'
  const pad = compact ? 'py-0.5' : 'py-1'
  return `group flex w-full min-w-0 flex-col gap-1.5 overflow-visible rounded-none ${pad} pl-2 transition-[background-color,border-color,opacity,filter] ${border}`
}

export type MorningTaskRowShellProps = {
  index: number
  compact: boolean
  isBaseRow: boolean
  isRefined: boolean
  approachTitle: string
  actionMatrixEmoji: string
  /** Day-1 cockpit: orange index + target rail instead of matrix emoji */
  cockpitOnboarding?: boolean
  /** Slim dashboard-style left rail + white row */
  dashboardRail?: boolean
  /** Mic / trash / etc. — rendered top-right; task field stays full-width below. */
  rowActions?: ReactNode
  children: React.ReactNode
}

/**
 * Outer shell for a morning priority row: header (index + matrix emoji, actions) then full-width body.
 */
export function MorningTaskRowShell(props: MorningTaskRowShellProps) {
  const { index, compact, isBaseRow, isRefined, approachTitle, actionMatrixEmoji, cockpitOnboarding, rowActions, children } = props
  const liClass = buildMorningTaskRowLiClassName({ isRefined, isBaseRow, compact })
  const numText = compact ? 'text-xs font-medium' : 'text-sm font-medium'
  const emojiSize = compact ? 'text-base' : 'text-lg'
  const cockpitRail = Boolean(cockpitOnboarding && isBaseRow)
  return (
    <motion.li layout={false} className={liClass}>
      <div className="flex w-full min-w-0 items-center justify-between gap-2 pr-1">
        <span
          className={`flex min-w-0 select-none items-center gap-1 ${compact ? 'py-0' : 'py-0.5'}`}
          title={approachTitle}
        >
          {cockpitRail ? (
            <>
              <span className={`tabular-nums ${numText} font-semibold text-orange-600 dark:text-orange-400`}>
                {index + 1}.
              </span>
              <span className={`${emojiSize} leading-none`} aria-hidden>
                🎯
              </span>
            </>
          ) : (
            <>
              <span className={`tabular-nums ${numText} text-gray-400`}>{index + 1}.</span>
              <span className={`${emojiSize} leading-none`} aria-hidden>
                {actionMatrixEmoji}
              </span>
            </>
          )}
        </span>
        {rowActions ? (
          <div className="flex shrink-0 items-center justify-end gap-2">{rowActions}</div>
        ) : null}
      </div>
      <div className="min-w-0 w-full">{children}</div>
    </motion.li>
  )
}

/** Primary text field: smaller in marathon mode (> threshold filled) or when empty slots are slimmed. */
export function morningTaskDescriptionInputClassName(opts: {
  compactEmpty: boolean
  /** Many filled priorities — tighten description field without treating as “empty slot”. */
  compactMarathon: boolean
  isLetGo: boolean
  highlight: boolean
  /** Day-1 cockpit: orange focus ring */
  cockpitOnboarding?: boolean
  /** Dashboard DNA: underline field, no gray box */
  dashboardUnderline?: boolean
}): string {
  const { compactEmpty, compactMarathon, isLetGo, highlight, cockpitOnboarding, dashboardUnderline } = opts
  const size = compactEmpty
    ? 'min-h-8 px-2.5 py-1 text-sm'
    : compactMarathon
      ? 'min-h-9 px-3 py-1.5 text-sm'
      : 'min-h-11 px-3 py-2 text-base'
  const state = isLetGo ? 'opacity-40 grayscale line-through decoration-gray-400/70' : ''
  if (dashboardUnderline) {
    const uSize = compactEmpty ? 'min-h-9 py-2 text-sm' : compactMarathon ? 'min-h-10 py-2 text-sm' : 'min-h-12 py-2.5 text-base'
    const uRing = highlight
      ? 'border-b-[#ef725c]'
      : 'border-b-gray-200 focus:border-b-orange-500 dark:border-b-gray-600 dark:focus:border-orange-400'
    return `${uSize} w-full rounded-none border-0 border-b-2 bg-transparent text-gray-900 placeholder:text-gray-400 shadow-none transition-[border-color] duration-200 focus:outline-none focus:ring-0 disabled:cursor-wait dark:bg-transparent dark:text-white ${state} ${uRing}`
  }
  const ring = highlight
    ? 'border-[#ef725c] ring-2 ring-[#ef725c]/50 ring-offset-0 dark:border-[#f0886c] dark:ring-[#f0886c]/40'
    : cockpitOnboarding
      ? 'border-gray-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-gray-600 dark:focus:border-orange-500/70 dark:focus:ring-orange-500/30'
      : 'border-gray-300 focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/25 dark:border-gray-600'
  return `${size} w-full rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 transition-[border-color,box-shadow,opacity,filter] duration-300 focus:outline-none disabled:cursor-wait dark:bg-gray-800 dark:text-white ${state} ${ring}`
}

type RowChrome = 'full' | 'marathon' | 'slimEmpty'

function rowChromeFromFlags(marathonFilled: boolean, emptySlim: boolean): RowChrome {
  if (emptySlim) return 'slimEmpty'
  if (marathonFilled) return 'marathon'
  return 'full'
}

const ROW_CHROME_BTN: Record<RowChrome, string> = {
  full: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#152b50] focus-visible:ring-offset-1 dark:focus-visible:ring-sky-400/60',
  marathon:
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#152b50] focus-visible:ring-offset-1 dark:focus-visible:ring-sky-400/60',
  slimEmpty:
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#152b50] focus-visible:ring-offset-1 dark:focus-visible:ring-sky-400/60',
}

/** Mic / trash: slim for empty placeholders; mid-size in marathon; full default. */
export function morningTaskRowActionBtnClass(marathonFilled: boolean, emptySlim: boolean): string {
  return ROW_CHROME_BTN[rowChromeFromFlags(marathonFilled, emptySlim)]
}

/** Strategic / ghostwriter card under the row — tighter when marathon compact. */
export function morningStrategicCardWrapperClass(compact: boolean): string {
  return compact
    ? 'relative mt-1 rounded-md border-l-2 border-slate-200/90 bg-slate-50/50 py-1.5 pl-2 pr-2 dark:border-slate-600 dark:bg-slate-800/40'
    : 'relative mt-2 rounded-md border-l-2 border-slate-200/90 bg-slate-50/50 py-2.5 pl-2.5 pr-2 dark:border-slate-600 dark:bg-slate-800/40'
}
