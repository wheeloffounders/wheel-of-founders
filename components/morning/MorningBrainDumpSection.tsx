'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Brain, Lock, Mic, Sparkles } from 'lucide-react'
import { BrainDumpCard } from '@/components/BrainDumpCard'
import {
  MORNING_BLUEPRINTS_SUBCARD_CLASS,
  MORNING_BRAIN_DUMP_CARD_SHELL,
} from '@/lib/morning/morning-loop-card-styles'
import { PRO_GATE_BADGE_SURFACE_CLASS } from '@/lib/morning/pro-gate-badge-styles'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'
import { cn } from '@/components/ui/utils'

type MorningBrainDumpSectionProps = {
  /** Freemium: glass lock; Pro: interactive brain dump + Finish & Sort. */
  morningBrainDumpLocked: boolean
  value: string
  onChange: (value: string) => void
  sortLoading: boolean
  onSortBegin: () => void
  onSortCancel: () => void
  onSortIntoReview: (text?: string) => void
  onListeningChange?: (listening: boolean) => void
  interruptListeningEpoch?: number
  saveHint?: string
  /** Day-1 cockpit: violet/emerald mic styling on the capture card. */
  cockpitVisual?: boolean
  /** Shown under title when unlocked; onboarding may pass rich text. */
  subtitle?: ReactNode
  /** Locked-state helper copy (stream section name). */
  streamTasksPhrase?: string
  className?: string
  'data-tutorial'?: string
}

/**
 * Morning “Clear the Path” — same loop card shell + freemium glass as Emergency brain dump.
 */
export function MorningBrainDumpSection({
  morningBrainDumpLocked,
  value,
  onChange,
  sortLoading,
  onSortBegin,
  onSortCancel,
  onSortIntoReview,
  onListeningChange,
  interruptListeningEpoch,
  saveHint,
  cockpitVisual = false,
  subtitle,
  streamTasksPhrase = 'needle movers',
  className,
  'data-tutorial': dataTutorial,
}: MorningBrainDumpSectionProps) {
  const defaultUnlockedSubtitle = (
    <>
      Speak freely to capture your thoughts. Mrs. Deer will help distill them into your Core Objective and{' '}
      {streamTasksPhrase}.
    </>
  )

  const lockedSubtitle = (
    <>
      Pro founders speak freely here—Mrs. Deer distills into your Core Objective and {streamTasksPhrase}. On Free,
      add priorities manually below.
    </>
  )

  return (
    <div className={cn('relative z-[45] w-full', className)} data-tutorial={dataTutorial}>
      <div
        className={`${MORNING_BRAIN_DUMP_CARD_SHELL} ${morningBrainDumpLocked ? 'opacity-95' : ''}`}
        aria-labelledby="morning-brain-dump-heading"
      >
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700/80 md:px-5 md:py-4">
          <h2
            id="morning-brain-dump-heading"
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100"
          >
            <Brain className="h-5 w-5 shrink-0 self-center text-slate-800 dark:text-slate-200" aria-hidden />
            <span className="min-w-0 self-center leading-none">Clear the Path</span>
            {morningBrainDumpLocked ? (
              <span className={PRO_GATE_BADGE_SURFACE_CLASS}>
                <Sparkles className="h-3 w-3" aria-hidden />
                Pro
              </span>
            ) : null}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {morningBrainDumpLocked ? lockedSubtitle : subtitle ?? defaultUnlockedSubtitle}
          </p>
          {saveHint && !morningBrainDumpLocked ? (
            <p className="mt-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">{saveHint}</p>
          ) : null}
        </div>

        {morningBrainDumpLocked ? (
          <div className="px-4 py-5 md:px-5 md:py-6">
            <div
              className={`relative isolate z-0 min-h-[15rem] overflow-hidden sm:min-h-[14rem] ${MORNING_BLUEPRINTS_SUBCARD_CLASS}`}
              role="region"
              aria-labelledby="morning-brain-dump-locked-heading"
            >
              <div
                className="pointer-events-none min-h-[15rem] select-none space-y-2 bg-slate-50/80 p-4 opacity-50 dark:bg-slate-900/40 sm:min-h-[14rem]"
                aria-hidden
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[#152b50]/35 bg-white dark:border-sky-700/55 dark:bg-slate-950/60">
                  <Mic className="h-6 w-6 text-slate-400 dark:text-slate-500" strokeWidth={2} aria-hidden />
                </div>
                <p className="text-center text-sm text-slate-400 blur-[2px] dark:text-slate-500">
                  Tap to speak your thoughts…
                </p>
              </div>
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 overflow-y-auto border border-[#152b50]/15 bg-white/93 px-5 py-6 text-center shadow-inner backdrop-blur-[2px] dark:border-sky-900/35 dark:bg-gray-950/93 sm:py-7">
                <Lock className="h-6 w-6 text-[#152b50] dark:text-sky-300" aria-hidden />
                <p
                  id="morning-brain-dump-locked-heading"
                  className="max-w-sm text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-100"
                >
                  Brain Dump is a Pro feature. Speak your thoughts to have Mrs. Deer clear the path into your
                  priorities automatically.
                </p>
                <Link href="/pricing" className={`${viewProPlansCtaClassName} px-5 py-2.5 text-sm`}>
                  Unlock Pro
                </Link>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Use{' '}
                  <span className="font-medium text-gray-800 dark:text-gray-200">Today&apos;s Top Priorities</span>{' '}
                  below to log manually.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <BrainDumpCard
            hideHeader
            className="mb-0 border-0 bg-transparent shadow-none ring-0 dark:bg-transparent"
            context="morning"
            accent="sage"
            id="morning-brain-dump"
            title="Clear the Path"
            value={value}
            onChange={onChange}
            enableSortIntoReview
            sortLoading={sortLoading}
            ghostSortStatusMessage="Clearing the path…"
            onSortBegin={onSortBegin}
            onSortCancel={onSortCancel}
            onSortIntoReview={onSortIntoReview}
            onListeningChange={onListeningChange}
            interruptListeningEpoch={interruptListeningEpoch}
            saveHint={saveHint}
            cockpitVisual={cockpitVisual}
          />
        )}
      </div>
    </div>
  )
}
