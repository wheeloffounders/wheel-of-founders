'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { InfoTooltip } from '@/components/InfoTooltip'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { getRecentMilestones } from '@/lib/milestones/getRecentMilestones'
import {
  getAchievementsList,
  getMilestoneDescription,
  getMilestoneMessage,
  getMultipleMilestoneMessage,
  type MilestoneUserContext,
} from '@/lib/milestones/milestoneMessages'
import { BADGE_DEFINITION_MAP } from '@/lib/badges/badge-definitions'

type NewsItem = {
  title: string
  typeLabel: string
  preview: string
  href: string
  icon: string
  isFresh: boolean
}

type Candidate = {
  ts: number
  typeLabel: string
  text: string
  href: string
  icon: string
  fresh: boolean
  priority: number
}

export type DashboardRotatingCard =
  | { variant: 'insight'; item: NewsItem }
  | {
      variant: 'milestone'
      badgeNames: string[]
      userContext: MilestoneUserContext
    }
  | { variant: 'missed'; item: NewsItem }

function previewSentences(text: string, maxSentences = 3, maxChars = 320): string {
  const clean = text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return ''
  const parts = clean.match(/[^.!?]+[.!?]*/g) ?? [clean]
  const joined = parts.slice(0, maxSentences).join(' ').trim()
  if (joined.length <= maxChars) return joined
  return `${joined.slice(0, maxChars).trim()}...`
}

function sameDay(value: string | Date, todayStr: string): boolean {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return false
  return d.toISOString().slice(0, 10) === todayStr
}

function pushCandidate(list: Candidate[], candidate: Candidate) {
  if (!Number.isFinite(candidate.ts)) return
  list.push(candidate)
}

