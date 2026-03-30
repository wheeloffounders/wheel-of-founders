import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { FOUNDER_DNA_FEATURE_META } from '@/lib/founder-dna/feature-links'
import { parseUnlockedFeatures } from '@/types/supabase'
import type { JourneyBadge } from '@/lib/types/founder-dna'

export const dynamic = 'force-dynamic'

function toYmd(value: string | null | undefined): string | null {
  if (!value) return null
  const ymd = value.includes('T') ? value.slice(0, 10) : value
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null
}

function isJourneyBadgeRow(b: unknown): b is JourneyBadge {
  return (
    Boolean(b) &&
    typeof b === 'object' &&
    typeof (b as JourneyBadge).name === 'string' &&
    typeof (b as JourneyBadge).label === 'string' &&
    typeof (b as JourneyBadge).unlocked_at === 'string'
  )
}

export type SimulateStatusResponse = {
  daysWithMorningTasksAndEvening: number
  morningTasksCount: number
  eveningReviewsCount: number
  currentStreak: number | null
  badgeCount: number
  recentBadges: Array<{ name: string; label: string; unlocked_at: string; icon?: string }>
  featuresUnlocked: Array<{ name: string; title: string; icon: string }>
  lastEntryDate: string | null
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const session = await getServerSessionFromRequest(req)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const db = getServerSupabase()

  const [tasksDatesRes, evDatesRes, taskCountRes, evCountRes, profileRes] = await Promise.all([
    db.from('morning_tasks').select('plan_date').eq('user_id', userId),
    db.from('evening_reviews').select('review_date').eq('user_id', userId),
    db.from('morning_tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('evening_reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('user_profiles').select('current_streak, badges, unlocked_features').eq('id', userId).maybeSingle(),
  ])

  if (tasksDatesRes.error) {
    return NextResponse.json({ error: tasksDatesRes.error.message }, { status: 500 })
  }
  if (evDatesRes.error) {
    return NextResponse.json({ error: evDatesRes.error.message }, { status: 500 })
  }
  if (taskCountRes.error) {
    return NextResponse.json({ error: taskCountRes.error.message }, { status: 500 })
  }
  if (evCountRes.error) {
    return NextResponse.json({ error: evCountRes.error.message }, { status: 500 })
  }
  if (profileRes.error) {
    return NextResponse.json({ error: profileRes.error.message }, { status: 500 })
  }

  const taskDates = new Set<string>()
  let lastFromTasks: string | null = null
  for (const row of (tasksDatesRes.data ?? []) as Array<{ plan_date?: string | null }>) {
    const d = toYmd(row.plan_date ?? undefined)
    if (d) {
      taskDates.add(d)
      if (!lastFromTasks || d > lastFromTasks) lastFromTasks = d
    }
  }

  const eveningDates = new Set<string>()
  let lastFromEvenings: string | null = null
  for (const row of (evDatesRes.data ?? []) as Array<{ review_date?: string | null }>) {
    const d = toYmd(row.review_date ?? undefined)
    if (d) {
      eveningDates.add(d)
      if (!lastFromEvenings || d > lastFromEvenings) lastFromEvenings = d
    }
  }

  let daysWithMorningTasksAndEvening = 0
  for (const d of taskDates) {
    if (eveningDates.has(d)) daysWithMorningTasksAndEvening++
  }

  let lastEntryDate: string | null = null
  if (lastFromTasks && lastFromEvenings) {
    lastEntryDate = lastFromTasks > lastFromEvenings ? lastFromTasks : lastFromEvenings
  } else {
    lastEntryDate = lastFromTasks || lastFromEvenings
  }

  const profile = profileRes.data as {
    current_streak?: number | null
    badges?: unknown
    unlocked_features?: unknown
  } | null

  const rawBadges = Array.isArray(profile?.badges) ? profile!.badges : []
  const badgesParsed = rawBadges.filter(isJourneyBadgeRow)
  const recentBadges = [...badgesParsed]
    .sort((a, b) => String(b.unlocked_at).localeCompare(String(a.unlocked_at)))
    .slice(0, 12)
    .map((b) => ({
      name: b.name,
      label: b.label,
      unlocked_at: b.unlocked_at,
      icon: b.icon,
    }))

  const features = parseUnlockedFeatures(profile?.unlocked_features)
  const featuresUnlocked = features.map((f) => {
    const meta = FOUNDER_DNA_FEATURE_META[f.name]
    return {
      name: f.name,
      title: meta?.title ?? f.label,
      icon: meta?.icon ?? f.icon ?? '🔓',
    }
  })
  featuresUnlocked.sort((a, b) => a.title.localeCompare(b.title))

  const streakRaw = profile?.current_streak
  const currentStreak =
    streakRaw != null && Number.isFinite(Number(streakRaw)) ? Math.max(0, Math.floor(Number(streakRaw))) : null

  const body: SimulateStatusResponse = {
    daysWithMorningTasksAndEvening,
    morningTasksCount: taskCountRes.count ?? 0,
    eveningReviewsCount: evCountRes.count ?? 0,
    currentStreak,
    badgeCount: badgesParsed.length,
    recentBadges,
    featuresUnlocked,
    lastEntryDate,
  }

  return NextResponse.json(body)
}
