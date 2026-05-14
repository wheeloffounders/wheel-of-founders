'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Brain, Check, Loader2, Mic, MicOff } from 'lucide-react'

import { colors } from '@/lib/design-tokens'
import {
  PRO_BRAND_ACTION_ENABLED_SURFACE_CLASS,
  PRO_GATE_BADGE_SURFACE_CLASS,
} from '@/lib/morning/pro-gate-badge-styles'
import { cn } from '@/components/ui/utils'
import { AutosizeTextarea } from '@/components/morning/AutosizeTextarea'

const SAGE = '#5A7D66'

/** Idle mic in dashed blueprint CTA — matches sky text/icon. */
const MIC_WORKSPACE_ACCENT = 'text-sky-600 dark:text-sky-400 shrink-0'

/** Ghost + cockpit: Brain Dump idle = soft sky pad; hover = white lift + stronger sky text. */
const GHOST_BRAIN_DUMP_DASHED_BTN =
  'rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 text-sky-600 shadow-sm transition-all hover:border-sky-400 hover:bg-white hover:text-sky-700 hover:shadow-md dark:border-sky-600/55 dark:bg-sky-950/35 dark:text-sky-300 dark:shadow-none dark:hover:border-sky-500 dark:hover:bg-slate-950 dark:hover:text-sky-200 dark:hover:shadow-md'

/** Ghost + cockpit: sky-600 command cap, sky-200 drafting grid (readable, low vibration). */
const GHOST_COCKPIT_ENGINE_SHELL =
  'rounded-none border-x border-b border-slate-200/70 border-t-4 border-t-sky-600 bg-white px-5 py-4 shadow-xl [background-image:linear-gradient(to_right,rgba(186,230,253,0.44)_1px,transparent_1px),linear-gradient(to_bottom,rgba(186,230,253,0.44)_1px,transparent_1px)] [background-size:24px_24px] dark:border-slate-600/80 dark:border-t-sky-500 dark:bg-slate-950/40 dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] dark:[background-image:linear-gradient(to_right,rgba(186,230,253,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(186,230,253,0.22)_1px,transparent_1px)] sm:py-5'

/** Matches `ProMorningCanvas` decision textarea + dashed brain-dump control styling. */
const TEXTAREA_CLASSES =
  'min-h-[200px] w-full resize-y rounded-lg border-2 bg-white/80 px-4 py-3 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 border-gray-200 focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/30 dark:border-gray-600'

const TEXTAREA_CLASSES_COCKPIT =
  'min-h-[200px] w-full resize-y rounded-lg border-2 bg-white/80 px-4 py-3 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-gray-600 dark:focus:border-orange-500/70 dark:focus:ring-orange-500/25'

/** Emergency: short start height, grows with content; red left accent on focus. */
const TEXTAREA_EMERGENCY_CLASSES =
  'w-full rounded-lg border-2 border-gray-200 bg-white/90 px-3 py-2 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none dark:bg-gray-800 dark:text-white dark:border-gray-600 border-l-4 border-l-transparent focus:border-l-red-500 focus:border-red-500/80 focus:ring-2 focus:ring-red-500/20'

const CONTEXT_PLACEHOLDER: Record<BrainDumpContext, string> = {
  morning:
    'Speak freely to capture your thoughts. Mrs. Deer will help distill them into your Core Objective and Needle Movers.',
  evening:
    "What's still rattling around? Worries, half-thoughts, things you don't want carrying into sleep...",
  emergency: "Get it all out. What's the immediate noise? Don't worry about grammar, just dump it.",
}

/** Evening + sort: live transcript while listening — mental script aligned with page subtitle. */
const EVENING_SORT_PLACEHOLDER =
  "Speaking is active... Tell me about your wins, your drains, and how you'd do today differently."

/** Emergency + sort: ghost capture — focus on the fire, not editing. */
const EMERGENCY_SORT_PLACEHOLDER =
  "Speaking is active... Name the fire, what's at stake, and what you need next."

