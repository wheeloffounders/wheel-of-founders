/**
 * Server-only founder journey evaluation (same logic as GET /api/founder-dna/journey).
 * Used by the route handler and by dev simulation so unlocks run without a browser round-trip.
 */

import { getServerSupabase } from '@/lib/server-supabase'
import { computeNextMilestones } from '@/lib/founder-dna/next-milestones'
import {
  ARCHETYPE_FULL_MIN_DAYS,
  ARCHETYPE_PREVIEW_MIN_DAYS,
  getArchetypeJourneyStatus,
} from '@/lib/founder-dna/archetype-timing'
import { computeFounderDnaSchedule } from '@/lib/founder-dna/compute-founder-dna-schedule'
import {
  CELEBRATION_GAP_MIN_DAYS,
  DECISION_STYLE_MIN_DAYS,
  FIRST_GLIMPSE_MIN_EVENINGS,
  MONTHLY_INSIGHT_MIN_DAYS,
  isMorningInsightsUnlocked,
  MORNING_INSIGHTS_MIN_DAYS,
  POSTPONEMENT_MIN_DAYS,
  QUARTERLY_INSIGHT_MIN_DAYS,
  RECURRING_QUESTION_MIN_DAYS,
  SCHEDULE_ENERGY_MIN_DAYS,
  SCHEDULE_STORY_SO_FAR_DAY,
  SCHEDULE_UNSEEN_WINS_DAY,
  WEEKLY_INSIGHT_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'
import { parseUnlockedFeatures, type UserProfileAccessRow } from '@/types/supabase'
import { insertUserUnlock } from '@/lib/unlock-helpers'
import { getUserDaysActiveCalendar, getUserTimezoneFromProfile } from '@/lib/timezone'
import { checkAndPersistBadgeUnlocks } from '@/lib/badges/check-badge-unlocks'
import { calculateStreakForUser } from '@/lib/streak-calculate'
import { renderEmailTemplate } from '@/lib/email/templates'
import { sendEmailWithTracking } from '@/lib/email/sender'
import { buildPersonalizedEmailContext } from '@/lib/email/personalization'
import { sendInsightFirstUnlockEmail } from '@/lib/email/send-insight-first-unlock-email'
import { sendFounderArchetypeFullEmail } from '@/lib/email/send-founder-archetype-full-email'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import { reconcileUnlockedFeaturesForActivity } from '@/lib/founder-dna/reconcile-unlocked-features'
import type { FounderJourney, JourneyBadge } from '@/lib/types/founder-dna'

export type FounderJourneyPayload = FounderJourney & {
  /** Features added during this evaluation (progressive unlock pipeline), for celebration / What's New UI */
  newlyUnlockedFeatures: JourneyBadge[]
}

export async function loadFounderJourneyPayload(userId: string): Promise<FounderJourneyPayload> {
    const db = getServerSupabase()
    /** `user_profiles` updates are not in the bundled DB typings */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbProfileWrites = db as any

    const [tasksRes, tasksCompletedRes, decisionsRes, eveningsRes, profileRes, postponedRes] =
      await Promise.all([
        db
          .from('morning_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        db
          .from('morning_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('completed', true),
        db
          .from('morning_decisions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        db
          .from('evening_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        db
          .from('user_profiles')
          .select(
            'created_at, current_streak, unlocked_features, profile_completed_at, timezone, badges, has_seen_morning_tour, founder_personality, total_quick_wins, archetype_updated_at'
          )
          .eq('id', userId)
          .maybeSingle(),
        db
          .from('task_postponements')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

    const totalTasks = tasksRes.count ?? 0
    const completedTasks = tasksCompletedRes.count ?? 0
    const totalDecisions = decisionsRes.count ?? 0
    const totalEvenings = eveningsRes.count ?? 0
    const postponedTasks = postponedRes.count ?? 0

    const streakFresh = await calculateStreakForUser(db, userId)

    const profileRaw = profileRes.data as UserProfileAccessRow | null
    const storedStreak = profileRaw?.current_streak
    const displayCurrentStreak =
      storedStreak != null && Number.isFinite(Number(storedStreak))
        ? Number(storedStreak)
        : streakFresh.currentStreak

    if ([7, 30, 60, 90].includes(displayCurrentStreak)) {
      try {
        const ctx = await buildPersonalizedEmailContext(userId)
        const authRow = await db.auth.admin.getUserById(userId)
        const rendered = renderEmailTemplate(
          'streak_milestone',
          {
            name: ctx.userName,
            email: authRow.data.user?.email,
            login_count: ctx.loginCount,
          },
          { streak: displayCurrentStreak }
        )
        await sendEmailWithTracking({
          userId,
          emailType: 'streak_milestone',
          dateKey: `streak_${displayCurrentStreak}`,
          ...rendered,
        })
      } catch {
        // non-blocking
      }
    }

    const profile =
      profileRaw != null
        ? { ...profileRaw, current_streak: displayCurrentStreak }
        : null
    const createdAt = profile?.created_at ? new Date(profile.created_at) : null
    const userTimeZone = getUserTimezoneFromProfile(profile)

    const daysActive = getUserDaysActiveCalendar(profile?.created_at ?? null, userTimeZone)
    const daysWithEntries = await getDaysWithEntries(userId, db)

    const profileComplete = Boolean(profile?.profile_completed_at)

    const rawUnlockedFeatures = parseUnlockedFeatures(profile?.unlocked_features)
    let unlockedFeatures = reconcileUnlockedFeaturesForActivity(
      rawUnlockedFeatures,
      daysWithEntries,
      totalEvenings
    )
    const unlockNamesSig = (arr: { name: string }[]) => arr.map((x) => x.name).sort().join('\0')
    if (unlockNamesSig(unlockedFeatures) !== unlockNamesSig(rawUnlockedFeatures)) {
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: unlockedFeatures }).eq('id', userId)
      } catch {
        // still return reconciled list below
      }
    }

    /** Feature names present after reconcile — progressive unlocks below add to this set for UI "new this run". */
    const featureNamesBeforeProgressiveUnlocks = new Set(unlockedFeatures.map((f) => f.name))

    const needsFounderArchetypePreview =
      daysWithEntries >= ARCHETYPE_PREVIEW_MIN_DAYS && !unlockedFeatures.some((f) => f?.name === 'founder_archetype')

    if (needsFounderArchetypePreview) {
      const nowIso = new Date().toISOString()
      const founderArchetypeFeature = {
        name: 'founder_archetype',
        label: 'Founder Archetype (Preview)',
        description: 'Emerging archetype preview — full profile at 31 days with entries',
        icon: '🏷️',
        unlocked_at: nowIso,
      }

      try {
        await insertUserUnlock(db, userId, 'founder_archetype', 'feature', nowIso)
      } catch {
        // Non-critical
      }

      const updatedUnlockedFeatures = [...unlockedFeatures, founderArchetypeFeature]
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: updatedUnlockedFeatures }).eq('id', userId)
      } catch {
        // If update fails, journey still returns computed next unlocks.
      }

      unlockedFeatures.push(founderArchetypeFeature)
    }

    const needsFounderArchetypeFull =
      daysWithEntries >= ARCHETYPE_FULL_MIN_DAYS && !unlockedFeatures.some((f) => f?.name === 'founder_archetype_full')

    if (needsFounderArchetypeFull) {
      const nowIso = new Date().toISOString()
      const fullFeature = {
        name: 'founder_archetype_full',
        label: 'Founder Archetype (Full)',
        description: 'Full archetype profile and breakdown',
        icon: '🔮',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'founder_archetype_full', 'feature', nowIso)
      } catch {
        // ignore
      }
      const updatedFull = [...unlockedFeatures, fullFeature]
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: updatedFull }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(fullFeature)
      await sendFounderArchetypeFullEmail(userId, daysWithEntries)
    }

    const needsEnergyTrendsUnlock =
      daysWithEntries >= SCHEDULE_ENERGY_MIN_DAYS && !unlockedFeatures.some((f) => f?.name === 'energy_trends')

    if (needsEnergyTrendsUnlock) {
      const nowIso = new Date().toISOString()
      const energyFeature = {
        name: 'energy_trends',
        label: 'Energy & Mood Trend',
        description: 'See how your energy and mood move together over time',
        icon: '📊',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'energy_trends', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }
      const updated = [...unlockedFeatures, energyFeature]
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: updated }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(energyFeature)
    }

    const needsFirstGlimpseUnlock =
      totalEvenings >= FIRST_GLIMPSE_MIN_EVENINGS && !unlockedFeatures.some((f) => f?.name === 'first_glimpse')

    if (needsFirstGlimpseUnlock) {
      const nowIso = new Date().toISOString()
      const firstGlimpseFeature = {
        name: 'first_glimpse',
        label: 'First Glimpse',
        description: 'Mrs. Deer mirrors your first evening and hooks you into the daily cycle',
        icon: '🔓',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'first_glimpse', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }
      const updated = [...unlockedFeatures, firstGlimpseFeature]
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: updated }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(firstGlimpseFeature)
    }

    const needsYourStorySoFarUnlock =
      daysWithEntries >= SCHEDULE_STORY_SO_FAR_DAY &&
      !unlockedFeatures.some((f) => f?.name === 'your_story_so_far')

    if (needsYourStorySoFarUnlock) {
      const nowIso = new Date().toISOString()
      const yourStoryFeature = {
        name: 'your_story_so_far',
        label: 'Your Story So Far',
        description: 'A thread of recent wins from your evening reflections',
        icon: '📖',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'your_story_so_far', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }
      const updatedStory = [...unlockedFeatures, yourStoryFeature]
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: updatedStory }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(yourStoryFeature)
    }

    const needsDecisionStyleUnlock =
      daysWithEntries >= DECISION_STYLE_MIN_DAYS && !unlockedFeatures.some((f) => f?.name === 'decision_style')

    if (needsDecisionStyleUnlock) {
      const nowIso = new Date().toISOString()
      const decisionFeature = {
        name: 'decision_style',
        label: 'Decision Style',
        description: 'Your strategic vs tactical decision mix',
        icon: '🎯',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'decision_style', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }
      const updated = [...unlockedFeatures, decisionFeature]
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: updated }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(decisionFeature)
    }

    const needsPostponementUnlock =
      daysWithEntries >= POSTPONEMENT_MIN_DAYS && !unlockedFeatures.some((f) => f?.name === 'postponement_patterns')

    if (needsPostponementUnlock) {
      const nowIso = new Date().toISOString()
      const postponementFeature = {
        name: 'postponement_patterns',
        label: 'Postponement Patterns',
        description: 'Understand what you tend to delay — and why',
        icon: '⏳',
        unlocked_at: nowIso,
      }

      try {
        await insertUserUnlock(db, userId, 'postponement_patterns', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }

      const updatedUnlockedFeatures = [...unlockedFeatures, postponementFeature]
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: updatedUnlockedFeatures }).eq('id', userId)
      } catch {
        // ignore
      }

      unlockedFeatures.push(postponementFeature)
    }

    const needsCelebrationGapUnlock =
      daysWithEntries >= CELEBRATION_GAP_MIN_DAYS && !unlockedFeatures.some((f) => f?.name === 'celebration_gap')

    if (needsCelebrationGapUnlock) {
      const nowIso = new Date().toISOString()
      const celebrationGapFeature = {
        name: 'celebration_gap',
        label: 'Celebration Gap',
        description: 'Hidden win mirror on one recent lesson',
        icon: '🪞',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'celebration_gap', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }
      const updated = [...unlockedFeatures, celebrationGapFeature]
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: updated }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(celebrationGapFeature)
    }

    const needsUnseenWinsUnlock =
      daysWithEntries >= SCHEDULE_UNSEEN_WINS_DAY && !unlockedFeatures.some((f) => f?.name === 'unseen_wins')

    if (needsUnseenWinsUnlock) {
      const nowIso = new Date().toISOString()
      const unseenWinsFeature = {
        name: 'unseen_wins',
        label: 'Unseen Wins',
        description: 'Mrs. Deer’s hidden pattern in your rhythm',
        icon: '✨',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'unseen_wins', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }
      const updatedUnseen = [...unlockedFeatures, unseenWinsFeature]
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: updatedUnseen }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(unseenWinsFeature)
    }

    const needsRecurringQuestionUnlock =
      daysWithEntries >= RECURRING_QUESTION_MIN_DAYS && !unlockedFeatures.some((f) => f?.name === 'recurring_question')

    if (needsRecurringQuestionUnlock) {
      const nowIso = new Date().toISOString()
      const recurringQuestionFeature = {
        name: 'recurring_question',
        label: 'Recurring Question',
        description: 'Questions you ask yourself again and again in reflections',
        icon: '💫',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'recurring_question', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }
      const updated = [...unlockedFeatures, recurringQuestionFeature]
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: updated }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(recurringQuestionFeature)
    }

    const needsWeeklyInsightUnlock =
      daysWithEntries >= WEEKLY_INSIGHT_MIN_DAYS && !unlockedFeatures.some((f) => f?.name === 'weekly_insight')

    if (needsWeeklyInsightUnlock) {
      const nowIso = new Date().toISOString()
      const row = {
        name: 'weekly_insight',
        label: 'Weekly Insight',
        description: 'Mrs. Deer’s weekly reflection on your rhythm',
        icon: '📅',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'weekly_insight', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: [...unlockedFeatures, row] }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(row)
      await sendInsightFirstUnlockEmail({ userId, kind: 'weekly', daysWithEntries })
    }

    const needsMonthlyInsightUnlock =
      daysWithEntries >= MONTHLY_INSIGHT_MIN_DAYS && !unlockedFeatures.some((f) => f?.name === 'monthly_insight')

    if (needsMonthlyInsightUnlock) {
      const nowIso = new Date().toISOString()
      const row = {
        name: 'monthly_insight',
        label: 'Monthly Insight',
        description: 'Deeper monthly narrative from your wins and lessons',
        icon: '🌙',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'monthly_insight', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: [...unlockedFeatures, row] }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(row)
      await sendInsightFirstUnlockEmail({ userId, kind: 'monthly', daysWithEntries })
    }

    const needsQuarterlyInsightUnlock =
      daysWithEntries >= QUARTERLY_INSIGHT_MIN_DAYS && !unlockedFeatures.some((f) => f?.name === 'quarterly_insight')

    if (needsQuarterlyInsightUnlock) {
      const nowIso = new Date().toISOString()
      const row = {
        name: 'quarterly_insight',
        label: 'Quarterly Trajectory',
        description: 'Quarter-level arc and intention',
        icon: '📈',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'quarterly_insight', 'feature', nowIso)
      } catch {
        // ignore duplicates
      }
      try {
        await dbProfileWrites.from('user_profiles').update({ unlocked_features: [...unlockedFeatures, row] }).eq('id', userId)
      } catch {
        // ignore
      }
      unlockedFeatures.push(row)
      await sendInsightFirstUnlockEmail({ userId, kind: 'quarterly', daysWithEntries })
    }

    const archetypeStatus = getArchetypeJourneyStatus(daysWithEntries)
    const { badges, newlyUnlocked } = await checkAndPersistBadgeUnlocks({
      db,
      userId,
      profile,
      counts: {
        totalTasks,
        totalDecisions,
        totalEvenings,
        daysActive,
        completedTasks,
      },
      unlockedFeatures,
      archetypeStatus,
    })

    // `unlockedFeatures` parsed above; keep it in sync when auto-unlocking.

    const nextUnlocks = [
      {
        id: 'first_glimpse',
        name: 'First Glimpse',
        icon: '🔓',
        requirement: 'Complete your first evening reflection',
        progress: Math.min(totalEvenings, FIRST_GLIMPSE_MIN_EVENINGS),
        target: FIRST_GLIMPSE_MIN_EVENINGS,
        estimatedDays: Math.max(0, FIRST_GLIMPSE_MIN_EVENINGS - totalEvenings),
      },
      {
        id: 'founder_story',
        name: 'Founder Story',
        icon: '📖',
        requirement: 'Complete your founder profile (all sections)',
        progress: profileComplete ? 1 : 0,
        target: 1,
        estimatedDays: null,
      },
      {
        id: 'morning_insights',
        name: 'Morning insights',
        icon: '🌅',
        requirement: 'After your first full day (morning + evening)',
        progress:
          (daysWithEntries >= MORNING_INSIGHTS_MIN_DAYS ? 1 : 0) +
          (totalEvenings >= FIRST_GLIMPSE_MIN_EVENINGS ? 1 : 0),
        target: 2,
        estimatedDays: isMorningInsightsUnlocked(daysWithEntries, totalEvenings)
          ? 0
          : daysWithEntries < MORNING_INSIGHTS_MIN_DAYS
            ? 1
            : 0,
      },
      {
        id: 'your_story_so_far',
        name: 'Your Story So Far',
        icon: '📚',
        requirement: `${SCHEDULE_STORY_SO_FAR_DAY} days with entries`,
        progress: Math.min(daysWithEntries, SCHEDULE_STORY_SO_FAR_DAY),
        target: SCHEDULE_STORY_SO_FAR_DAY,
        estimatedDays: Math.max(0, SCHEDULE_STORY_SO_FAR_DAY - daysWithEntries),
      },
      {
        id: 'weekly_insight',
        name: 'Weekly Insight',
        icon: '📅',
        requirement: `${WEEKLY_INSIGHT_MIN_DAYS} days with entries`,
        progress: Math.min(daysWithEntries, WEEKLY_INSIGHT_MIN_DAYS),
        target: WEEKLY_INSIGHT_MIN_DAYS,
        estimatedDays: Math.max(0, WEEKLY_INSIGHT_MIN_DAYS - daysWithEntries),
      },
      {
        id: 'celebration_gap',
        name: 'Celebration Gap',
        icon: '🪞',
        requirement: `${CELEBRATION_GAP_MIN_DAYS} days with entries`,
        progress: Math.min(daysWithEntries, CELEBRATION_GAP_MIN_DAYS),
        target: CELEBRATION_GAP_MIN_DAYS,
        estimatedDays: Math.max(0, CELEBRATION_GAP_MIN_DAYS - daysWithEntries),
      },
      {
        id: 'unseen_wins',
        name: 'Unseen Wins',
        icon: '✨',
        requirement: `${SCHEDULE_UNSEEN_WINS_DAY} days with entries`,
        progress: Math.min(daysWithEntries, SCHEDULE_UNSEEN_WINS_DAY),
        target: SCHEDULE_UNSEEN_WINS_DAY,
        estimatedDays: Math.max(0, SCHEDULE_UNSEEN_WINS_DAY - daysWithEntries),
      },
      {
        id: 'energy_trends',
        name: 'Energy & Mood Trend',
        icon: '📊',
        requirement: `${SCHEDULE_ENERGY_MIN_DAYS} days with entries`,
        progress: Math.min(daysWithEntries, SCHEDULE_ENERGY_MIN_DAYS),
        target: SCHEDULE_ENERGY_MIN_DAYS,
        estimatedDays: Math.max(0, SCHEDULE_ENERGY_MIN_DAYS - daysWithEntries),
      },
      {
        id: 'decision_style',
        name: 'Decision Style',
        icon: '🎯',
        requirement: `${DECISION_STYLE_MIN_DAYS} days with entries`,
        progress: Math.min(daysWithEntries, DECISION_STYLE_MIN_DAYS),
        target: DECISION_STYLE_MIN_DAYS,
        estimatedDays: Math.max(0, DECISION_STYLE_MIN_DAYS - daysWithEntries),
      },
      {
        id: 'monthly_insight',
        name: 'Monthly Insight',
        icon: '🌙',
        requirement: `${MONTHLY_INSIGHT_MIN_DAYS} days with entries`,
        progress: Math.min(daysWithEntries, MONTHLY_INSIGHT_MIN_DAYS),
        target: MONTHLY_INSIGHT_MIN_DAYS,
        estimatedDays: Math.max(0, MONTHLY_INSIGHT_MIN_DAYS - daysWithEntries),
      },
      {
        id: 'postponement_patterns',
        name: 'Postponement Patterns',
        icon: '⏳',
        requirement: `${POSTPONEMENT_MIN_DAYS} days with entries`,
        progress: Math.min(daysWithEntries, POSTPONEMENT_MIN_DAYS),
        target: POSTPONEMENT_MIN_DAYS,
        estimatedDays: Math.max(0, POSTPONEMENT_MIN_DAYS - daysWithEntries),
      },
      {
        id: 'recurring_question',
        name: 'Recurring Question',
        icon: '💫',
        requirement: `${RECURRING_QUESTION_MIN_DAYS} days with entries`,
        progress: Math.min(daysWithEntries, RECURRING_QUESTION_MIN_DAYS),
        target: RECURRING_QUESTION_MIN_DAYS,
        estimatedDays: Math.max(0, RECURRING_QUESTION_MIN_DAYS - daysWithEntries),
      },
      {
        id: 'founder_archetype',
        name: 'Founder Archetype (Preview)',
        icon: '🏷️',
        requirement: `${ARCHETYPE_PREVIEW_MIN_DAYS} days with entries`,
        progress: Math.min(daysWithEntries, ARCHETYPE_PREVIEW_MIN_DAYS),
        target: ARCHETYPE_PREVIEW_MIN_DAYS,
        estimatedDays: Math.max(0, ARCHETYPE_PREVIEW_MIN_DAYS - daysWithEntries),
      },
      {
        id: 'founder_archetype_full',
        name: 'Founder Archetype (Full)',
        icon: '🔮',
        requirement: `${ARCHETYPE_FULL_MIN_DAYS} days with entries`,
        progress: Math.min(daysWithEntries, ARCHETYPE_FULL_MIN_DAYS),
        target: ARCHETYPE_FULL_MIN_DAYS,
        estimatedDays: Math.max(0, ARCHETYPE_FULL_MIN_DAYS - daysWithEntries),
      },
      {
        id: 'quarterly_insight',
        name: 'Quarterly Trajectory',
        icon: '📈',
        requirement: `${QUARTERLY_INSIGHT_MIN_DAYS} days with entries`,
        progress: Math.min(daysWithEntries, QUARTERLY_INSIGHT_MIN_DAYS),
        target: QUARTERLY_INSIGHT_MIN_DAYS,
        estimatedDays: Math.max(0, QUARTERLY_INSIGHT_MIN_DAYS - daysWithEntries),
      },
    ].filter((u) => {
      if (u.progress >= u.target) return false
      const earnedBadge = badges.some((b) => b.name === u.id)
      const earnedFeature = unlockedFeatures.some((f) => f.name === u.id)
      if (earnedBadge || earnedFeature) return false
      return true
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('[Journey] daysActive (calendar):', daysActive)
      console.log('[Journey] daysWithEntries (activity):', daysWithEntries)
      console.log(
        '[Journey] streak stored:',
        storedStreak,
        'recalculated:',
        streakFresh.currentStreak,
        'display:',
        displayCurrentStreak,
        'last_review_date:',
        streakFresh.lastReviewDate
      )
    }

    const milestones = {
      currentStreak: displayCurrentStreak,
      totalTasks,
      totalDecisions,
      totalEvenings,
      daysActive,
      daysWithEntries,
      postponedTasks,
      nextMilestones: computeNextMilestones({
        currentStreak: displayCurrentStreak,
        totalTasks,
        totalDecisions,
        totalEvenings,
      }),
    }

    const schedule = computeFounderDnaSchedule({
      now: new Date(),
      createdAt,
      daysActive: daysWithEntries,
      totalEvenings,
      totalDecisions,
      badges,
      unlockedFeatures,
      archetypeStatus,
      profileComplete,
      userTimeZone,
      archetypeUpdatedAt: (profile as { archetype_updated_at?: string | null })?.archetype_updated_at ?? null,
    })

    const newlyUnlockedFeatures = unlockedFeatures.filter((f) => !featureNamesBeforeProgressiveUnlocks.has(f.name))

    return {
      badges,
      newlyUnlockedBadges: newlyUnlocked,
      newlyUnlockedFeatures,
      unlockedFeatures,
      nextUnlocks,
      milestones,
      archetype: {
        status: archetypeStatus,
        daysActive: daysWithEntries,
        daysUntilPreview: Math.max(0, ARCHETYPE_PREVIEW_MIN_DAYS - daysWithEntries),
        daysUntilFull: Math.max(0, ARCHETYPE_FULL_MIN_DAYS - daysWithEntries),
        previewUnlocked: unlockedFeatures.some((f) => f.name === 'founder_archetype'),
        fullUnlocked: unlockedFeatures.some((f) => f.name === 'founder_archetype_full'),
      },
      schedule,
    }
}
