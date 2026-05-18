'use client'

import Link from 'next/link'
import { Flame, Lock, Mic, Sparkles } from 'lucide-react'
import { BrainDumpCard } from '@/components/BrainDumpCard'
import {
  MORNING_BLUEPRINTS_SUBCARD_CLASS,
  MORNING_BRAIN_DUMP_CARD_SHELL,
} from '@/lib/morning/morning-loop-card-styles'
import { PRO_GATE_BADGE_SURFACE_CLASS } from '@/lib/morning/pro-gate-badge-styles'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'

type EmergencyBrainDumpSectionProps = {
  /** Pro gate: `voice_to_text` — freemium sees locked overlay; Pro gets voice-only capture. */
  emergencyBrainDumpLocked: boolean
  brainDump: string
  onBrainDumpChange: (value: string) => void
  brainDumpSaveHint?: string
  sortLoading: boolean
  onSortBegin: () => void
  onSortCancel: () => void
  onSortIntoReview: (text?: string) => void
}

/**
 * Emergency vent — voice-only for Pro (`voiceCaptureOnly`); freemium sees locked blueprint overlay.
 * Manual logging stays in Emergency protocol below.
 */
export function EmergencyBrainDumpSection({
  emergencyBrainDumpLocked,
  brainDump,
  onBrainDumpChange,
  brainDumpSaveHint,
  sortLoading,
  onSortBegin,
  onSortCancel,
  onSortIntoReview,
}: EmergencyBrainDumpSectionProps) {
  return (
    <div className="relative z-[45] mb-6 w-full md:mb-8">
      <div
        className={`${MORNING_BRAIN_DUMP_CARD_SHELL} ${emergencyBrainDumpLocked ? 'opacity-95' : ''}`}
        aria-labelledby="emergency-brain-dump-heading"
      >
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700/80 md:px-5 md:py-4">
          <h2
            id="emergency-brain-dump-heading"
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100"
          >
            <Flame className="h-5 w-5 shrink-0 text-[#f59e0b] dark:text-amber-500" aria-hidden />
            <span className="min-w-0 self-center leading-none">Emergency Brain Dump: Vent first.</span>
            {emergencyBrainDumpLocked ? (
              <span className={PRO_GATE_BADGE_SURFACE_CLASS}>
                <Sparkles className="h-3 w-3" aria-hidden />
                Pro
              </span>
            ) : null}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {emergencyBrainDumpLocked
              ? 'Pro founders speak the noise here—Mrs. Deer distills it into your protocol. On Free, log the fire manually below.'
              : 'Speak the noise, stakes, and what you need—then tap Finish & Sort. Mrs. Deer will suggest your headline and severity below.'}
          </p>
          {brainDumpSaveHint && !emergencyBrainDumpLocked ? (
            <p className="mt-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">{brainDumpSaveHint}</p>
          ) : null}
        </div>

        {emergencyBrainDumpLocked ? (
          <div className="px-4 py-5 md:px-5 md:py-6">
            <div
              className={`relative isolate z-0 min-h-[15rem] overflow-hidden sm:min-h-[14rem] ${MORNING_BLUEPRINTS_SUBCARD_CLASS}`}
              role="region"
              aria-labelledby="emergency-brain-dump-locked-heading"
            >
              {/* Dummy layer — visually behind glass; not interactive */}
              <div className="pointer-events-none min-h-[15rem] select-none space-y-2 bg-slate-50/80 p-4 opacity-50 dark:bg-slate-900/40 sm:min-h-[14rem]" aria-hidden>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[#152b50]/35 bg-white dark:border-sky-700/55 dark:bg-slate-950/60">
                  <Mic className="h-6 w-6 text-slate-400 dark:text-slate-500" strokeWidth={2} aria-hidden />
                </div>
                <p className="text-center text-sm text-slate-400 blur-[2px] dark:text-slate-500">
                  Tap to speak your vent…
                </p>
              </div>
              {/* Must sit above shell + dummy mic */}
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 overflow-y-auto border border-[#152b50]/15 bg-white/93 px-5 py-6 text-center shadow-inner backdrop-blur-[2px] dark:border-sky-900/35 dark:bg-gray-950/93 sm:py-7">
                <Lock className="h-6 w-6 text-[#152b50] dark:text-sky-300" aria-hidden />
                <p
                  id="emergency-brain-dump-locked-heading"
                  className="max-w-sm text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-100"
                >
                  Brain Dump is a Pro feature. Speak your noise and stakes to have Mrs. Deer distill it
                  automatically.
                </p>
                <Link href="/pricing" className={`${viewProPlansCtaClassName} px-5 py-2.5 text-sm`}>
                  Unlock Pro
                </Link>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Use <span className="font-medium text-gray-800 dark:text-gray-200">Emergency protocol</span>{' '}
                  below to log manually.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <BrainDumpCard
            hideHeader
            className="mb-0 border-0 bg-transparent shadow-none ring-0 dark:bg-transparent"
            context="emergency"
            accent="navy"
            id="emergency-brain-dump"
            title="Emergency Brain Dump: Vent first."
            value={brainDump}
            onChange={onBrainDumpChange}
            voiceCaptureOnly
            enableSortIntoReview
            sortLoading={sortLoading}
            onSortBegin={onSortBegin}
            onSortCancel={onSortCancel}
            onSortIntoReview={onSortIntoReview}
            ghostSortStatusMessage="Suggesting headline & severity below…"
          />
        )}
      </div>
    </div>
  )
}