/** Morning + sort: placeholder for assistive tech / hidden field (capture is voice-only). */
const MORNING_SORT_PLACEHOLDER =
  'Speak freely to capture your thoughts. Mrs. Deer will help distill them into your Core Objective and Needle Movers.'

const HELPER_COPY: Record<BrainDumpContext, string> = {
  morning:
    'Speak freely to capture your thoughts. Mrs. Deer will help distill them into your Core Objective and Needle Movers.',
  evening:
    'Speak freely—or type below. Words appear in the box as you go. Tap again when done.',
  emergency:
    'Speak freely—or type below. Words appear in the box as you go. Tap again when done.',
}

function getSpeechRecognition(): (new () => { stop: () => void; start: () => void }) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: new () => { stop: () => void; start: () => void }
    webkitSpeechRecognition?: new () => { stop: () => void; start: () => void }
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type BrainDumpContext = 'morning' | 'emergency' | 'evening'

type Props = {
  title: string
  context: BrainDumpContext
  /** Shown under the title */
  subtitle?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Left accent on title icon only (morning canvas uses coral focus on the field). */
  accent?: 'sage' | 'navy'
  id?: string
  /** Optional draft sync hint (e.g. emergency autosave) */
  saveHint?: string
  hideSpeechButton?: boolean
  /** Evening: show Mrs. Deer “sort” into reflection / wins / lessons (like morning brain dump sort). */
  enableSortIntoReview?: boolean
  sortLoading?: boolean
  /** Pass optional text when invoking from voice “Done” so sorting uses the latest dump after mic stops. */
  onSortIntoReview?: (textOverride?: string) => void
  /** Evening: called as soon as user taps Finish & Sort (before the short debounce + API). Parent can show loading immediately. */
  onSortBegin?: () => void
  /** When Finish & Sort runs but the dump is too short to sort (clears parent `sortLoading`). */
  onSortCancel?: () => void
  /** Ghost sort slot (evening default: cards; emergency: logs). */
  ghostSortStatusMessage?: string
  onListeningChange?: (listening: boolean) => void
  /** When incremented (e.g. another mic claimed), stop active brain-dump listening. */
  interruptListeningEpoch?: number
  /** Merges with default section classes (e.g. `mb-0` when parent controls vertical rhythm). */
  className?: string
  /** When true, skip the visible title/subtitle header (parent supplies layout). */
  hideHeader?: boolean
  /** Day-1 cockpit: glow container, violet/emerald waveform while recording, orange focus ring on textarea */
  cockpitVisual?: boolean
  /** Emergency: voice-only capture (evening-style ghost). No visible textarea or typed sort — Finish & Sort sends transcript to protocol. */
  voiceCaptureOnly?: boolean
  /** Pro+: AI distill / sort — disabled on freemium intelligence gate. */
  proDistillLocked?: boolean
}

