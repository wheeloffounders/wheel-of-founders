'use client'

import Link from 'next/link'
import { Lock, Mic, Moon, Sparkles } from 'lucide-react'
import { BrainDumpCard } from '@/components/BrainDumpCard'
import {
  MORNING_BLUEPRINTS_SUBCARD_CLASS,
  MORNING_BRAIN_DUMP_CARD_SHELL,
} from '@/lib/morning/morning-loop-card-styles'
import { PRO_GATE_BADGE_SURFACE_CLASS } from '@/lib/morning/pro-gate-badge-styles'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'
import { cn } from '@/components/ui/utils'

type EveningBrainDumpSectionProps = {
  /** Pro gate — freemium sees locked overlay; Pro gets voice + sort into reflection. */
  eveningBrainDumpLocked: boolean
  brainDump: string
  onBrainDumpChange: (value: string) => void
  sortLoading: boolean
  onSortBegin: () => void
  onSortCancel: () => void
  onSortIntoReview: (text?: string) => void
  onListeningChange?: (listening: boolean) => void
  className?: string
}

/**
 * Evening cache clear — same loop card shell + freemium glass as Emergency brain dump.
 */
export function EveningBrainDumpSection({
  eveningBrainDumpLocked,
  brainDump,
  onBrainDumpChange,
  sortLoading,
  onSortBegin,
  onSortCancel,
  onSortIntoReview,
  onListeningChange,
  className,
}: EveningBrainDumpSectionProps) {
  return (
    <div className={cn('relative z-[45] w-full', className)}>
      <div
        className={`${MORNING_BRAIN_DUMP_CARD_SHELL} ${eveningBrainDumpLocked ? 'opacity-95' : ''}`}
        aria-labelledby="evening-brain-dump-heading"
      >
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700/80 md:px-5 md:py-4">
          <h2
            id="evening-brain-dump-heading"
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100"
          >
            <Moon className="h-5 w-5 shrink-0 text-[#152b50] dark:text-sky-300/90" aria-hidden />
            <span className="min-w-0 self-center leading-none">Final Brain Dump: Clear the cache.</span>
            {eveningBrainDumpLocked ? (
              <span className={PRO_GATE_BADGE_SURFACE_CLASS}>
                <Sparkles className="h-3 w-3" aria-hidden />
                Pro
              </span>
            ) : null}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {eveningBrainDumpLocked
              ? 'Pro founders speak the day’s noise here—Mrs. Deer sorts it into wins, lessons, and synthesis. On Free, capture reflections manually below.'
              : 'Clear the mental cache. Mention what went well, what drained you, and your reflections—I’ll handle the sorting.'}
          </p>
        </div>

        {eveningBrainDumpLocked ? (
          <div className="px-4 py-5 md:px-5 md:py-6">
            <div
              className={`relative isolate z-0 min-h-[15rem] overflow-hidden sm:min-h-[14rem] ${MORNING_BLUEPRINTS_SUBCARD_CLASS}`}
              role="region"
              aria-labelledby="evening-brain-dump-locked-heading"
            >
              <div
                className="pointer-events-none min-h-[15rem] select-none space-y-2 bg-slate-50/80 p-4 opacity-50 dark:bg-slate-900/40 sm:min-h-[14rem]"
                aria-hidden
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[#152b50]/35 bg-white dark:border-sky-700/55 dark:bg-slate-950/60">
                  <Mic className="h-6 w-6 text-slate-400 dark:text-slate-500" strokeWidth={2} aria-hidden />
                </div>
                <p className="text-center text-sm text-slate-400 blur-[2px] dark:text-slate-500">
                  Tap to speak your evening dump…
                </p>
              </div>
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 overflow-y-auto border border-[#152b50]/15 bg-white/93 px-5 py-6 text-center shadow-inner backdrop-blur-[2px] dark:border-sky-900/35 dark:bg-gray-950/93 sm:py-7">
                <Lock className="h-6 w-6 text-[#152b50] dark:text-sky-300" aria-hidden />
                <p
                  id="evening-brain-dump-locked-heading"
                  className="max-w-sm text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-100"
                >
                  Brain Dump is a Pro feature. Speak what&apos;s still rattling around—Mrs. Deer will sort it into
                  your reflection and cards.
                </p>
                <Link href="/pricing" className={`${viewProPlansCtaClassName} px-5 py-2.5 text-sm`}>
                  Unlock Pro
                </Link>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Use{' '}
                  <span className="font-medium text-gray-800 dark:text-gray-200">Harvest your momentum</span> below
                  to log manually.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <BrainDumpCard
            hideHeader
            className="mb-0 border-0 bg-transparent shadow-none ring-0 dark:bg-transparent"
            context="evening"
            accent="navy"
            id="evening-brain-dump"
            title="Final Brain Dump: Clear the cache."
            subtitle="Clear the mental cache. Mention what went well, what drained you, and your reflections—I'll handle the sorting."
            value={brainDump}
            onChange={onBrainDumpChange}
            enableSortIntoReview
            sortLoading={sortLoading}
            onSortBegin={onSortBegin}
            onSortCancel={onSortCancel}
            onSortIntoReview={onSortIntoReview}
            onListeningChange={onListeningChange}
            ghostSortStatusMessage="Sorting into your reflection and cards…"
          />
        )}
      </div>
    </div>
  )
}