async function loadDashboardCard(todayStr: string): Promise<DashboardRotatingCard> {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) {
    return {
      variant: 'missed',
      item: {
        title: 'You Might Have Missed',
        typeLabel: 'Latest insights',
        preview: 'Sign in to see your updates.',
        href: '/weekly',
        icon: '📰',
        isFresh: false,
      },
    }
  }

  const cutoffTs = Date.now() - 7 * 24 * 60 * 60 * 1000

  const [
    milestoneRes,
    { data: weekly },
    { data: monthly },
    { data: quarterly },
    { data: profile },
    { data: unlocks },
  ] = await Promise.all([
    getRecentMilestones(supabase, user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('weekly_insights') as any)
      .select('week_start, insight_text, unseen_wins_pattern, generated_at')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('monthly_insights') as any)
      .select('month_start, insight_text, generated_at')
      .eq('user_id', user.id)
      .order('month_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('quarterly_insights') as any)
      .select('quarter_start, insight_text, generated_at')
      .eq('user_id', user.id)
      .order('quarter_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('user_profiles').select('last_refreshed, current_streak').eq('id', user.id).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('user_unlocks') as any)
      .select('unlock_type, unlock_name, unlocked_at')
      .eq('user_id', user.id)
      .in('unlock_type', ['feature'])
      .order('unlocked_at', { ascending: false })
      .limit(20),
  ])

  const userContext: MilestoneUserContext = {
    currentStreak: (profile as { current_streak?: number | null } | null)?.current_streak ?? 0,
  }

  const candidates: Candidate[] = []

  const unlockRows = Array.isArray(unlocks) ? unlocks : []

  const latestArchetypePreviewUnlock = unlockRows.find(
    (u) => u?.unlock_type === 'feature' && String(u?.unlock_name ?? '') === 'founder_archetype' && u?.unlocked_at
  )
  if (latestArchetypePreviewUnlock) {
    const unlockedAt = String(latestArchetypePreviewUnlock.unlocked_at)
    pushCandidate(candidates, {
      ts: new Date(unlockedAt).getTime(),
      typeLabel: 'Founder Archetype (Preview)',
      text: 'A preview of your emerging archetype is ready — the full picture unlocks with more days of signal.',
      href: '/founder-dna/archetype',
      icon: '🏷️',
      fresh: sameDay(unlockedAt, todayStr),
      priority: 6,
    })
  }

  const latestArchetypeFullUnlock = unlockRows.find(
    (u) => u?.unlock_type === 'feature' && String(u?.unlock_name ?? '') === 'founder_archetype_full' && u?.unlocked_at
  )
  if (latestArchetypeFullUnlock) {
    const unlockedAt = String(latestArchetypeFullUnlock.unlocked_at)
    pushCandidate(candidates, {
      ts: new Date(unlockedAt).getTime(),
      typeLabel: 'Founder Archetype (Full)',
      text: 'Your full archetype profile is ready — primary, supporting signals, and growth edge.',
      href: '/founder-dna/archetype',
      icon: '🔮',
      fresh: sameDay(unlockedAt, todayStr),
      priority: 5,
    })
  }

  if (weekly?.generated_at) {
    const text = String(weekly.unseen_wins_pattern ?? weekly.insight_text ?? '').trim()
    pushCandidate(candidates, {
      ts: new Date(weekly.generated_at).getTime(),
      typeLabel: weekly.unseen_wins_pattern ? 'Unseen Wins' : 'Weekly Insight',
      text,
      href: weekly.unseen_wins_pattern ? '/founder-dna/rhythm' : '/weekly',
      icon: weekly.unseen_wins_pattern ? '✨' : '📅',
      fresh: sameDay(String(weekly.generated_at), todayStr),
      priority: 1,
    })
  }
  if (monthly?.generated_at) {
    pushCandidate(candidates, {
      ts: new Date(monthly.generated_at).getTime(),
      typeLabel: 'Monthly Insight',
      text: String(monthly.insight_text ?? '').trim(),
      href: '/monthly-insight',
      icon: '🌙',
      fresh: sameDay(String(monthly.generated_at), todayStr),
      priority: 4,
    })
  }
  if (quarterly?.generated_at) {
    pushCandidate(candidates, {
      ts: new Date(quarterly.generated_at).getTime(),
      typeLabel: 'Quarterly Insight',
      text: String(quarterly.insight_text ?? '').trim(),
      href: '/quarterly',
      icon: '📈',
      fresh: sameDay(String(quarterly.generated_at), todayStr),
      priority: 5,
    })
  }

  const lr = (profile as { last_refreshed?: unknown } | null)?.last_refreshed
  const lrObj = lr && typeof lr === 'object' && !Array.isArray(lr) ? (lr as Record<string, unknown>) : {}
  const entries: Array<{ key: string; typeLabel: string; icon: string; href: string; priority: number }> = [
    { key: 'your_story', typeLabel: 'Your Story', icon: '📖', href: '/founder-dna/rhythm', priority: 2 },
    { key: 'celebration_gap', typeLabel: 'Celebration Gap', icon: '🪞', href: '/founder-dna/patterns', priority: 3 },
    { key: 'recurring_question', typeLabel: 'Recurring Question', icon: '💫', href: '/founder-dna/patterns', priority: 3 },
  ]
  for (const e of entries) {
    const raw = lrObj[e.key]
    if (!raw || typeof raw !== 'object') continue
    const at = String((raw as Record<string, unknown>).at ?? '')
    const snapshot = (raw as Record<string, unknown>).snapshot
    if (!at) continue
    const ts = new Date(at).getTime()
    let text = ''
    if (snapshot && typeof snapshot === 'object') {
      const s = snapshot as Record<string, unknown>
      text = String(s.insight ?? s.intro ?? s.pattern ?? s.lesson ?? '').trim()
    }
    if (!text) text = `${e.typeLabel} has fresh updates based on your recent data.`
    pushCandidate(candidates, {
      ts,
      typeLabel: e.typeLabel,
      text,
      href: e.href,
      icon: e.icon,
      fresh: at.slice(0, 10) === todayStr,
      priority: e.priority,
    })
  }

  const todays = candidates
    .filter((c) => c.fresh)
    .sort((a, b) => b.ts - a.ts || a.priority - b.priority)

  if (todays.length > 0) {
    const latest = todays[0]!
    return {
      variant: 'insight',
      item: {
        title: "What's New Today ✨",
        typeLabel: latest.typeLabel,
        preview: latest.text ? previewSentences(latest.text, 3, 320) : `Open ${latest.typeLabel} to review your newest insight.`,
        href: latest.href,
        icon: latest.icon,
        isFresh: true,
      },
    }
  }

  if (milestoneRes.hasMilestone && milestoneRes.badges.length > 0) {
    const badgeNames = milestoneRes.badges.map((b) => b.unlock_name)
    return {
      variant: 'milestone',
      badgeNames,
      userContext,
    }
  }

  const latest =
    candidates
      .filter((c) => c.ts >= cutoffTs)
      .sort((a, b) => b.ts - a.ts || a.priority - b.priority)[0] ?? null

  if (!latest) {
    return {
      variant: 'missed',
      item: {
        title: 'You Might Have Missed',
        typeLabel: 'Latest insights',
        preview: 'No new updates today. Review your latest Weekly, Monthly, Quarterly, or Founder DNA insight.',
        href: '/weekly',
        icon: '📰',
        isFresh: false,
      },
    }
  }

  return {
    variant: 'missed',
    item: {
      title: 'You Might Have Missed',
      typeLabel: latest.typeLabel,
      preview: latest.text ? previewSentences(latest.text, 3, 320) : `Open ${latest.typeLabel} to review your newest insight.`,
      href: latest.href,
      icon: latest.icon,
      isFresh: false,
    },
  }
}

