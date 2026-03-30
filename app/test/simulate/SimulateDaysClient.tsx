'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { BadgeUnlockFlow } from '@/components/badges/BadgeUnlockFlow'
import { FirstGlimpseModal } from '@/components/evening/FirstGlimpseModal'
import { FeatureUnlockQueueModal } from '@/components/founder-dna/FeatureUnlockQueueModal'
import { FOUNDER_DNA_FEATURE_META } from '@/lib/founder-dna/feature-links'
import type { JourneyBadge, WhatsNewItem } from '@/lib/types/founder-dna'

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function resolveTestRecipient(override: string, previewTo: string): string {
  const t = override.trim()
  if (t && SIMPLE_EMAIL_RE.test(t)) return t
  return previewTo.trim()
}

type EmailPreview = {
  type: string
  to: string
  subject: string
  bodyPreview: string
  fullHtml: string
  triggeredAt: string
}

type SimulateMilestoneDebugPayload = {
  notes: string[]
  /** Same as journeyNewlyUnlockedFeatures.map(f => f.name) — drives feature unlock modals */
  newlyUnlockedFeatureNames?: string[]
  journeyNewlyUnlockedBadges: Array<{
    id: string
    name: string
    label: string
    category: string | null
    description?: string
    unlocked_at: string
  }>
  journeyNewlyUnlockedFeatures: JourneyBadge[]
  recentMilestonesFromUnlocks: {
    hasMilestone: boolean
    badges: Array<{ unlock_name: string; unlocked_at: string }>
    count: number
  }
  milestoneCardData: {
    badgeNames: string[]
    userData: { currentStreak?: number | null }
    count: number
    isMultiple: boolean
    multiBadgeMessage: string | null
    singleBadgeMessage: string | null
    achievements: string[]
  }
  journeyEvalBadgeNames: string[]
  rawJourneyBadgeObjects: JourneyBadge[]
}

type SimulateResponse = {
  success: boolean
  daysCreated: number
  daysSkipped: number
  badgesUnlocked: string[]
  featuresUnlocked: string[]
  journeyNewlyUnlockedBadges?: JourneyBadge[]
  journeyNewlyUnlockedFeatures?: JourneyBadge[]
  /** Journey `daysWithEntries` after evaluation (for unlock modal copy) */
  daysWithEntries?: number | null
  emailPreviews: EmailPreview[]
  errors: string[]
  debug?: SimulateMilestoneDebugPayload
}

type CreateTestUsersResponse = {
  success: boolean
  usersRequested: number
  usersCreated: number
  daysRequested: number
  users: Array<{ id: string; email: string; daysWithEntries: number }>
  errors: string[]
  error?: string
}

type DeleteTestUsersResponse = {
  success: boolean
  usersMatched: number
  usersDeleted: number
  errors: string[]
  error?: string
}

type TriggerCronKind = 'weekly' | 'monthly' | 'quarterly'

type TriggerCronResponse = {
  success?: boolean
  error?: string
  reason?: string
  processingTimeMs?: number
  batchProcessed?: number
  eligibleCount?: number
  remaining?: number
  [key: string]: unknown
}

/** Matches GET /api/test/simulate-status */
type SimulateCurrentStatus = {
  daysWithMorningTasksAndEvening: number
  morningTasksCount: number
  eveningReviewsCount: number
  currentStreak: number | null
  badgeCount: number
  recentBadges: Array<{ name: string; label: string; unlocked_at: string; icon?: string }>
  featuresUnlocked: Array<{ name: string; title: string; icon: string }>
  lastEntryDate: string | null
}

function achievementLineHint(line: string): string | null {
  if (!line.includes(' — ')) return '⚠️ expected "Label — meaning" format'
  return null
}

function featureRowsToWhatsNewItems(rows: JourneyBadge[]): WhatsNewItem[] {
  return rows.map((f) => {
    const meta = FOUNDER_DNA_FEATURE_META[f.name]
    if (meta) {
      return {
        type: 'feature' as const,
        id: `feature-${f.name}`,
        title: `Unlocked: ${meta.title}`,
        description: meta.description,
        icon: meta.icon,
        link: meta.link,
        createdAt: f.unlocked_at || new Date().toISOString(),
      }
    }
    return {
      type: 'feature' as const,
      id: `feature-${f.name}`,
      title: `Unlocked: ${f.label}`,
      description: f.description,
      icon: f.icon,
      link: '/founder-dna/journey',
      createdAt: f.unlocked_at || new Date().toISOString(),
    }
  })
}