export function BrainDumpCard({
  title,
  context,
  subtitle,
  value,
  onChange,
  placeholder,
  accent = 'sage',
  id = 'brain-dump',
  saveHint,
  hideSpeechButton,
  enableSortIntoReview,
  sortLoading = false,
  onSortIntoReview,
  onSortBegin,
  onSortCancel,
  ghostSortStatusMessage,
  className,
  onListeningChange,
  interruptListeningEpoch,
  hideHeader = false,
  cockpitVisual = false,
  voiceCaptureOnly = false,
  proDistillLocked = false,
}: Props) {
  const borderAccent = accent === 'navy' ? colors.navy.DEFAULT : SAGE
  const placeholderResolved =
    placeholder ??
    (context === 'evening' && enableSortIntoReview
      ? EVENING_SORT_PLACEHOLDER
      : context === 'emergency' && enableSortIntoReview
        ? EMERGENCY_SORT_PLACEHOLDER
        : context === 'morning' && enableSortIntoReview
          ? MORNING_SORT_PLACEHOLDER
          : CONTEXT_PLACEHOLDER[context])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  /** True after `stopListening()` / user toggle off — avoids auto-restart after intentional stop. */
  const userRequestedMicStopRef = useRef(false)
  const [isListening, setIsListening] = useState(false)
  const [supportsSpeech, setSupportsSpeech] = useState(false)
  /** Evening / Emergency + sort: hide live transcript during sort so the dump “vanishes” into cards / form. */
  const [ghostHideFieldForSort, setGhostHideFieldForSort] = useState(false)
  const sortLoadingRef = useRef(sortLoading)
  const ghostHideForSortRef = useRef(ghostHideFieldForSort)
  sortLoadingRef.current = sortLoading
  ghostHideForSortRef.current = ghostHideFieldForSort

  const isGhostMode =
    (context === 'evening' || context === 'emergency' || context === 'morning') &&
    Boolean(enableSortIntoReview)

  useEffect(() => {
    setSupportsSpeech(getSpeechRecognition() !== null)
  }, [])

  useEffect(() => {
    if (!sortLoading && ghostHideFieldForSort) {
      setGhostHideFieldForSort(false)
    }
  }, [sortLoading, ghostHideFieldForSort])

  /** Keeps page-level dim / nav in sync with the mic before paint (matches waveform visibility). */
  useLayoutEffect(() => {
    if (!isGhostMode) return
    onListeningChange?.(isListening)
  }, [isGhostMode, isListening, onListeningChange])

  const appendTranscriptGhost = useCallback(
    (chunk: string) => {
      const t = chunk.trim()
      if (!t) return
      const v = valueRef.current
      const next = v + (v.length && !/\s$/.test(v) ? ' ' : '') + t + ' '
      onChange(next)
    },
    [onChange]
  )

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = textareaRef.current
      if (!el) return
      const start = el.selectionStart ?? value.length
      const end = el.selectionEnd ?? value.length
      const before = value.slice(0, start)
      const after = value.slice(end)
      const newValue = before + text + after
      onChange(newValue)
      requestAnimationFrame(() => {
        const newPos = start + text.length
        el.setSelectionRange(newPos, newPos)
        el.focus()
      })
    },
    [value, onChange]
  )

  const stopListening = useCallback(() => {
    userRequestedMicStopRef.current = true
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  const interruptEpochRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (interruptListeningEpoch === undefined) return
    if (interruptEpochRef.current === undefined) {
      interruptEpochRef.current = interruptListeningEpoch
      return
    }
    if (interruptListeningEpoch === interruptEpochRef.current) return
    interruptEpochRef.current = interruptListeningEpoch
    stopListening()
  }, [interruptListeningEpoch, stopListening])

  const toggleListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return

    if (isListening) {
      stopListening()
      return
    }

    const recognition = new SpeechRecognition() as unknown as {
      continuous: boolean
      interimResults: boolean
      lang: string
      onresult: (event: {
        resultIndex: number
        results: { isFinal: boolean; 0: { transcript: string } }[]
      }) => void
      onerror: (event: { error: string }) => void
      onend: () => void
      start: () => void
      stop: () => void
    }
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    // interimResults=true helps the engine segment phrases; we only commit isFinal chunks so interim never overwrites text.
    recognition.onresult = (event) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0]?.transcript ?? ''
        }
      }
      if (final) {
        if (isGhostMode) {
          appendTranscriptGhost(final)
        } else {
          insertAtCursor(final + ' ')
        }
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'aborted') {
        userRequestedMicStopRef.current = true
        recognitionRef.current = null
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return

      if (
        userRequestedMicStopRef.current ||
        sortLoadingRef.current ||
        ghostHideForSortRef.current
      ) {
        recognitionRef.current = null
        setIsListening(false)
        return
      }

      // Mobile often ends the session after a pause even with continuous=true — restart to keep capturing.
      window.setTimeout(() => {
        if (recognitionRef.current !== recognition || userRequestedMicStopRef.current) return
        if (sortLoadingRef.current || ghostHideForSortRef.current) {
          recognitionRef.current = null
          setIsListening(false)
          return
        }
        try {
          recognition.start()
        } catch {
          recognitionRef.current = null
          setIsListening(false)
        }
      }, 0)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
      if (!isGhostMode) {
        textareaRef.current?.focus()
      }
    } catch {
      setIsListening(false)
    }
  }, [appendTranscriptGhost, isGhostMode, isListening, insertAtCursor, stopListening])

  useEffect(() => {
    return () => {
      userRequestedMicStopRef.current = true
      try {
        recognitionRef.current?.stop()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const onBrainDumpMicClick = useCallback(() => {
    if (proDistillLocked) return
    if (hideSpeechButton || sortLoading) return
    if (!supportsSpeech) {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'info',
            message: 'Voice brain dump needs a mic-capable browser (e.g. Chrome or Edge on desktop).',
          },
        })
      )
      return
    }
    toggleListening()
  }, [hideSpeechButton, proDistillLocked, sortLoading, supportsSpeech, toggleListening])

  const onDoneSpeaking = useCallback(() => {
    if (proDistillLocked) return
    if (hideSpeechButton || sortLoading || !enableSortIntoReview || !onSortIntoReview) return
    textareaRef.current?.blur()
    stopListening()
    setGhostHideFieldForSort(true)
    onSortBegin?.()
    window.setTimeout(() => {
      const v = valueRef.current.trim()
      if (v.length > 8) {
        onSortIntoReview(v)
      } else {
        setGhostHideFieldForSort(false)
        onSortCancel?.()
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              type: 'info',
              message: 'Tell me a bit more so I can sort it properly.',
            },
          })
        )
      }
    }, 120)
  }, [enableSortIntoReview, hideSpeechButton, onSortBegin, onSortCancel, onSortIntoReview, proDistillLocked, sortLoading, stopListening])

  const showMicHelperLine = !(
    (context === 'evening' || context === 'emergency' || context === 'morning') && enableSortIntoReview
  )

  const hideGhostMicForSort =
    isGhostMode && enableSortIntoReview && !!onSortIntoReview && (sortLoading || ghostHideFieldForSort)

  /** Morning / evening / emergency ghost dump: show Finish & Sort whenever there is text or mic is active (pause ≠ lose the button). */
  const ghostShowFinishSort =
    isGhostMode &&
    enableSortIntoReview &&
    !!onSortIntoReview &&
    !sortLoading &&
    !ghostHideFieldForSort &&
    (isListening || value.trim().length > 0)

  /** Initial mic — only before any capture. After that, Finish & Sort + optional “Add more” stay available. */
  const ghostShowStartMicOnly =
    isGhostMode &&
    enableSortIntoReview &&
    !!onSortIntoReview &&
    !sortLoading &&
    !ghostHideFieldForSort &&
    !isListening &&
    value.trim().length === 0

  /** Dashed “ghost” region after Finish — sorting status (no live transcript). */
  const showGhostSortSlot = isGhostMode && ghostHideFieldForSort

  /** Emergency + sort: visible field first, mic row below (mobile-friendly). */
  const emergencyStackedGhost =
    isGhostMode &&
    context === 'emergency' &&
    Boolean(enableSortIntoReview) &&
    !voiceCaptureOnly &&
    !ghostHideFieldForSort &&
    !showGhostSortSlot

  const waveBarClass = cockpitVisual ? 'cockpit-voice-wave-bar' : 'evening-voice-wave-bar'
  const listeningIndicator = (
    <div className="flex flex-col items-center gap-2 py-1">
      <div className="flex h-12 items-end justify-center gap-1.5" aria-hidden>
        {[10, 16, 22, 16].map((h, i) => (
          <span key={i} className={waveBarClass} style={{ height: `${h}px` }} />
        ))}
      </div>
      <p
        className={
          cockpitVisual
            ? 'text-xs font-medium text-violet-700 dark:text-emerald-300/90'
            : 'text-xs font-medium text-muted-foreground'
        }
      >
        Listening
      </p>
    </div>
  )

  const finishSortButton = (
    <button
      type="button"
      onClick={onDoneSpeaking}
      disabled={sortLoading || proDistillLocked}
      aria-label="Finish and sort — send capture to your reflection and cards"
      aria-busy={sortLoading}
      className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-[3px] px-4 py-3.5 text-base font-bold shadow-md transition active:scale-[0.99] sm:min-h-14 sm:text-lg ${
        proDistillLocked
          ? 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 opacity-60 dark:border-slate-600 dark:bg-slate-800'
          : `border-white/40 ${PRO_BRAND_ACTION_ENABLED_SURFACE_CLASS} ${
              sortLoading ? 'cursor-wait opacity-[0.92] brightness-[0.98]' : ''
            }`
      }`}
    >
      <Check className="h-7 w-7 shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
      Finish &amp; Sort
    </button>
  )

  const finishSortBlock = (
    <div className="flex w-full flex-col gap-3">
      {isListening ? listeningIndicator : null}
      {finishSortButton}
    </div>
  )

  const brainDumpMicBlock = hideSpeechButton ? null : (
    <div className="w-full">
      {showMicHelperLine ? (
        <p className="mb-2 text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-300">
          {HELPER_COPY[context]}
        </p>
      ) : null}
      {isGhostMode && enableSortIntoReview && onSortIntoReview ? (
        hideGhostMicForSort ? null : ghostShowFinishSort ? (
          <div className="flex w-full flex-col gap-3">
            {finishSortBlock}
            {!isListening && !sortLoading && supportsSpeech && !proDistillLocked ? (
              <button
                type="button"
                onClick={onBrainDumpMicClick}
                aria-label="Add more — continue voice brain dump"
                title="Keep going — your new words are added to what you already said."
                className={`flex w-full items-center justify-center gap-3 py-2.5 text-sm font-medium ${GHOST_BRAIN_DUMP_DASHED_BTN} ${
                  !supportsSpeech || sortLoading || proDistillLocked ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                <Mic className={`h-5 w-5 ${MIC_WORKSPACE_ACCENT}`} strokeWidth={2.25} aria-hidden />
                <span>Add more (voice)</span>
              </button>
            ) : null}
          </div>
        ) : ghostShowStartMicOnly ? (
          <button
            type="button"
            onClick={onBrainDumpMicClick}
            disabled={!supportsSpeech || sortLoading || proDistillLocked}
            aria-pressed={false}
            aria-label="Start brain dump — speak your loose threads"
            title={
              proDistillLocked
                ? 'Brain Dump & AI Distillation is a Pro+ feature.'
              : !supportsSpeech
                ? 'Voice requires a supported browser'
                : 'Tap to speak; your words appear as you go. Tap Done when finished.'
            }
            className={`flex w-full items-center justify-center gap-3 py-3 font-medium ${GHOST_BRAIN_DUMP_DASHED_BTN} ${
              !supportsSpeech || sortLoading || proDistillLocked ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <Mic className={`h-6 w-6 ${MIC_WORKSPACE_ACCENT}`} strokeWidth={2.25} aria-hidden />
            <span>Brain Dump</span>
          </button>
        ) : null
      ) : isListening ? (
        <button
          type="button"
          onClick={onBrainDumpMicClick}
          disabled={!supportsSpeech || sortLoading || proDistillLocked}
          aria-pressed={isListening}
          aria-label="Stop recording and add speech to brain dump"
          title={
            proDistillLocked
              ? 'Brain Dump & AI Distillation is a Pro+ feature.'
            : !supportsSpeech
              ? 'Voice requires a supported browser'
              : 'Tap to finish — your words are added to the box as you speak'
          }
          className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-3 font-medium transition-all border-[#ef725c]/70 bg-[#fff7f4] text-[#c44a38] shadow-[0_0_20px_rgba(239,114,92,0.25)] dark:border-[#f0886c]/60 dark:bg-[#2a1512]/40 dark:text-[#f5b8a8] ${
            !supportsSpeech || sortLoading || proDistillLocked ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          <span className="text-[#ef725c] drop-shadow-[0_0_8px_rgba(239,114,92,0.9)] animate-pulse dark:text-[#f0886c]" aria-hidden>
            <MicOff className="h-6 w-6" strokeWidth={2.25} />
          </span>
          <span>Tap to finish &amp; add</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onBrainDumpMicClick}
          disabled={!supportsSpeech || sortLoading || proDistillLocked}
          aria-pressed={false}
          aria-label="Start brain dump — speak freely, then tap again when done"
          title={
            proDistillLocked
              ? 'Brain Dump & AI Distillation is a Pro+ feature.'
            : !supportsSpeech
              ? 'Voice requires a supported browser'
              : 'Tap to speak freely; tap again when done'
          }
          className={`flex w-full items-center justify-center gap-3 py-3 font-medium ${GHOST_BRAIN_DUMP_DASHED_BTN} ${
            !supportsSpeech || sortLoading || proDistillLocked ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          <Mic className={`h-6 w-6 ${MIC_WORKSPACE_ACCENT}`} strokeWidth={2.25} aria-hidden />
          <span>Brain Dump</span>
        </button>
      )}
    </div>
  )

  /** Evening is voice-only; typed sort lives in Daily synthesis / wins / lessons below. */
  const showTypedSortButton = Boolean(
    enableSortIntoReview &&
      onSortIntoReview &&
      !proDistillLocked &&
      (!isGhostMode || emergencyStackedGhost) &&
      !isListening &&
      value.trim().length > 0 &&
      !sortLoading
  )

  /** Non–ghost: overlay on textarea while sorting. */
  const sortOverlayEl =
    sortLoading && !isGhostMode ? (
      <div
        role="status"
        aria-live="polite"
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-[#5A7D66]/40 bg-white/90 px-4 py-8 text-center backdrop-blur-[2px] dark:border-emerald-500/30 dark:bg-gray-900/92"
      >
        <Loader2 className="h-8 w-8 shrink-0 animate-spin text-[#5A7D66] dark:text-emerald-400" aria-hidden />
        <p className="text-sm font-semibold text-[#152B50] dark:text-sky-100">Mrs. Deer is sorting…</p>
        <p className="max-w-xs text-xs text-gray-600 dark:text-gray-400">Handing your words into reflection &amp; cards.</p>
      </div>
    ) : null

  const eveningSortStatusBlock = (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[#5A7D66]/35 bg-slate-50/80 px-4 py-8 text-center dark:border-emerald-500/25 dark:bg-gray-900/50"
    >
      <Loader2 className="h-8 w-8 shrink-0 animate-spin text-[#5A7D66] dark:text-emerald-400" aria-hidden />
      <p className="evening-sort-status-pulse max-w-sm text-sm font-medium leading-snug text-muted-foreground">
        {ghostSortStatusMessage ?? 'Updating your cards...'}
      </p>
    </div>
  )

  const isGhostVoiceBlock =
    (context === 'evening' || context === 'emergency' || context === 'morning') &&
    Boolean(enableSortIntoReview)

  return (
    <section
      className={cn(
        'mb-8 w-full',
        isGhostVoiceBlock
          ? 'flex flex-col gap-0 transition-all duration-300 ease-out'
          : 'space-y-3',
        cockpitVisual &&
          isGhostVoiceBlock &&
          GHOST_COCKPIT_ENGINE_SHELL,
        className
      )}
      data-brain-dump-context={context}
    >
      {hideHeader ? (
        <h2 id={`${id}-heading`} className="sr-only">
          {title}
          {saveHint ? ` ${saveHint}` : ''}
        </h2>
      ) : (
        <header className={isGhostVoiceBlock ? 'shrink-0' : undefined}>
          <h2
            id={`${id}-heading`}
            className={
              isGhostVoiceBlock
                ? 'text-xl font-bold leading-none text-slate-800 dark:text-slate-100 sm:text-2xl'
                : 'text-xl font-semibold leading-none text-gray-900 dark:text-white sm:text-2xl'
            }
          >
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-2.5">
              <Brain
                className={cn(
                  'h-5 w-5 shrink-0 self-center sm:h-6 sm:w-6',
                  isGhostVoiceBlock ? 'text-slate-800 dark:text-slate-200' : '',
                )}
                style={isGhostVoiceBlock ? undefined : { color: borderAccent }}
                aria-hidden
              />
              <span className="min-w-0 self-center leading-none sm:leading-tight">{title}</span>
              {proDistillLocked ? (
                <Link
                  href="/pricing"
                  className={cn(
                    'shrink-0 self-center cursor-pointer transition hover:scale-105 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
                    PRO_GATE_BADGE_SURFACE_CLASS,
                  )}
                  aria-label="Upgrade to Pro — view plans"
                  title="Brain Dump & AI Distillation is a Pro+ feature."
                >
                  Pro
                </Link>
              ) : null}
            </span>
          </h2>
          {saveHint ? (
            <p className="mt-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">{saveHint}</p>
          ) : null}
          {subtitle ? (
            <p
              className={
                isGhostVoiceBlock
                  ? 'mb-2 mt-1.5 max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-400'
                  : 'mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300'
              }
            >
              {subtitle}
            </p>
          ) : null}
        </header>
      )}

      <div
        className={
          isGhostVoiceBlock
            ? cn(
                'flex min-h-0 flex-1 flex-col justify-center',
                cockpitVisual ? 'gap-3 px-0.5 pb-7 pt-2 sm:pb-8' : 'gap-2 pb-4',
              )
            : 'space-y-2'
        }
      >
        {!(context === 'emergency' && !isGhostMode) && !emergencyStackedGhost ? brainDumpMicBlock : null}

        <label htmlFor={id} className="sr-only">
          {hideHeader ? title : title}
        </label>

        {context === 'emergency' && !isGhostMode ? (
          <div className="relative">
            {sortOverlayEl}
            <AutosizeTextarea
              id={id}
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              minRows={2}
              disabled={sortLoading || proDistillLocked}
              readOnly={proDistillLocked}
              placeholder={placeholderResolved}
              className={`${TEXTAREA_EMERGENCY_CLASSES} ${sortLoading || proDistillLocked ? 'opacity-60' : ''}`}
            />
          </div>
        ) : !isGhostMode ? (
          <div className="relative">
            {sortOverlayEl}
            <textarea
              id={id}
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={5}
              disabled={sortLoading || proDistillLocked}
              readOnly={proDistillLocked}
              placeholder={placeholderResolved}
              className={`${cockpitVisual ? TEXTAREA_CLASSES_COCKPIT : TEXTAREA_CLASSES} ${sortLoading || proDistillLocked ? 'opacity-60' : ''}`}
            />
          </div>
        ) : emergencyStackedGhost ? (
          <>
            <div className="relative">
              {sortOverlayEl}
              <AutosizeTextarea
                id={id}
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                minRows={2}
                disabled={sortLoading || proDistillLocked}
                readOnly={proDistillLocked}
                placeholder={placeholderResolved}
                className={`${TEXTAREA_EMERGENCY_CLASSES} ${sortLoading || proDistillLocked ? 'opacity-60' : ''}`}
              />
            </div>
            {brainDumpMicBlock}
          </>
        ) : (
          <>
            <textarea
              id={id}
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              readOnly
              tabIndex={-1}
              rows={1}
              aria-hidden
              className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
            />

            {showGhostSortSlot ? (
              <div className="w-full overflow-hidden transition-all duration-300 ease-out">{eveningSortStatusBlock}</div>
            ) : null}
          </>
        )}

        {context === 'emergency' && !isGhostMode ? brainDumpMicBlock : null}
      </div>

      {showTypedSortButton ? (
        <button
          type="button"
          onClick={() => {
            textareaRef.current?.blur()
            onSortIntoReview?.()
          }}
          disabled={sortLoading || value.trim().length < 8 || proDistillLocked}
          title={
            proDistillLocked
              ? 'Brain Dump & AI Distillation is a Pro+ feature.'
              : value.trim().length < 8
                ? 'Add a few more words so Mrs. Deer can sort your dump.'
                : undefined
          }
          className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
            sortLoading || value.trim().length < 8 || proDistillLocked
              ? 'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
              : `border-white/35 ${PRO_BRAND_ACTION_ENABLED_SURFACE_CLASS} ${
                  value.trim().length >= 20 ? 'motion-safe:animate-pulse' : ''
                }`
          }`}
        >
          {context === 'emergency'
            ? 'Suggest headline &amp; severity'
            : 'Sort into reflection &amp; cards'}
        </button>
      ) : null}
    </section>
  )
}
