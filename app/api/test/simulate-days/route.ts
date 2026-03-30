import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { simulateDays } from '@/lib/test/simulateDays'
import { buildEmailPreview } from '@/lib/test/emailPreview'
import { pushEmailCapture, popEmailCapture, type EmailCapturePayload } from '@/lib/email/email-capture-context'
import { parseUnlockedFeatures } from '@/types/supabase'
import { BADGE_DEFINITION_MAP } from '@/lib/badges/badge-definitions'
import { loadFounderJourneyPayload } from '@/lib/founder-dna/load-founder-journey-payload'
import { getRecentMilestones } from '@/lib/milestones/getRecentMilestones'
import {
  getAchievementsList,
  getMilestoneMessage,
  getMultipleMilestoneMessage,
  type MilestoneUserContext,
} from '@/lib/milestones/milestoneMessages'
import type { JourneyBadge } from '@/lib/types/founder-dna'

export const dynamic = 'force-dynamic'

type ProfileBadgeStub = { name?: string; label?: string }

function badgeNameSet(badges: unknown): Set<string> {
  const s = new Set<string>()
  if (!Array.isArray(badges)) return s
  for (const b of badges) {
    const n = (b as ProfileBadgeStub)?.name
    if (typeof n === 'string' && n) s.add(n)
  }
  return s
}

function featureNameSet(raw: unknown): Set<string> {
  return new Set(parseUnlockedFeatures(raw).map((f) => f.name))
}

function labelForBadge(name: string): string {
  return BADGE_DEFINITION_MAP[name]?.label ?? name.replaceAll('_', ' ')
}

