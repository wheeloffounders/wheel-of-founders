'use client'

import { useState, useEffect } from 'react'
import { MapPin, Trash2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'
import { getClientAuthHeaders } from '@/lib/api/fetch-json'
import type { EmergencyTriageJson } from '@/lib/types/emergency-triage'
import { previewEmergencyTriageLine } from '@/lib/emergency-triage-preview'

type Severity = 'hot' | 'warm' | 'contained'

interface EmergencyCardProps {
  emergency: {
    id: string
    description: string
    severity: Severity
    notes: string | null
    resolved: boolean
    created_at: string
    updated_at?: string | null
    fire_date?: string
    triage_json?: EmergencyTriageJson | null
    lesson_learned_raw?: string | null
    lesson_insight_text?: string | null
    lesson_saved_at?: string | null
    location?: string | null
  }
  onDelete: (id: string) => void
  onToggleResolved: (id: string, resolved: boolean) => void
  /** When user reopens a resolved fire (restore tasks + active resolution). */
  onReopenFire?: (id: string, reason: 'flare' | 'tweak') => void | Promise<void>
  severityOptions: { value: Severity; label: string; emoji: string }[]
  /** Brief highlight when user lands from Insights deep link */
  deepLinkFlash?: boolean
}

export function EmergencyCard({
  emergency,
  onDelete,
  onToggleResolved,
  onReopenFire,
  severityOptions,
  deepLinkFlash = false,
}: EmergencyCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [lessonOpen, setLessonOpen] = useState(false)
  const [lessonDraft, setLessonDraft] = useState('')
  const [lessonSaving, setLessonSaving] = useState(false)
  const [mrsDeerFollowUp, setMrsDeerFollowUp] = useState<string | null>(null)
  const [deepLinkOverlay, setDeepLinkOverlay] = useState(false)

  useEffect(() => {
    if (!deepLinkFlash) return
    setDeepLinkOverlay(true)
    const t = window.setTimeout(() => setDeepLinkOverlay(false), 1400)
    return () => window.clearTimeout(t)
  }, [deepLinkFlash])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const { data: { session } } = await import('@/lib/supabase').then((m) => m.supabase.auth.getSession())
      const headers: Record<string, string> = {}
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/emergency/${emergency.id}`, {
        method: 'DELETE',
        headers,
      })

      if (response.ok) {
        onDelete(emergency.id)
      } else {
        console.error('Failed to delete emergency')
      }
    } catch (error) {
      console.error('Error deleting emergency:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const confirmReopen = async (reason: 'flare' | 'tweak') => {
    if (!onReopenFire) return
    setReopening(true)
    try {
      await onReopenFire(emergency.id, reason)
      setReopenOpen(false)
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message: e instanceof Error ? e.message : 'Could not reopen fire.',
            type: 'error',
          },
        })
      )
    } finally {
      setReopening(false)
    }
  }

  const saveLesson = async () => {
    const t = lessonDraft.trim()
    if (!t) return
    setLessonSaving(true)
    try {
      const headers = await getClientAuthHeaders()
      const res = await fetch('/api/emergency/lesson-learned', {
        method: 'POST',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyId: emergency.id, rawLesson: t }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        insight?: string
        reflectionQuestion?: string
      }
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not save lesson')
      if (typeof body.reflectionQuestion === 'string' && body.reflectionQuestion.trim()) {
        setMrsDeerFollowUp(body.reflectionQuestion.trim())
      }
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message: 'Saved — your words lead; Mrs. Deer added a gentle nudge. Also in Insights.',
            type: 'success',
          },
        })
      )
      setLessonOpen(false)
      setLessonDraft('')
      window.dispatchEvent(new CustomEvent('emergency-lesson-saved', { detail: { id: emergency.id, insight: body.insight } }))
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message: e instanceof Error ? e.message : 'Could not save lesson.',
            type: 'error',
          },
        })
      )
    } finally {
      setLessonSaving(false)
    }
  }

  const severityOption = severityOptions.find((s) => s.value === emergency.severity)
  const triagePreview = previewEmergencyTriageLine(emergency.triage_json ?? null)
  const resolvedAt = emergency.updated_at || emergency.created_at
  const resolvedLabel = emergency.resolved
    ? format(new Date(resolvedAt), 'h:mm a')
    : format(new Date(emergency.created_at), 'h:mm a')

  return (
    <>
      <li
        id={`emergency-fire-${emergency.id}`}
        className={`relative overflow-hidden rounded-lg border p-4 ${
          emergency.resolved
            ? 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            : 'border-amber-200 bg-[#f8f4f0] dark:border-amber-700 dark:bg-amber-900/20'
        }`}
      >
        {deepLinkOverlay ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-amber-100/85 dark:bg-amber-950/45"
            style={{ animation: 'emergency-deep-link-flash 1.35s ease-out forwards' }}
            aria-hidden
          />
        ) : null}
        <div className="relative z-0 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {emergency.resolved ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Resolved
                </span>
              ) : (
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    emergency.severity === 'hot'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : emergency.severity === 'warm'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  }`}
                >
                  {severityOption?.emoji} {emergency.severity}
                </span>
              )}
              <span className="text-xs text-gray-600 dark:text-gray-400">{resolvedLabel}</span>
              {emergency.location?.trim() ? (
                <span className="inline-flex max-w-full items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                  <span className="truncate">{emergency.location.trim()}</span>
                </span>
              ) : null}
            </div>
            {emergency.resolved ? (
              <p className="text-sm leading-relaxed text-gray-900 opacity-50 dark:text-gray-100">{emergency.description}</p>
            ) : (
              <p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100">{emergency.description}</p>
            )}
            {emergency.resolved ? (
              <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-300/90">
                Contained by Mrs. Deer · {format(new Date(resolvedAt), 'h:mm a')}
              </p>
            ) : null}
            {emergency.notes && (
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{emergency.notes}</p>
            )}
            {triagePreview ? (
              <div
                className="mt-2 rounded-md border border-emerald-200/70 bg-emerald-50/60 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/25"
                role="note"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-800/80 dark:text-emerald-400/90">
                  Mrs. Deer · triage
                </p>
                <p className="mt-1 text-xs italic leading-snug text-emerald-900/90 dark:text-emerald-100/90">
                  {triagePreview}
                </p>
              </div>
            ) : null}
            {emergency.resolved && emergency.lesson_insight_text ? (
              <div className="mt-3 rounded-md border border-emerald-200/60 bg-white/60 px-3 py-2 dark:border-emerald-900/50 dark:bg-gray-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Lesson saved</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-800 dark:text-gray-200">{emergency.lesson_insight_text}</p>
              </div>
            ) : null}
            {emergency.resolved && mrsDeerFollowUp ? (
              <p className="mt-2 rounded-md border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm italic leading-relaxed text-slate-700 dark:border-slate-600/60 dark:bg-slate-900/30 dark:text-slate-200">
                <span className="font-medium not-italic text-slate-800 dark:text-slate-100">Mrs. Deer · </span>
                {mrsDeerFollowUp}
              </p>
            ) : null}
            {emergency.resolved && !emergency.lesson_insight_text ? (
              <div className="mt-3">
                {!lessonOpen ? (
                  <button
                    type="button"
                    onClick={() => setLessonOpen(true)}
                    className="text-sm font-medium text-[#152b50] underline-offset-2 hover:underline dark:text-sky-300"
                  >
                    Add lesson learned
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      What will you do differently next time?
                    </label>
                    <textarea
                      value={lessonDraft}
                      onChange={(e) => setLessonDraft(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      placeholder="e.g. Don’t panic first — one slow breath before I touch the keyboard."
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={lessonSaving || !lessonDraft.trim()}
                        onClick={() => void saveLesson()}
                        className="rounded-lg bg-[#152b50] px-3 py-1.5 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50 dark:bg-sky-900"
                      >
                        {lessonSaving ? 'Saving…' : 'Save as insight'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLessonOpen(false)
                          setLessonDraft('')
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {emergency.resolved ? (
              <button
                type="button"
                onClick={() => setReopenOpen(true)}
                disabled={reopening || !onReopenFire}
                className="rounded px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Reopen
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onToggleResolved(emergency.id, true)}
                className="rounded bg-green-100 px-2 py-1 text-sm font-medium text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-800/40"
              >
                Resolved
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="p-2 text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
              aria-label="Delete emergency"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </li>

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Emergency"
        message="Are you sure you want to delete this emergency? This action cannot be undone."
      />

      {reopenOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reopen-fire-title"
          >
            <h3 id="reopen-fire-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Reopen this fire?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Did the fire flare back up, or do you just need to tweak the plan? We&apos;ll pull any tasks that were
              parked on tomorrow back to today so you can focus here again.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                disabled={reopening}
                onClick={() => void confirmReopen('flare')}
                className="w-full rounded-lg bg-[#152b50] py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 dark:bg-sky-900"
              >
                {reopening ? 'Working…' : 'It flared back up'}
              </button>
              <button
                type="button"
                disabled={reopening}
                onClick={() => void confirmReopen('tweak')}
                className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50"
              >
                Just tweaking the plan
              </button>
              <button
                type="button"
                disabled={reopening}
                onClick={() => setReopenOpen(false)}
                className="mt-1 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
