'use client'

import type { ChangeEvent } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Sparkles } from 'lucide-react'
import type { EmergencyTriageJson } from '@/lib/types/emergency-triage'
import { Button } from '@/components/ui/button'
import { colors } from '@/lib/design-tokens'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { useDebouncedAutoSave } from '@/lib/hooks/useDebouncedAutoSave'
import { getDynamicPlaceholder, getTacticalHint, parseContainmentSteps } from '@/lib/emergency-containment-prompt'

export function ActiveFireResolutionCard({
  emergencyId,
  fireDescription,
  triage,
  triageLoading,
  containmentPlan,
  containmentPlanCommittedAt,
  emergencyVoiceLocked,
  emergencyRefineLocked,
  onSaveContainmentPlan,
  onCommitPlan,
  onContained,
  containing,
  proTrialExpired = false,
}: {
  emergencyId: string
  fireDescription: string
  triage: EmergencyTriageJson | null
  triageLoading: boolean
  containmentPlan: string | null
  containmentPlanCommittedAt: string | null
  emergencyVoiceLocked: boolean
  /** Free tier: show Refine but route to pricing / explain Pro. */
  emergencyRefineLocked: boolean
  onSaveContainmentPlan: (text: string) => Promise<void>
  onCommitPlan: () => void | Promise<void>
  onContained: () => void
  containing: boolean
  /** Trial ended: preview triage + draft; seal / Clear Your Path require upgrade. */
  proTrialExpired?: boolean
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(containmentPlan ?? '')
  const draftRef = useRef(draft)
  draftRef.current = draft
  /** After any local edit, do not overwrite draft from parent (post-save refetch). */
  const userEditedRef = useRef(false)

  const committed = Boolean(containmentPlanCommittedAt)
  const [committing, setCommitting] = useState(false)
  const [refining, setRefining] = useState(false)
  const [checked, setChecked] = useState<boolean[]>([])

  useEffect(() => {
    userEditedRef.current = false
    setDraft(containmentPlan ?? '')
  }, [emergencyId])

  useEffect(() => {
    if (userEditedRef.current) return
    setDraft(containmentPlan ?? '')
  }, [containmentPlan])

  const handleDraftChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    userEditedRef.current = true
    setDraft(e.target.value)
  }, [])

  const persistDraft = useCallback(async () => {
    await onSaveContainmentPlan(draftRef.current)
  }, [onSaveContainmentPlan])

  const {
    schedule,
    flush,
    status: draftSaveStatus,
    setStatus: setDraftSaveStatus,
  } = useDebouncedAutoSave({
    debounceMs: 1500,
    save: persistDraft,
    enabled: Boolean(emergencyId) && !triageLoading,
  })

  useEffect(() => {
    schedule()
  }, [draft, schedule])

  useEffect(() => {
    if (draftSaveStatus !== 'saved') return
    const t = window.setTimeout(() => setDraftSaveStatus('idle'), 2000)
    return () => window.clearTimeout(t)
  }, [draftSaveStatus, setDraftSaveStatus])

  const flashlightQuestion = useMemo(
    () => getDynamicPlaceholder(triage?.strategy ?? null, fireDescription),
    [fireDescription, triage?.strategy]
  )

  const tacticalHint = useMemo(() => getTacticalHint(triage?.strategy ?? null), [triage?.strategy])

  const steps = useMemo(() => {
    const raw = parseContainmentSteps((draft || containmentPlan || '').trim())
    return raw.length > 0 ? raw : ['Follow the one safe step above']
  }, [draft, containmentPlan, committed])

  useEffect(() => {
    if (!committed) {
      setChecked([])
      return
    }
    setChecked(steps.map(() => false))
  }, [committed, emergencyId, steps])

  const allChecked =
    committed && steps.length > 0 && checked.length === steps.length && checked.every(Boolean)

  const handleCommit = async () => {
    if (proTrialExpired) {
      router.push('/pricing')
      return
    }
    const trimmed = draft.trim()
    if (!trimmed) return
    setCommitting(true)
    try {
      await flush()
      await onCommitPlan()
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message: err instanceof Error ? err.message : 'Could not complete commit. Try again.',
            type: 'error',
          },
        })
      )
    } finally {
      setCommitting(false)
    }
  }

  const toggleStep = (index: number) => {
    setChecked((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  const handleRefine = async () => {
    if (emergencyRefineLocked) {
      router.push('/pricing')
      return
    }
    const trimmed = draft.trim()
    if (!trimmed || committed || refining) return
    setRefining(true)
    try {
      const res = await fetch('/api/emergency/refine', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergencyId,
          containmentPlan: trimmed,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { refinedText?: string; error?: string; code?: string }
      if (!res.ok) {
        if (res.status === 403 || body.code === 'PRO_REQUIRED') {
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: { message: 'Refine is a Pro feature — upgrade to unlock.', type: 'error' },
            })
          )
          router.push('/pricing')
        } else {
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: { message: body.error || 'Could not refine your plan. Try again.', type: 'error' },
            })
          )
        }
        return
      }
      if (typeof body.refinedText === 'string' && body.refinedText.trim()) {
        userEditedRef.current = true
        setDraft(body.refinedText.trim())
        draftRef.current = body.refinedText.trim()
        await flush()
        window.dispatchEvent(
          new CustomEvent('toast', { detail: { message: 'Plan refined — review and commit when ready.', type: 'success' } })
        )
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent('toast', { detail: { message: 'Could not refine your plan. Try again.', type: 'error' } })
      )
    } finally {
      setRefining(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200/90 bg-white/90 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
      {proTrialExpired ? (
        <div
          className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100"
          role="status"
        >
          <span className="font-semibold">Preview mode.</span> Review triage and your draft below. Upgrade to seal the
          protocol and run Clear Your Path.
        </div>
      ) : null}
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
          aria-hidden
        >
          <Shield className="h-5 w-5 text-[#152b50] dark:text-sky-300/90" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">The Active Fire</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-gray-100">What you reported: </span>
            {fireDescription}
          </p>
        </div>
      </div>

      {triageLoading ? (
        <div className="space-y-3 rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-950/25">
          <div className="h-3 w-[75%] animate-pulse rounded bg-amber-200/80 dark:bg-amber-900/50" />
          <div className="h-3 w-full animate-pulse rounded bg-amber-200/60 dark:bg-amber-900/40" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-amber-200/60 dark:bg-amber-900/40" />
          <p className="text-xs text-amber-900/80 dark:text-amber-200/90">Mrs. Deer is drafting your first response…</p>
        </div>
      ) : triage ? (
        <div className="space-y-4 rounded-xl border border-amber-200/70 bg-white/90 p-4 dark:border-amber-800/50 dark:bg-gray-800/90">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/90 dark:text-amber-200/90">
              Mrs. Deer&apos;s advice
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-800 dark:text-gray-100">{triage.encouragement}</p>
          </div>
          <div
            className="rounded-lg border px-3 py-3"
            style={{ borderColor: colors.navy.DEFAULT, backgroundColor: 'rgba(21, 43, 80, 0.04)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#152b50] dark:text-sky-200/90">
              One safe step (~10 min)
            </p>
            <p className="mt-2 text-base font-medium leading-snug text-gray-900 dark:text-white">
              {triage.oneSafeStep}
            </p>
          </div>
          {triage.pausedNeedleMovers.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">On hold for now</p>
              <ul className="mt-2 list-inside list-disc text-sm text-gray-700 dark:text-gray-300">
                {triage.pausedNeedleMovers.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {triage.breathingPrompt ? (
            <p className="text-sm italic leading-relaxed text-gray-600 dark:text-gray-400">{triage.breathingPrompt}</p>
          ) : null}
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Strategy: <span className="font-medium capitalize text-gray-700 dark:text-gray-300">{triage.strategy}</span>{' '}
            (hold / pivot / drop)
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Triage will appear here once Mrs. Deer finishes analyzing your fire against today&apos;s plan.
        </p>
      )}

      {!triageLoading ? (
        <div className="mt-4 space-y-3 rounded-xl border border-[#152b50]/25 bg-white/80 p-4 dark:border-sky-900/40 dark:bg-gray-900/50">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="min-w-0 flex-1 text-sm leading-snug">
              <span className="font-semibold text-[#152b50] dark:text-sky-200/90">Mrs. Deer&apos;s question: </span>
              <span className="font-normal text-gray-800 dark:text-gray-100">{flashlightQuestion}</span>
            </p>
            {draftSaveStatus === 'syncing' ? (
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">Saving…</span>
            ) : null}
            {draftSaveStatus === 'saved' ? (
              <span className="shrink-0 text-xs text-emerald-600 dark:text-emerald-400">Draft saved</span>
            ) : null}
            {draftSaveStatus === 'error' ? (
              <span className="shrink-0 text-xs text-amber-600 dark:text-amber-400">Could not save</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-[#152b50]/30 text-[#152b50] hover:bg-[#152b50]/5 dark:border-sky-800/50 dark:text-sky-200"
              disabled={committed || refining || (!emergencyRefineLocked && !draft.trim())}
              title={
                emergencyRefineLocked
                  ? 'Pro feature — upgrade to refine your containment plan with Mrs. Deer'
                  : 'Polish your rough notes into a clear tactical list'
              }
              onClick={() => void handleRefine()}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {emergencyRefineLocked ? 'Refine with Mrs. Deer (Pro)' : 'Refine with Mrs. Deer'}
            </Button>
          </div>
          {refining ? (
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90" role="status">
              Mrs. Deer is structuring your response…
            </p>
          ) : null}
          <SpeechToTextInput
            as="textarea"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={committed}
            placeholder={tacticalHint}
            className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            hideSpeechButton={emergencyVoiceLocked}
          />
          {emergencyVoiceLocked ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Voice dictation is a Pro feature.</p>
          ) : null}

          {committed ? (
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/40 px-3 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/90 dark:text-amber-200/90">
                Your checklist
              </p>
              <ul className="mt-3 space-y-2">
                {steps.map((step, i) => (
                  <li key={`${i}-${step.slice(0, 24)}`} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id={`contain-step-${emergencyId}-${i}`}
                      checked={Boolean(checked[i])}
                      onChange={() => toggleStep(i)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-400 text-[#152b50] focus:ring-[#152b50]"
                    />
                    <label
                      htmlFor={`contain-step-${emergencyId}-${i}`}
                      className="cursor-pointer text-sm leading-snug text-gray-800 dark:text-gray-100"
                    >
                      {step}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {!committed ? (
        <Button
          type="button"
          className="mt-5 w-full font-semibold"
          style={{ backgroundColor: colors.navy.DEFAULT, color: '#fff' }}
          disabled={committing || refining || triageLoading || !draft.trim()}
          onClick={() => void handleCommit()}
        >
          {committing ? 'Saving…' : proTrialExpired ? 'Upgrade to seal protocol' : 'Commit to plan'}
        </Button>
      ) : (
        <Button
          type="button"
          className="mt-5 w-full font-semibold shadow-lg shadow-[#152b50]/30 transition-shadow hover:shadow-xl hover:shadow-[#152b50]/40 focus-visible:ring-2 focus-visible:ring-[#152b50] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          style={{ backgroundColor: colors.navy.DEFAULT, color: '#fff' }}
          disabled={containing || (!proTrialExpired && !allChecked)}
          onClick={() => {
            if (proTrialExpired) {
              router.push('/pricing')
              return
            }
            onContained()
          }}
        >
          {containing ? 'Saving…' : proTrialExpired ? 'Upgrade to mark resolved' : 'Mark resolved'}
        </Button>
      )}
    </div>
  )
}