export function SimulateDaysClient() {
  const [status, setStatus] = useState<SimulateCurrentStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusCopied, setStatusCopied] = useState(false)
  const [debugCopied, setDebugCopied] = useState(false)
  const [numDays, setNumDays] = useState(45)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [overwrite, setOverwrite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [result, setResult] = useState<SimulateResponse | null>(null)
  const [preview, setPreview] = useState<EmailPreview | null>(null)
  const [emailTestAddress, setEmailTestAddress] = useState('')
  const [sendTestLoading, setSendTestLoading] = useState(false)
  const [celebrationBadges, setCelebrationBadges] = useState<JourneyBadge[]>([])
  const [featureUnlockModalOpen, setFeatureUnlockModalOpen] = useState(false)
  const [featureUnlockItems, setFeatureUnlockItems] = useState<WhatsNewItem[]>([])
  const [simulateFirstGlimpseOpen, setSimulateFirstGlimpseOpen] = useState(false)
  const [pendingFeatureWhatsNew, setPendingFeatureWhatsNew] = useState<WhatsNewItem[]>([])
  const [unlockModalDaysWithEntries, setUnlockModalDaysWithEntries] = useState(0)
  const [loadUserCount, setLoadUserCount] = useState(10)
  const [loadUserDays, setLoadUserDays] = useState(15)
  const [loadCreating, setLoadCreating] = useState(false)
  const [loadDeleting, setLoadDeleting] = useState(false)
  const [loadResult, setLoadResult] = useState<string | null>(null)
  const [runningCron, setRunningCron] = useState<TriggerCronKind | null>(null)
  const [cronResult, setCronResult] = useState<TriggerCronResponse | null>(null)

  const fetchSimulateStatus = useCallback(async () => {
    setStatusLoading(true)
    setStatusError(null)
    try {
      const res = await fetch('/api/test/simulate-status', { credentials: 'include' })
      const json = (await res.json()) as SimulateCurrentStatus & { error?: string }
      if (!res.ok) {
        setStatus(null)
        setStatusError(json.error || `HTTP ${res.status}`)
        return
      }
      setStatus(json)
    } catch (e) {
      setStatus(null)
      setStatusError(e instanceof Error ? e.message : 'Failed to load status')
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSimulateStatus()
  }, [fetchSimulateStatus])

  useEffect(() => {
    const onSync = () => void fetchSimulateStatus()
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [fetchSimulateStatus])

  const copyCurrentStatus = useCallback(() => {
    if (!status) return
    const badgeLines =
      status.recentBadges.length === 0
        ? ['  (none)']
        : status.recentBadges.map(
            (b) => `  - ${b.icon ? `${b.icon} ` : ''}${b.label} (${b.unlocked_at.slice(0, 10)})`
          )
    const featureLines =
      status.featuresUnlocked.length === 0
        ? ['  (none)']
        : status.featuresUnlocked.map((f) => `  - ${f.icon} ${f.title} (${f.name})`)
    const text = [
      'Current status (simulate page)',
      '',
      `Days with morning + evening: ${status.daysWithMorningTasksAndEvening}`,
      `Morning tasks (rows): ${status.morningTasksCount}`,
      `Evening reviews (rows): ${status.eveningReviewsCount}`,
      `Current streak: ${status.currentStreak ?? '—'}`,
      `Last entry date: ${status.lastEntryDate ?? '—'}`,
      '',
      `Badges unlocked: ${status.badgeCount}`,
      ...badgeLines,
      '',
      `Features unlocked: ${status.featuresUnlocked.length}`,
      ...featureLines,
    ].join('\n')
    void navigator.clipboard.writeText(text)
    setStatusCopied(true)
    window.setTimeout(() => setStatusCopied(false), 2000)
  }, [status])

  const runSimulate = useCallback(async () => {
    setLoading(true)
    setResult(null)
    setCelebrationBadges([])
    setFeatureUnlockModalOpen(false)
    setFeatureUnlockItems([])
    setSimulateFirstGlimpseOpen(false)
    setPendingFeatureWhatsNew([])
    try {
      const res = await fetch('/api/test/simulate-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          numDays,
          startDate,
          overwrite,
        }),
      })
      const json = (await res.json()) as SimulateResponse & { error?: string }
      if (!res.ok) {
        setResult({
          success: false,
          daysCreated: 0,
          daysSkipped: 0,
          badgesUnlocked: [],
          featuresUnlocked: [],
          journeyNewlyUnlockedBadges: [],
          journeyNewlyUnlockedFeatures: [],
          emailPreviews: [],
          errors: [json.error || `HTTP ${res.status}`],
        })
        return
      }
      setResult(json)
      if (typeof json.daysWithEntries === 'number' && Number.isFinite(json.daysWithEntries)) {
        setUnlockModalDaysWithEntries(Math.max(0, json.daysWithEntries))
      }
    } catch (e) {
      setResult({
        success: false,
        daysCreated: 0,
        daysSkipped: 0,
        badgesUnlocked: [],
        featuresUnlocked: [],
        journeyNewlyUnlockedBadges: [],
        journeyNewlyUnlockedFeatures: [],
        emailPreviews: [],
        errors: [e instanceof Error ? e.message : 'Request failed'],
      })
    } finally {
      setLoading(false)
    }
  }, [numDays, startDate, overwrite])

  const runClear = useCallback(async () => {
    if (
      !window.confirm(
        'Delete all test_simulation morning/evening rows (and matching decisions)?\n\nIf you have no real morning tasks or evening reviews left after this, your Founder DNA unlocks (user_unlocks + profile badges/features) and current_streak will also be reset so you can re-test thresholds from scratch.'
      )
    ) {
      return
    }
    setClearing(true)
    try {
      const res = await fetch('/api/test/clear-simulated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!json.success) {
        alert(json.error || 'Failed')
        return
      }
      const resetNote =
        json.resetUnlocks === true
          ? `\n\nReset unlocks: removed ${json.deletedUserUnlocks ?? 0} user_unlocks row(s); cleared profile badges & features; streak → 0.`
          : '\n\nUnlocks unchanged (you still have real morning/evening data).'
      alert(
        `Cleared: tasks ${json.deletedTasks}, reviews ${json.deletedReviews}, commits ${json.deletedCommits}, decisions ${json.deletedDecisions}.${resetNote}`
      )
      window.dispatchEvent(new CustomEvent('data-sync-request'))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setClearing(false)
    }
  }, [])

  const runCreateTestUsers = useCallback(async () => {
    setLoadCreating(true)
    setLoadResult(null)
    try {
      const res = await fetch('/api/test/create-test-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          count: Math.min(100, Math.max(1, Math.floor(loadUserCount))),
          daysWithEntries: Math.min(45, Math.max(1, Math.floor(loadUserDays))),
        }),
      })
      const json = (await res.json()) as CreateTestUsersResponse
      if (!res.ok || !json.success) {
        setLoadResult(`Failed: ${json.error || `HTTP ${res.status}`}`)
        return
      }
      setLoadResult(
        `Created ${json.usersCreated}/${json.usersRequested} test users with up to ${json.daysRequested} days each.${
          json.errors.length ? ` Errors: ${json.errors.length}` : ''
        }`
      )
      window.dispatchEvent(new CustomEvent('data-sync-request'))
    } catch (e) {
      setLoadResult(e instanceof Error ? e.message : 'Failed to create test users')
    } finally {
      setLoadCreating(false)
    }
  }, [loadUserCount, loadUserDays])

  const runDeleteTestUsers = useCallback(async () => {
    if (!window.confirm('Delete all test_user_*@example.com users and their generated data?')) return
    setLoadDeleting(true)
    setLoadResult(null)
    try {
      const res = await fetch('/api/test/delete-test-users', {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = (await res.json()) as DeleteTestUsersResponse
      if (!res.ok || !json.success) {
        setLoadResult(`Failed: ${json.error || `HTTP ${res.status}`}`)
        return
      }
      setLoadResult(
        `Deleted ${json.usersDeleted}/${json.usersMatched} test users.${
          json.errors.length ? ` Errors: ${json.errors.length}` : ''
        }`
      )
      window.dispatchEvent(new CustomEvent('data-sync-request'))
    } catch (e) {
      setLoadResult(e instanceof Error ? e.message : 'Failed to delete test users')
    } finally {
      setLoadDeleting(false)
    }
  }, [])

  const runCronNow = useCallback(async (cron: TriggerCronKind) => {
    setRunningCron(cron)
    setCronResult(null)
    try {
      const res = await fetch('/api/test/trigger-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cron }),
      })
      const json = (await res.json()) as TriggerCronResponse
      if (!res.ok) {
        setCronResult({
          success: false,
          error: json.error || `HTTP ${res.status}`,
          cron,
        })
        return
      }
      setCronResult(json)
      window.dispatchEvent(new CustomEvent('data-sync-request'))
    } catch (e) {
      setCronResult({
        success: false,
        error: e instanceof Error ? e.message : 'Failed to run cron',
        cron,
      })
    } finally {
      setRunningCron(null)
    }
  }, [])

  const copyHtml = useCallback(() => {
    if (!preview?.fullHtml) return
    void navigator.clipboard.writeText(preview.fullHtml)
  }, [preview])

  const copyDebugPayload = useCallback(() => {
    if (!result?.debug) return
    void navigator.clipboard.writeText(JSON.stringify(result.debug, null, 2))
    setDebugCopied(true)
    window.setTimeout(() => setDebugCopied(false), 2000)
  }, [result])

  const effectivePreviewRecipient = useMemo(
    () => (preview ? resolveTestRecipient(emailTestAddress, preview.to) : ''),
    [preview, emailTestAddress]
  )

  const sendTestEmail = useCallback(async () => {
    if (!preview) return
    const effectiveTo = resolveTestRecipient(emailTestAddress, preview.to)
    if (!SIMPLE_EMAIL_RE.test(effectiveTo)) {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message:
              'No valid recipient. Enter a test address above or use a preview whose “To” is a real email (profile email).',
            type: 'error',
          },
        })
      )
      return
    }
    if (
      !window.confirm(
        `This will send a real email to ${effectiveTo} using your transactional provider (Resend / MailerSend). Continue?`
      )
    ) {
      return
    }
    setSendTestLoading(true)
    try {
      const res = await fetch('/api/test/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: preview.subject,
          fullHtml: preview.fullHtml,
          defaultTo: preview.to,
          toOverride: emailTestAddress.trim() || undefined,
          emailType: preview.type,
        }),
      })
      const json = (await res.json()) as { success?: boolean; error?: string; to?: string; messageId?: string }
      if (!res.ok || !json.success) {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: json.error || `Send failed (${res.status})`, type: 'error' },
          })
        )
        return
      }
      console.log('[send-test-email client]', { to: json.to, emailType: preview.type, messageId: json.messageId })
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: `Test email sent to ${json.to ?? effectiveTo}`, type: 'success' },
        })
      )
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: e instanceof Error ? e.message : 'Send failed', type: 'error' },
        })
      )
    } finally {
      setSendTestLoading(false)
    }
  }, [preview, emailTestAddress])

  useEffect(() => {
    if (!result?.success) return
    window.dispatchEvent(new CustomEvent('data-sync-request'))
    const jb = result.journeyNewlyUnlockedBadges ?? []
    const jf = result.journeyNewlyUnlockedFeatures ?? []
    setCelebrationBadges(jb)
    const hasFirstGlimpse = jf.some((f) => f.name === 'first_glimpse')
    const otherFeatures = jf.filter((f) => f.name !== 'first_glimpse')
    if (hasFirstGlimpse) {
      setSimulateFirstGlimpseOpen(true)
      if (otherFeatures.length > 0) {
        setPendingFeatureWhatsNew(featureRowsToWhatsNewItems(otherFeatures))
      }
    } else if (otherFeatures.length > 0) {
      setFeatureUnlockItems(featureRowsToWhatsNewItems(otherFeatures))
      setFeatureUnlockModalOpen(true)
    }
  }, [result])

  const closeSimulateFirstGlimpse = useCallback(() => {
    setSimulateFirstGlimpseOpen(false)
    if (pendingFeatureWhatsNew.length > 0) {
      setFeatureUnlockItems(pendingFeatureWhatsNew)
      setFeatureUnlockModalOpen(true)
      setPendingFeatureWhatsNew([])
    }
  }, [pendingFeatureWhatsNew])

  return (
    <>
      <div className="border-2 border-slate-400/60 dark:border-slate-500/50 bg-white dark:bg-gray-900 p-6 space-y-4 mb-6" style={{ borderRadius: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Current status</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!status}
              onClick={() => copyCurrentStatus()}
              className="inline-flex items-center justify-center p-1.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-700 dark:text-slate-200"
              style={{ borderRadius: 0 }}
              aria-label={statusCopied ? 'Copied' : 'Copy status to clipboard'}
              title={statusCopied ? 'Copied' : 'Copy status'}
            >
              {statusCopied ? <Check className="size-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="size-4" />}
            </button>
            <button
              type="button"
              disabled={statusLoading}
              onClick={() => void fetchSimulateStatus()}
              className="text-xs font-medium px-2 py-1 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {statusLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
        {statusError ? (
          <p className="text-sm text-red-700 dark:text-red-300">{statusError}</p>
        ) : statusLoading && !status ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
        ) : status ? (
          <div className="space-y-4 text-sm text-gray-800 dark:text-gray-200">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div className="border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-950/40" style={{ borderRadius: 0 }}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Days with morning + evening
                </dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {status.daysWithMorningTasksAndEvening}
                </dd>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Calendar days with at least one morning task and one evening review
                </p>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-950/40" style={{ borderRadius: 0 }}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Current streak
                </dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {status.currentStreak ?? '—'}
                </dd>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">From user_profiles.current_streak</p>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-950/40" style={{ borderRadius: 0 }}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Morning tasks (rows)
                </dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">{status.morningTasksCount}</dd>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-950/40" style={{ borderRadius: 0 }}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Evening reviews (rows)
                </dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">{status.eveningReviewsCount}</dd>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-950/40 sm:col-span-2" style={{ borderRadius: 0 }}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Last entry date
                </dt>
                <dd className="mt-1 font-mono text-base">{status.lastEntryDate ?? '—'}</dd>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Latest plan_date (tasks) or review_date (evening), whichever is newer
                </p>
              </div>
            </dl>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Badges unlocked ({status.badgeCount})
              </h3>
              {status.recentBadges.length === 0 ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">None yet</p>
              ) : (
                <ul className="space-y-1.5 text-sm border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-950/30" style={{ borderRadius: 0 }}>
                  {status.recentBadges.map((b) => (
                    <li key={`${b.name}-${b.unlocked_at}`} className="flex flex-wrap gap-x-2 gap-y-0.5">
                      <span className="shrink-0">{b.icon ? `${b.icon} ` : ''}</span>
                      <span className="font-medium">{b.label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{b.unlocked_at.slice(0, 10)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {status.badgeCount > status.recentBadges.length ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Showing {status.recentBadges.length} most recent by unlock time
                </p>
              ) : null}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Features unlocked ({status.featuresUnlocked.length})
              </h3>
              {status.featuresUnlocked.length === 0 ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">None yet</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {status.featuresUnlocked.map((f) => (
                    <li
                      key={f.name}
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60"
                      style={{ borderRadius: 0 }}
                      title={f.name}
                    >
                      <span>{f.icon}</span>
                      <span className="font-medium">{f.title}</span>
                      <span className="text-slate-400 dark:text-slate-500 font-mono">({f.name})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-2 border-amber-600/50 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/40 p-6 space-y-4" style={{ borderRadius: 0 }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">🧪 Simulate days (development only)</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Creates <strong>real</strong> rows in <code className="text-xs">morning_tasks</code>,{' '}
          <code className="text-xs">morning_plan_commits</code>, <code className="text-xs">morning_decisions</code>, and{' '}
          <code className="text-xs">evening_reviews</code> with <code className="text-xs">source=test_simulation</code>. Then calls{' '}
          <code className="text-xs">loadFounderJourneyPayload()</code> (same logic as{' '}
          <code className="text-xs">/api/founder-dna/journey</code>) so unlocks persist like production. Badge confetti and the feature
          First Glimpse opens the personalized <code className="text-xs">FirstGlimpseModal</code>; other feature unlocks use the
          &quot;What&apos;s New&quot; modal. Retention emails are{' '}
          <strong>captured</strong> (not sent) when this request runs with the email capture stack active.
        </p>
        <p className="text-sm text-red-800 dark:text-red-200">
          Run migration <code className="text-xs">113_test_simulation_source_columns.sql</code> before using. Journey-triggered retention
          emails are intercepted in development (no send) while the simulate request runs;{' '}
          <code className="text-xs">EMAIL_RETENTION_V1</code> only affects real sends outside that capture window.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Days to simulate (1–100)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={numDays}
              onChange={(e) => setNumDays(Number(e.target.value))}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              style={{ borderRadius: 0 }}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">End date (newest simulated day)</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              style={{ borderRadius: 0 }}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
          Overwrite existing entries for each simulated day (delete tasks, commits, decisions, evening for that date first)
        </label>

        <label className="block text-sm">
          <span className="font-medium">Test send override (optional)</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="Leave blank to use each preview’s “To” address"
            value={emailTestAddress}
            onChange={(e) => setEmailTestAddress(e.target.value)}
            className="mt-1 w-full max-w-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            style={{ borderRadius: 0 }}
          />
          <span className="block mt-1 text-xs text-gray-600 dark:text-gray-400">
            Used by “Send test email” in the preview modal. Requires a configured transactional API key.
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void runSimulate()}
            className="px-4 py-2.5 text-sm font-medium text-white bg-[#152b50] hover:opacity-90 disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {loading ? 'Running…' : '▶ Simulate days'}
          </button>
          <button
            type="button"
            disabled={clearing}
            onClick={() => void runClear()}
            className="px-4 py-2.5 text-sm font-medium border-2 border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {clearing ? '…' : '🗑 Clear simulated entries'}
          </button>
        </div>
      </div>

      <div className="mt-6 border-2 border-blue-500/40 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-500/30 p-6 space-y-4" style={{ borderRadius: 0 }}>
        <h2 className="text-lg font-semibold">👥 Load test: create test users</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Creates users with <code className="text-xs">test_user_*@example.com</code> emails and simulated morning/evening rows for cron load testing.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Number of users (1-100)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={loadUserCount}
              onChange={(e) => setLoadUserCount(Number(e.target.value))}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              style={{ borderRadius: 0 }}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Days with entries (1-45)</span>
            <input
              type="number"
              min={1}
              max={45}
              value={loadUserDays}
              onChange={(e) => setLoadUserDays(Number(e.target.value))}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              style={{ borderRadius: 0 }}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loadCreating}
            onClick={() => void runCreateTestUsers()}
            className="px-4 py-2.5 text-sm font-medium text-white bg-[#152b50] hover:opacity-90 disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {loadCreating ? 'Creating…' : '👥 Create test users'}
          </button>
          <button
            type="button"
            disabled={loadDeleting}
            onClick={() => void runDeleteTestUsers()}
            className="px-4 py-2.5 text-sm font-medium border-2 border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {loadDeleting ? 'Deleting…' : '🗑 Delete test users'}
          </button>
        </div>
        {loadResult ? (
          <p className="text-sm text-gray-800 dark:text-gray-200">
            {loadResult}
          </p>
        ) : null}
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Dev only. Cleanup removes matching test users and their generated rows.
        </p>
        <div className="pt-3 border-t border-blue-200/80 dark:border-blue-700/40">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Run cron now</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={runningCron !== null}
              onClick={() => void runCronNow('weekly')}
              className="px-3 py-2 text-xs font-medium text-white bg-[#152b50] hover:opacity-90 disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {runningCron === 'weekly' ? 'Running weekly…' : '▶ Run Weekly Cron'}
            </button>
            <button
              type="button"
              disabled={runningCron !== null}
              onClick={() => void runCronNow('monthly')}
              className="px-3 py-2 text-xs font-medium text-white bg-[#152b50] hover:opacity-90 disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {runningCron === 'monthly' ? 'Running monthly…' : '▶ Run Monthly Cron'}
            </button>
            <button
              type="button"
              disabled={runningCron !== null}
              onClick={() => void runCronNow('quarterly')}
              className="px-3 py-2 text-xs font-medium text-white bg-[#152b50] hover:opacity-90 disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {runningCron === 'quarterly' ? 'Running quarterly…' : '▶ Run Quarterly Cron'}
            </button>
          </div>
          {cronResult ? (
            <pre
              className="mt-3 text-xs overflow-auto max-h-52 border border-blue-200 dark:border-blue-800 bg-white/70 dark:bg-black/20 p-2"
              style={{ borderRadius: 0 }}
            >
              {JSON.stringify(cronResult, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>

      {result ? (
        <div className="mt-8 space-y-6 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-lg font-semibold">Results</h2>
          <p className="text-sm">
            {result.success ? '✅' : '⚠️'} Created <strong>{result.daysCreated}</strong> days · Skipped{' '}
            <strong>{result.daysSkipped}</strong> (already had evening review)
          </p>
          {result.errors.length > 0 ? (
            <ul className="text-sm text-red-700 dark:text-red-300 list-disc pl-5 space-y-1">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          ) : null}

          {result.debug ? (
            <details className="rounded-lg border border-violet-200 dark:border-violet-900/60 bg-violet-50/90 dark:bg-violet-950/25 p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-violet-900 dark:text-violet-100">
                🔍 Debug: Milestone card data
              </summary>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => copyDebugPayload()}
                  className="text-xs font-medium px-2 py-1 border border-violet-400 dark:border-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                  style={{ borderRadius: 0 }}
                >
                  {debugCopied ? 'Copied' : 'Copy debug JSON'}
                </button>
              </div>
              <div className="mt-4 space-y-4 text-violet-950 dark:text-violet-100/90">
                {result.debug.notes?.length ? (
                  <ul className="list-disc pl-5 text-xs text-violet-800 dark:text-violet-200/90 space-y-1">
                    {result.debug.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                ) : null}

                <div>
                  <p className="font-medium text-violet-900 dark:text-violet-100 mb-1">Journey evaluation — badge names (this run)</p>
                  <p className="text-xs font-mono break-all">
                    {result.debug.journeyEvalBadgeNames.length
                      ? result.debug.journeyEvalBadgeNames.join(', ')
                      : '(none)'}
                  </p>
                </div>

                <div>
                  <p className="font-medium text-violet-900 dark:text-violet-100 mb-1">Badges unlocked (journey payload, normalized)</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.debug.journeyNewlyUnlockedBadges.length ? (
                      result.debug.journeyNewlyUnlockedBadges.map((b) => (
                        <li key={b.id}>
                          {b.label} <span className="text-violet-700 dark:text-violet-300">({b.category ?? 'no category'})</span>
                          {b.description ? <span className="block text-xs opacity-90 mt-0.5">{b.description}</span> : null}
                          <span className="block text-xs font-mono opacity-80">unlocked_at: {b.unlocked_at}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-violet-700 dark:text-violet-300">(none)</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-violet-900 dark:text-violet-100 mb-1">
                    Dashboard source: user_unlocks (last 24h, badge type)
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.debug.recentMilestonesFromUnlocks.badges.length ? (
                      result.debug.recentMilestonesFromUnlocks.badges.map((r) => (
                        <li key={`${r.unlock_name}-${r.unlocked_at}`} className="font-mono text-xs">
                          {r.unlock_name} — {r.unlocked_at}
                        </li>
                      ))
                    ) : (
                      <li className="text-violet-700 dark:text-violet-300">(none — milestone card won&apos;t show multi-badge summary)</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-violet-900 dark:text-violet-100 mb-1">Milestone card inputs (matches WhatsNewToday)</p>
                  <p className="text-xs mb-1">
                    <span className="font-semibold">userData:</span>{' '}
                    {JSON.stringify(result.debug.milestoneCardData.userData)}
                  </p>
                  <p className="text-xs mb-1">
                    <span className="font-semibold">badgeNames:</span>{' '}
                    {result.debug.milestoneCardData.badgeNames.join(', ') || '(empty)'}
                  </p>
                  {result.debug.milestoneCardData.singleBadgeMessage ? (
                    <p className="text-xs mt-2 italic border-l-2 border-violet-400 pl-2">
                      Single quote: {result.debug.milestoneCardData.singleBadgeMessage}
                    </p>
                  ) : null}
                  {result.debug.milestoneCardData.multiBadgeMessage ? (
                    <p className="text-xs mt-2 italic border-l-2 border-violet-400 pl-2">
                      Multi quote: {result.debug.milestoneCardData.multiBadgeMessage}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="font-medium text-violet-900 dark:text-violet-100 mb-1">getAchievementsList() output</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.debug.milestoneCardData.achievements.length ? (
                      result.debug.milestoneCardData.achievements.map((line, i) => {
                        const hint = achievementLineHint(line)
                        return (
                          <li key={i}>
                            {line}
                            {hint ? <span className="block text-xs mt-0.5">{hint}</span> : null}
                          </li>
                        )
                      })
                    ) : (
                      <li className="text-violet-700 dark:text-violet-300">(empty — no badge names for card)</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-violet-900 dark:text-violet-100 mb-1">Raw journey badge objects</p>
                  <pre className="text-[11px] leading-snug overflow-x-auto max-h-48 overflow-y-auto p-2 bg-white/80 dark:bg-black/30 border border-violet-200/80 dark:border-violet-800">
                    {JSON.stringify(result.debug.rawJourneyBadgeObjects, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          ) : null}

          <div>
            <h3 className="font-medium text-[#ef725c] mb-2">🏆 Badges newly unlocked (this run)</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {result.badgesUnlocked.length ? (
                result.badgesUnlocked.map((b) => <li key={b}>{b}</li>)
              ) : (
                <li className="text-gray-500">None detected vs. snapshot before simulate (may already be on profile).</li>
              )}
            </ul>
          </div>

          {(result.journeyNewlyUnlockedBadges?.length || result.journeyNewlyUnlockedFeatures?.length) ? (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 text-sm">
              <p className="font-medium text-emerald-900 dark:text-emerald-100">Production-style popups (this run)</p>
              <p className="text-emerald-800 dark:text-emerald-200/90 mt-1">
                {result.journeyNewlyUnlockedBadges?.length
                  ? `${result.journeyNewlyUnlockedBadges.length} badge(s) → celebration flow above`
                  : 'No new badges in this journey evaluation.'}{' '}
                ·{' '}
                {result.journeyNewlyUnlockedFeatures?.length
                  ? `${result.journeyNewlyUnlockedFeatures.length} feature(s) → What's New modal (if not already dismissed)`
                  : 'No new features in this journey evaluation.'}
              </p>
            </div>
          ) : null}

          <div>
            <h3 className="font-medium text-[#ef725c] mb-2">✨ Features newly unlocked (this run)</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {result.featuresUnlocked.length ? (
                result.featuresUnlocked.map((f) => <li key={f}>{f}</li>)
              ) : (
                <li className="text-gray-500">None vs. snapshot before simulate.</li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">📧 Email previews ({result.emailPreviews.length}, not sent)</h3>
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {result.emailPreviews.map((em, idx) => (
                <div
                  key={`${em.type}-${idx}`}
                  className="border border-gray-200 dark:border-gray-700 p-3 text-sm bg-white dark:bg-gray-900"
                  style={{ borderRadius: 0 }}
                >
                  <p className="font-medium">{em.type}</p>
                  <p className="text-gray-600 dark:text-gray-400">To: {em.to}</p>
                  <p className="text-gray-600 dark:text-gray-400">Subject: {em.subject}</p>
                  <p className="mt-2 text-gray-700 dark:text-gray-300 line-clamp-3">{em.bodyPreview}</p>
                  <button
                    type="button"
                    onClick={() => setPreview(em)}
                    className="mt-2 text-[#ef725c] text-sm font-medium hover:underline"
                  >
                    View full email
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setPreview(null)}
          role="presentation"
        >
          <div
            className="bg-white dark:bg-gray-900 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-gray-300 dark:border-gray-600"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between gap-2 items-start">
              <div>
                <p className="text-xs text-gray-500">{preview.type}</p>
                <p className="font-semibold">{preview.subject}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Preview recipient: {preview.to}</p>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Sends to: <strong>{effectivePreviewRecipient || '—'}</strong>
                  {emailTestAddress.trim() && SIMPLE_EMAIL_RE.test(emailTestAddress.trim()) ? (
                    <span className="font-normal text-gray-600 dark:text-gray-400"> (override)</span>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copyHtml} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800" style={{ borderRadius: 0 }}>
                  Copy HTML
                </button>
                <button
                  type="button"
                  disabled={sendTestLoading}
                  onClick={() => void sendTestEmail()}
                  className="text-sm px-3 py-1.5 border-2 border-amber-600 text-amber-900 dark:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50"
                  style={{ borderRadius: 0 }}
                >
                  {sendTestLoading ? 'Sending…' : 'Send test email (dev only)'}
                </button>
                <button type="button" onClick={() => setPreview(null)} className="text-sm px-3 py-1.5 bg-[#152b50] text-white" style={{ borderRadius: 0 }}>
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-2">
              <iframe title="Email preview" className="w-full min-h-[400px] bg-white border-0" sandbox="allow-same-origin" srcDoc={preview.fullHtml} />
            </div>
          </div>
        </div>
      ) : null}

      <BadgeUnlockFlow newlyUnlockedBadges={celebrationBadges} />
      <FirstGlimpseModal open={simulateFirstGlimpseOpen} onClose={closeSimulateFirstGlimpse} />
      <FeatureUnlockQueueModal
        open={featureUnlockModalOpen}
        onClose={() => setFeatureUnlockModalOpen(false)}
        items={featureUnlockItems}
        daysWithEntries={unlockModalDaysWithEntries}
        markAsViewed={async () => {
          setFeatureUnlockModalOpen(false)
        }}
      />
    </>
  )
}
