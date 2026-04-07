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
import {
  buildDashboardRotatingCard,
  type DashboardRotatingCard,
} from '@/lib/founder-dna/dashboard-whats-new-card'

const MILESTONE_BADGE_WINDOW_MS = 48 * 60 * 60 * 1000

type WeeklyRow = {
  generated_at?: string | null
  insight_text?: string | null
  unseen_wins_pattern?: string | null
} | null
type MonthlyRow = { generated_at?: string | null; insight_text?: string | null } | null
type QuarterlyRow = { generated_at?: string | null; insight_text?: string | null } | null

async function loadDashboardCard(todayStr: string): Promise<DashboardRotatingCard> {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) {
    return {
      variant: 'missed',
      item: {
        title: 'You Might Have Missed',
        typeLabel: 'Latest updates',
        preview: 'Sign in to see your updates.',
        href: '/weekly',
        icon: '📰',
        isFresh: false,
      },
    }
  }

  const [
    milestoneRes,
    { data: weekly },
    { data: monthly },
    { data: quarterly },
    { data: profile },
    { data: unlocks },
  ] = await Promise.all([
    getRecentMilestones(supabase, user.id, MILESTONE_BADGE_WINDOW_MS),
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
      .in('unlock_type', ['feature', 'badge'])
      .order('unlocked_at', { ascending: false })
      .limit(40),
  ])

  const userContext: MilestoneUserContext = {
    currentStreak: (profile as { current_streak?: number | null } | null)?.current_streak ?? 0,
  }

  return buildDashboardRotatingCard({
    todayStr,
    milestoneRes,
    userContext,
    weekly: (weekly as WeeklyRow) ?? null,
    monthly: (monthly as MonthlyRow) ?? null,
    quarterly: (quarterly as QuarterlyRow) ?? null,
    profile: (profile as { current_streak?: number | null; last_refreshed?: unknown } | null) ?? null,
    unlockRows: Array.isArray(unlocks) ? unlocks : [],
  })
}

function badgeLabel(name: string): string {
  return BADGE_DEFINITION_MAP[name]?.label ?? name.replaceAll('_', ' ')
}

export function WhatsNewToday() {
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

  const cardLinkClass =
    'mt-3 block rounded-xl border border-transparent -mx-1 px-3 py-2 -mb-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:border-gray-200 dark:hover:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ef725c] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900'

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
              text="Highlights what’s new today: insights first, then badges and feature unlocks. Recent badge celebrations (48h) appear when nothing landed today. Tap the card to open the right place."
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
        <Link href={card.item.href} className={cardLinkClass}>
          <p className="text-base text-gray-900 dark:text-white">
            <span aria-hidden>{card.item.icon}</span> {card.item.typeLabel}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{card.item.preview}</p>
          <p className="text-sm font-medium text-[#ef725c] mt-3">Open full update →</p>
        </Link>
      ) : null}

      {!isLoading && card?.variant === 'milestone' ? (
        <Link href="/founder-dna/journey" className={cardLinkClass}>
          <MilestoneCardContent badgeNames={card.badgeNames} userContext={card.userContext} />
          <p className="text-sm font-medium text-[#ef725c] mt-3">View on your journey →</p>
        </Link>
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
    <div className="space-y-4">
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
            {badgeNames.length} new badge{badgeNames.length === 1 ? '' : 's'} in the last 48 hours
          </p>
        </div>
      )}
    </div>
  )
}