function badgeLabel(name: string): string {
  return BADGE_DEFINITION_MAP[name]?.label ?? name.replaceAll('_', ' ')
}

export function WhatsNewToday() {
  // Bump periodically so calendar day and 24h milestone window update without a full page reload.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const swrKey = ['dashboard-rotating-card', todayStr] as const
  const { data: card, isLoading, mutate } = useSWR(
    swrKey,
    ([, d]) => loadDashboardCard(d),
    {
      revalidateOnFocus: true,
      dedupingInterval: 60_000,
      refreshInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    }
  )

  useEffect(() => {
    const onSync = () => {
      void mutate()
    }
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [mutate])

  const variantSub =
    card?.variant === 'insight'
      ? { icon: '✨', label: "What's New Today" }
      : card?.variant === 'milestone'
        ? { icon: '🏆', label: 'Milestone' }
        : card?.variant === 'missed'
          ? { icon: '📰', label: 'You Might Have Missed' }
          : null

  return (
    <div className="border border-gray-200 dark:border-gray-700 border-l-4 border-l-[#152b50] bg-white/60 dark:bg-gray-800/40 px-4 pb-4 pt-4 overflow-visible">
      <div className="flex items-start gap-3 mb-3">
        <MrsDeerAvatar expression="thoughtful" size="sm" className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-snug">Mrs. Deer&apos;s observations</h3>
            <InfoTooltip
              presentation="popover"
              position="bottom"
              text="Rotates: newest insight first, then recent badge milestones (24h), then a catch-up highlight from the last week."
              className="shrink-0"
            />
          </div>
          {!isLoading && variantSub ? (
            <p className="text-xs font-semibold uppercase tracking-wider mt-2 flex items-center gap-1.5 text-[#EF725C] dark:text-[#F28771]">
              <span aria-hidden>{variantSub.icon}</span>
              <span>{variantSub.label}</span>
            </p>
          ) : null}
        </div>
      </div>
      {isLoading ? <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading...</p> : null}

      {!isLoading && (card?.variant === 'insight' || card?.variant === 'missed') ? (
        <div className="mt-3">
          <p className="text-base text-gray-900 dark:text-white">
            <span aria-hidden>{card.item.icon}</span> {card.item.typeLabel}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{card.item.preview}</p>
          <Link href={card.item.href} className="text-sm text-[#ef725c] hover:underline inline-block mt-2">
            Read full →
          </Link>
        </div>
      ) : null}

      {!isLoading && card?.variant === 'milestone' ? (
        <MilestoneCardContent badgeNames={card.badgeNames} userContext={card.userContext} />
      ) : null}
    </div>
  )
}

function MilestoneCardContent({
  badgeNames,
  userContext,
}: {
  badgeNames: string[]
  userContext: MilestoneUserContext
}) {
  const single = badgeNames.length === 1
  const name = single ? badgeNames[0]! : ''

  const message = single
    ? getMilestoneMessage(name, userContext)
    : getMultipleMilestoneMessage(badgeNames, userContext)

  const achievements = single ? [] : getAchievementsList(badgeNames, userContext)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    console.log('[MilestoneCard] badgeNames (milestone card):', badgeNames)
    console.log('[MilestoneCard] userContext:', userContext)
    console.log('[MilestoneCard] achievements list (multi only):', achievements)
  }, [badgeNames, userContext, achievements])

  return (
    <div className="mt-3 space-y-4">
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <p className="text-gray-700 dark:text-gray-300 italic">&ldquo;{message}&rdquo;</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">— Mrs. Deer</p>
      </div>

      {single ? (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {badgeLabel(name)} · {getMilestoneDescription(name)}
          </p>
        </div>
      ) : (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
            {achievements.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {badgeNames.length} new badge{badgeNames.length === 1 ? '' : 's'} in the last 24 hours
          </p>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <Link
          href="/founder-dna/journey"
          className="text-sm font-medium text-[#ef725c] hover:text-[#ef725c]/80 dark:text-[#f97316] dark:hover:text-[#f97316]/80"
        >
          See your badges →
        </Link>
      </div>
    </div>
  )
}