function labelForFeature(name: string, raw: unknown): string {
  const list = parseUnlockedFeatures(raw)
  const hit = list.find((f) => f.name === name)
  return hit?.label ?? name.replaceAll('_', ' ')
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const session = await getServerSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    userId?: string
    numDays?: number
    startDate?: string
    overwrite?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const targetUserId =
    typeof body.userId === 'string' && body.userId === session.user.id ? body.userId : session.user.id

  const numDays = Math.min(100, Math.max(1, Math.floor(Number(body.numDays) || 0)))
  if (!Number.isFinite(numDays) || numDays < 1) {
    return NextResponse.json({ error: 'numDays must be 1-100' }, { status: 400 })
  }

  const startDate =
    typeof body.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate)
      ? body.startDate
      : new Date().toISOString().slice(0, 10)

  const overwrite = Boolean(body.overwrite)

  const db = getServerSupabase()

  const { data: profileBefore } = await db
    .from('user_profiles')
    .select('badges, unlocked_features, email_address, preferred_name, name')
    .eq('id', targetUserId)
    .maybeSingle()

  const pr = profileBefore as {
    badges?: unknown
    unlocked_features?: unknown
    email_address?: string | null
  } | null

  const recipient = (pr?.email_address || session.user.email || 'preview@localhost').trim()

  const badgesBefore = badgeNameSet(pr?.badges)
  const featuresBefore = featureNameSet(pr?.unlocked_features)

  const sim = await simulateDays(db, targetUserId, {
    startDate,
    numDays,
    overwrite,
  })

  const captured: EmailCapturePayload[] = []
  pushEmailCapture((p) => captured.push(p))

  let journeyError: string | null = null
  let journeyPayload: Awaited<ReturnType<typeof loadFounderJourneyPayload>> | null = null
  try {
    journeyPayload = await loadFounderJourneyPayload(targetUserId)
  } catch (e) {
    journeyError = e instanceof Error ? e.message : 'Journey evaluation failed'
  } finally {
    popEmailCapture()
  }

  const { data: profileAfter } = await db
    .from('user_profiles')
    .select('badges, unlocked_features, current_streak')
    .eq('id', targetUserId)
    .maybeSingle()

  const pa = profileAfter as {
    badges?: unknown
    unlocked_features?: unknown
    current_streak?: number | null
  } | null
  const badgesAfter = badgeNameSet(pa?.badges)
  const featuresAfter = featureNameSet(pa?.unlocked_features)

  const newBadgeNames = [...badgesAfter].filter((n) => !badgesBefore.has(n))
  const newFeatureNames = [...featuresAfter].filter((n) => !featuresBefore.has(n))

  const retentionPreviews = captured.map((p) => buildEmailPreview(recipient, p))
  const emailPreviews = [...sim.syntheticEmailPreviews, ...retentionPreviews]

  const errors = [...sim.errors]
  if (journeyError) errors.push(journeyError)

  const journeyNewlyUnlockedBadges = journeyPayload?.newlyUnlockedBadges ?? []
  const journeyNewlyUnlockedFeatures = journeyPayload?.newlyUnlockedFeatures ?? []

  const userData: MilestoneUserContext = {
    currentStreak: pa?.current_streak ?? 0,
  }

  const recentMilestones = await getRecentMilestones(db, targetUserId)
  const milestoneCardBadgeNames = recentMilestones.badges.map((r) => r.unlock_name)
  const achievementsForMilestoneCard =
    milestoneCardBadgeNames.length > 0 ? getAchievementsList(milestoneCardBadgeNames, userData) : []

  const milestoneMultiMessage =
    milestoneCardBadgeNames.length > 1
      ? getMultipleMilestoneMessage(milestoneCardBadgeNames, userData)
      : null

  const milestoneSingleMessage =
    milestoneCardBadgeNames.length === 1
      ? getMilestoneMessage(milestoneCardBadgeNames[0]!, userData)
      : null

  const journeyBadgeDebug = journeyNewlyUnlockedBadges.map((b) => journeyBadgeToDebugShape(b))

  const newlyUnlockedFeatureNames = journeyNewlyUnlockedFeatures.map((f) => f.name)
  if (process.env.NODE_ENV === 'development') {
    console.log('[simulate-days] newlyUnlockedFeatureNames (modal queue source):', newlyUnlockedFeatureNames)
  }

  const debug = {
    notes: [
      'Dashboard milestone card uses user_unlocks (unlock_type=badge) from the last 24 hours — not necessarily the same set as journeyNewlyUnlockedBadges for this single evaluation.',
      'getAchievementsList() returns one line per badge: "Label — short meaning" (no category grouping).',
      'journeyNewlyUnlockedFeatures / newlyUnlockedFeatureNames: only features inserted this run via loadFounderJourneyPayload progressive unlocks (profile + user_unlocks). The journey schedule can show a row as unlocked by day count before this pipeline runs; those rows now include your_story_so_far and unseen_wins when thresholds are met.',
    ],
    newlyUnlockedFeatureNames,
    journeyNewlyUnlockedBadges: journeyBadgeDebug,
    journeyNewlyUnlockedFeatures,
    recentMilestonesFromUnlocks: recentMilestones,
    milestoneCardData: {
      badgeNames: milestoneCardBadgeNames,
      userData,
      count: milestoneCardBadgeNames.length,
      isMultiple: milestoneCardBadgeNames.length > 1,
      multiBadgeMessage: milestoneMultiMessage,
      singleBadgeMessage: milestoneSingleMessage,
      achievements: achievementsForMilestoneCard,
    },
    journeyEvalBadgeNames: journeyNewlyUnlockedBadges.map((b) => b.name),
    rawJourneyBadgeObjects: journeyNewlyUnlockedBadges,
  }

  return NextResponse.json({
    success: sim.success && !journeyError,
    daysCreated: sim.daysCreated,
    daysSkipped: sim.daysSkipped,
    badgesUnlocked: newBadgeNames.map(labelForBadge),
    featuresUnlocked: newFeatureNames.map((n) => labelForFeature(n, pa?.unlocked_features)),
    /** Same objects the journey API would return this run — drive test-page modals */
    journeyNewlyUnlockedBadges,
    journeyNewlyUnlockedFeatures,
    daysWithEntries: journeyPayload?.milestones?.daysWithEntries ?? null,
    emailPreviews,
    errors,
    debug,
  })
}

type MilestoneDebugBadge = {
  id: string
  name: string
  label: string
  category: JourneyBadge['category'] | null
  unlock_day?: number
  description?: string
  unlocked_at: string
}

function journeyBadgeToDebugShape(b: JourneyBadge): MilestoneDebugBadge {
  const name = String(b.name ?? '').trim()
  const def = name ? BADGE_DEFINITION_MAP[name] : undefined
  return {
    id: name || 'unknown',
    name: name || 'unknown',
    label: (b.label && b.label.trim()) || def?.label || name || 'unknown',
    category: b.category ?? def?.category ?? null,
    description: (b.description && b.description.trim()) || def?.description,
    unlocked_at: typeof b.unlocked_at === 'string' ? b.unlocked_at : '',
  }
}
