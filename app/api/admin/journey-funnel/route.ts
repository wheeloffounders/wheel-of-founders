/**
 * User journey funnel analysis (dev-only).
 * Returns stage counts, drop-offs, and user-by-user breakdown.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminApiRequest } from '@/lib/admin'
import { isWhitelistAdminEmail } from '@/lib/admin-emails'
import { adminSupabase } from '@/lib/supabase/admin'
import { subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

type FunnelStage = {
  stage: string
  count: number
  dropOff: number
  pctRemaining: number
}

type DroppedUser = {
  id: string
  email: string | null
  timeOnPage: number | null
  interactions: string
  lastActive: string | null
}

type StageInsight = {
  fromStage: string
  toStage: string
  fromCount: number
  toCount: number
  dropOff: number
  dropPct: number
  whatHappened: string
  problem: string
  solution: string[]
  affectedUsers: Array<{ id: string; email: string | null }>
  droppedUsers: DroppedUser[]
  patternSummary: string | null
}

const STAGE_SOLUTIONS: Record<string, { problem: string; solution: string[] }> = {
  'Signed up → Viewed goal': {
    problem: 'Users signed up but never reached the goal page. They may have bounced or gotten lost.',
    solution: [
      'Verify post-signup redirect goes directly to /onboarding/goal',
      'Add a welcome email with "Continue setup" link',
      'Check for auth/session issues blocking the redirect',
    ],
  },
  'Viewed goal → Completed goal': {
    problem: 'Users viewed the goal form but didn\'t submit. The form may feel overwhelming or unclear.',
    solution: [
      'Add placeholder examples based on common founder goals',
      'Show character count or progress indicator',
      'Consider shortening the initial ask or making it optional',
    ],
  },
  'Completed goal → Viewed personalization': {
    problem: 'Users completed goal but didn\'t continue to personalization. Friction or confusion after submit.',
    solution: [
      'Auto-redirect immediately after goal submit (no extra clicks)',
      'Add a brief "One more step..." transition screen',
      'Check for errors on the redirect to personalization',
    ],
  },
  'Viewed personalization → Completed personalization': {
    problem: 'Users viewed personalization but didn\'t complete. Form may be too long or unclear.',
    solution: [
      'Reduce number of required selections',
      'Show progress (e.g. "Step 2 of 3")',
      'Add "Skip for now" option with clear value of completing',
    ],
  },
  'Completed personalization → Started tutorial': {
    problem: 'Users finished onboarding but never started the tutorial. They may not know it exists.',
    solution: [
      'Auto-redirect to morning page with ?tutorial=start',
      'Add explicit "Take the 2-min tour" CTA on first dashboard view',
      'Send them directly to morning page—tutorial can start there',
    ],
  },
  'Started tutorial → Tutorial step 1 (Today)': {
    problem: 'Users started the tutorial but didn\'t complete step 1. The first step may not be clear.',
    solution: [
      'Ensure the Today button is visible and highlighted',
      'Add a brief "Tap here to start" nudge',
      'Check that the tooltip targets the correct element',
    ],
  },
  'Tutorial step 1 (Today) → Tutorial step 2 (Morning menu)': {
    problem: 'Users completed step 1 but dropped at step 2. The menu may not have opened.',
    solution: [
      'Verify the Today button click opens the menu before showing step 2',
      'Add a short delay for the menu to render',
      'Consider combining steps 1 and 2 if they\'re closely related',
    ],
  },
  'Tutorial step 2 (Morning menu) → Tutorial step 3 (Power list)': {
    problem: 'Users dropped between menu and power list. Navigation may be confusing.',
    solution: [
      'Ensure the Morning link is clearly visible in the menu',
      'Add a visual highlight on the Morning nav item',
      'Consider auto-navigating to morning if they\'re not there',
    ],
  },
  'Tutorial step 3 (Power list) → Tutorial step 4 (Decision card)': {
    problem: 'Users viewed the power list but didn\'t reach the decision step.',
    solution: [
      'Make the flow from list to decision more obvious',
      'Ensure the decision card is visible before the step shows',
      'Add a "Next" or progress indicator',
    ],
  },
  'Tutorial step 4 (Decision card) → Tutorial step 5 (Save)': {
    problem: 'Users reached the decision step but didn\'t complete the save step.',
    solution: [
      'Highlight the Save button prominently',
      'Add "One more tap to finish!" messaging',
      'Ensure the save action is clear and low-friction',
    ],
  },
  'Tutorial step 5 (Save) → Completed tutorial': {
    problem: 'Users reached the save step but didn\'t complete the tutorial.',
    solution: [
      'Make the final step feel like a clear win',
      'Ensure Save triggers tutorial completion',
      'Add celebration/confirmation when they finish',
    ],
  },
  'Started tutorial → Completed tutorial': {
    problem: 'Users quit mid-tutorial. Steps may be too long, confusing, or they hit a blocker.',
    solution: [
      'Shorten each step—one clear action per step',
      'Add "Skip tour" option (some prefer to explore)',
      'Ensure all target elements exist before showing each step',
    ],
  },
  'Completed tutorial → Viewed morning page': {
    problem: 'Users finished onboarding but never viewed the morning page. They completed setup but never engaged.',
    solution: [
      'Add clear "Start Your First Morning" CTA at end of tutorial',
      'Redirect directly to /morning after tutorial (no extra clicks)',
      'Add micro-lesson: "You\'re all set! Now let\'s plan your first day..."',
    ],
  },
  'Viewed morning page → Typed first task': {
    problem: 'Users landed on morning page and left without typing. They don\'t know what to write.',
    solution: [
      'Add placeholder examples based on their goal',
      'Show micro-lesson: "Start with one task that actually matters today"',
      'Auto-focus the first task input on load',
    ],
  },
  'Typed first task → Saved first morning': {
    problem: 'Users typed something but didn\'t save. Save action may be unclear or they got distracted.',
    solution: [
      'Make the Save button more prominent (sticky, highlighted)',
      'Add "Almost there! Tap Save to lock in your plan" nudge',
      'Consider auto-save draft to reduce perceived commitment',
    ],
  },
  'Saved first morning → Viewed evening page': {
    problem: 'Users saved their morning plan but never came back for evening. They may not know the flow.',
    solution: [
      'Show "Come back tonight to reflect" message after morning save',
      'Send reminder email/notification in evening',
      'Add evening prompt in post-morning insight',
    ],
  },
  'Viewed evening page → Saved first evening': {
    problem: 'Users viewed evening page but didn\'t save. Form may feel long or low-value.',
    solution: [
      'Simplify evening form—start with mood + one reflection',
      'Show value: "This helps Mrs. Deer learn your patterns"',
      'Add progress indicator if form has multiple steps',
    ],
  },
  'Saved first evening → Returned next day': {
    problem: 'Users completed one full day but didn\'t return. Habit not formed yet.',
    solution: [
      'Send morning reminder at their preferred time',
      'Add streak counter to create habit loop',
      'Consider a "See you tomorrow!" CTA with calendar link',
    ],
  },
}

export async function GET(req: NextRequest) {
  if (!(await authorizeAdminApiRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = adminSupabase
  if (!db) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  }

  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '90', 10)
  const userEmailParam = req.nextUrl.searchParams.get('userEmail')?.trim()
  const since = subDays(new Date(), days).toISOString()

  // 1. Get all users (excluding admin)
  const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 1000 })
  const allUsers = (authUsers?.users ?? []).filter((u) => u.email && !isWhitelistAdminEmail(u.email))
  const userIds = allUsers.map((u) => u.id)

  if (userIds.length === 0) {
    return NextResponse.json({
      funnel: [],
      users: [],
      totalSignUps: 0,
      biggestDrop: null,
    })
  }

  // 2. Profiles (goal, personalization, onboarding)
  const { data: profiles } = await db.from('user_profiles').select('id, primary_goal_text, struggles, onboarding_step, onboarding_completed_at, last_review_date').in('id', userIds)
  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))

  // 3. feature_usage user_journey events
  const { data: journeyEvents } = await (db as any)
    .from('feature_usage')
    .select('user_id, action, created_at')
    .eq('feature_name', 'user_journey')
    .in('user_id', userIds)
    .gte('created_at', since)

  // 4. feature_usage morning_plan / evening_review (for saved_morning, saved_evening if not in user_journey)
  const { data: morningSaves } = await (db as any)
    .from('feature_usage')
    .select('user_id, created_at')
    .eq('feature_name', 'morning_plan')
    .eq('action', 'save')
    .in('user_id', userIds)
    .gte('created_at', since)

  const { data: eveningSaves } = await (db as any)
    .from('feature_usage')
    .select('user_id, created_at')
    .eq('feature_name', 'evening_review')
    .eq('action', 'save')
    .in('user_id', userIds)
    .gte('created_at', since)

  // 5. page_views (with duration for dropped-user details)
  const { data: pageViews } = await (db as any)
    .from('page_views')
    .select('user_id, path, entered_at, exited_at, duration_seconds')
    .in('user_id', userIds)
    .gte('entered_at', since)

  // 5b. funnel_events for interaction detection (morning_flow, evening_flow)
  let funnelEvents: unknown[] | null = null
  try {
    const res = await (db as any)
      .from('funnel_events')
      .select('user_id, funnel_name, step_name, completed_at')
      .in('user_id', userIds)
      .gte('completed_at', since)
    funnelEvents = res.data
  } catch (e) {
    console.warn('[journey-funnel] funnel_events query failed:', e)
  }

  // 6. morning_tasks and evening_reviews for "returned next day"
  const { data: morningTasks } = await (db as any)
    .from('morning_tasks')
    .select('user_id, plan_date')
    .in('user_id', userIds)
    .gte('plan_date', since.slice(0, 10))

  const journeyByUser = new Map<string, Set<string>>()
  for (const e of journeyEvents ?? []) {
    const uid = (e as { user_id?: string }).user_id
    if (!uid) continue
    if (!journeyByUser.has(uid)) journeyByUser.set(uid, new Set())
    journeyByUser.get(uid)!.add((e as { action?: string }).action ?? '')
  }

  // Add view events from page_views
  for (const pv of pageViews ?? []) {
    const uid = (pv as { user_id?: string }).user_id
    const path = (pv as { path?: string }).path
    if (!uid || !path) continue
    if (!journeyByUser.has(uid)) journeyByUser.set(uid, new Set())
    if (path === '/onboarding/goal') journeyByUser.get(uid)!.add('viewed_goal')
    if (path === '/onboarding/personalization') journeyByUser.get(uid)!.add('viewed_personalization')
    if (path === '/morning') journeyByUser.get(uid)!.add('viewed_morning')
    if (path === '/evening') journeyByUser.get(uid)!.add('viewed_evening')
  }

  // Backfill viewed_morning from funnel_events when page_views is empty (common if tracking was broken)
  for (const e of funnelEvents ?? []) {
    const uid = (e as { user_id?: string }).user_id
    const step = (e as { step_name?: string }).step_name
    if (!uid) continue
    if (step === 'morning_page_view') {
      if (!journeyByUser.has(uid)) journeyByUser.set(uid, new Set())
      journeyByUser.get(uid)!.add('viewed_morning')
    }
    if (step === 'evening_page_view') {
      if (!journeyByUser.has(uid)) journeyByUser.set(uid, new Set())
      journeyByUser.get(uid)!.add('viewed_evening')
    }
  }

  // Add saved_morning from feature_usage morning_plan
  for (const m of morningSaves ?? []) {
    const uid = (m as { user_id?: string }).user_id
    if (!uid) continue
    if (!journeyByUser.has(uid)) journeyByUser.set(uid, new Set())
    journeyByUser.get(uid)!.add('saved_morning')
  }

  // Add saved_evening from feature_usage evening_review
  for (const e of eveningSaves ?? []) {
    const uid = (e as { user_id?: string }).user_id
    if (!uid) continue
    if (!journeyByUser.has(uid)) journeyByUser.set(uid, new Set())
    journeyByUser.get(uid)!.add('saved_evening')
  }

  // Helper: user has any of these journey steps
  const hasAny = (uid: string, steps: string[]) =>
    steps.some((s) => journeyByUser.get(uid)?.has(s))

  // Compute "reached stage" for each user.
  // Infer view/start from complete events so funnel is never contradictory.
  const stages: { key: string; label: string; check: (uid: string) => boolean }[] = [
    { key: 'signed_up', label: 'Signed up', check: () => true },
    {
      key: 'viewed_goal',
      label: 'Viewed goal',
      check: (uid) =>
        hasAny(uid, ['viewed_goal', 'completed_goal']) ||
        !!(profileMap.get(uid) as { primary_goal_text?: string })?.primary_goal_text?.trim(),
    },
    { key: 'completed_goal', label: 'Completed goal', check: (uid) => (profileMap.get(uid) as { primary_goal_text?: string })?.primary_goal_text?.trim() ? true : journeyByUser.get(uid)?.has('completed_goal') ?? false },
    {
      key: 'viewed_personalization',
      label: 'Viewed personalization',
      check: (uid) =>
        hasAny(uid, ['viewed_personalization', 'completed_personalization']) ||
        !!((profileMap.get(uid) as { struggles?: string[]; onboarding_step?: number })?.struggles?.length || ((profileMap.get(uid) as { onboarding_step?: number })?.onboarding_step ?? 0) >= 2),
    },
    { key: 'completed_personalization', label: 'Completed personalization', check: (uid) => {
      const p = profileMap.get(uid) as { struggles?: string[]; onboarding_step?: number } | undefined
      const fromProfile = !!(p?.struggles?.length || ((p?.onboarding_step ?? 0) >= 2))
      const fromJourney = journeyByUser.get(uid)?.has('completed_personalization')
      return fromProfile || fromJourney === true
    }},
    {
      key: 'started_tutorial',
      label: 'Started tutorial',
      check: (uid) =>
        hasAny(uid, [
          'started_tutorial',
          'tutorial_step_1',
          'tutorial_step_2',
          'tutorial_step_3',
          'tutorial_step_4',
          'tutorial_step_5',
          'tutorial_step_6',
          'tutorial_step_7',
          'completed_tutorial',
        ]) ||
        !!(profileMap.get(uid) as { onboarding_completed_at?: string })?.onboarding_completed_at,
    },
    { key: 'tutorial_step_1', label: 'Tutorial step 1 (Today)', check: (uid) => journeyByUser.get(uid)?.has('tutorial_step_1') ?? false },
    { key: 'tutorial_step_2', label: 'Tutorial step 2 (Morning menu)', check: (uid) => journeyByUser.get(uid)?.has('tutorial_step_2') ?? false },
    { key: 'tutorial_step_3', label: 'Tutorial step 3 (Brain dump)', check: (uid) => journeyByUser.get(uid)?.has('tutorial_step_3') ?? false },
    { key: 'tutorial_step_4', label: 'Tutorial step 4 (Intention)', check: (uid) => journeyByUser.get(uid)?.has('tutorial_step_4') ?? false },
    { key: 'tutorial_step_5', label: 'Tutorial step 5 (Power list)', check: (uid) => journeyByUser.get(uid)?.has('tutorial_step_5') ?? false },
    { key: 'tutorial_step_6', label: 'Tutorial step 6 (Save)', check: (uid) => journeyByUser.get(uid)?.has('tutorial_step_6') ?? false },
    { key: 'tutorial_step_7', label: 'Tutorial step 7 (Save, legacy)', check: (uid) => journeyByUser.get(uid)?.has('tutorial_step_7') ?? false },
    { key: 'completed_tutorial', label: 'Completed tutorial', check: (uid) => (profileMap.get(uid) as { onboarding_completed_at?: string })?.onboarding_completed_at ? true : journeyByUser.get(uid)?.has('completed_tutorial') ?? false },
    {
      key: 'viewed_morning',
      label: 'Viewed morning page',
      check: (uid) =>
        hasAny(uid, ['viewed_morning', 'typed_first_task', 'saved_morning']),
    },
    {
      key: 'typed_first_task',
      label: 'Typed first task',
      check: (uid) =>
        hasAny(uid, ['typed_first_task', 'saved_morning']),
    },
    { key: 'saved_morning', label: 'Saved first morning', check: (uid) => journeyByUser.get(uid)?.has('saved_morning') ?? false },
    {
      key: 'viewed_evening',
      label: 'Viewed evening page',
      check: (uid) =>
        hasAny(uid, ['viewed_evening', 'saved_evening']),
    },
    { key: 'saved_evening', label: 'Saved first evening', check: (uid) => journeyByUser.get(uid)?.has('saved_evening') ?? false },
    { key: 'returned_next_day', label: 'Returned next day', check: () => false }, // Handled separately via userActivityDates
  ]

  // Fix returned_next_day - we can't await in check. Precompute.
  const userActivityDates = new Map<string, Set<string>>()
  for (const t of morningTasks ?? []) {
    const uid = (t as { user_id?: string }).user_id
    const d = (t as { plan_date?: string }).plan_date
    if (!uid || !d) continue
    if (!userActivityDates.has(uid)) userActivityDates.set(uid, new Set())
    userActivityDates.get(uid)!.add(d)
  }
  const { data: evReviews } = await db.from('evening_reviews').select('user_id, review_date').in('user_id', userIds).gte('review_date', since.slice(0, 10))
  for (const r of evReviews ?? []) {
    const uid = (r as { user_id?: string }).user_id
    const d = (r as { review_date?: string }).review_date
    if (!uid || !d) continue
    if (!userActivityDates.has(uid)) userActivityDates.set(uid, new Set())
    userActivityDates.get(uid)!.add(d)
  }

  const funnel: FunnelStage[] = []
  const stageCounts: number[] = []
  const total = userIds.length
  let prevCount = total
  let biggestDrop: { stage: string; count: number } | null = null
  const userEmailMap = new Map<string, string>(allUsers.map((u) => [u.id, u.email ?? '']))

  for (let i = 0; i < stages.length; i++) {
    const s = stages[i]
    let count: number
    if (s.key === 'returned_next_day') {
      count = userIds.filter((uid) => (userActivityDates.get(uid)?.size ?? 0) >= 2).length
    } else {
      count = userIds.filter((uid) => s.check(uid)).length
    }
    const dropOff = prevCount - count
    if (dropOff > (biggestDrop?.count ?? 0)) biggestDrop = { stage: s.label, count: dropOff }
    funnel.push({
      stage: s.label,
      count,
      dropOff,
      pctRemaining: total > 0 ? Math.round((100 * count) / total * 10) / 10 : 0,
    })
    stageCounts.push(count)
    prevCount = count
  }

  // Build page view duration by user+path (best duration per user per path)
  const pageViewByUserPath = new Map<string, { duration: number | null; entered: string }>()
  for (const pv of pageViews ?? []) {
    const uid = (pv as { user_id?: string }).user_id
    const path = (pv as { path?: string }).path
    const entered = (pv as { entered_at?: string }).entered_at ?? ''
    const exited = (pv as { exited_at?: string }).exited_at
    const durationCol = (pv as { duration_seconds?: number }).duration_seconds
    if (!uid || !path) continue
    const key = `${uid}|${path}`
    let duration: number | null = durationCol ?? null
    if (duration == null && exited && entered) {
      const sec = (new Date(exited).getTime() - new Date(entered).getTime()) / 1000
      if (sec > 0 && sec < 86400) duration = Math.round(sec)
    }
    const existing = pageViewByUserPath.get(key)
    if (!existing || (duration != null && (existing.duration == null || duration > (existing.duration ?? 0)))) {
      pageViewByUserPath.set(key, { duration, entered })
    }
  }

  // Build user interactions from funnel_events + feature_usage
  const userInteractions = new Map<string, Set<string>>()
  for (const e of funnelEvents ?? []) {
    const uid = (e as { user_id?: string }).user_id
    const step = (e as { step_name?: string }).step_name
    if (!uid) continue
    if (!userInteractions.has(uid)) userInteractions.set(uid, new Set())
    if (step === 'power_list_engaged' || step === 'plan_complete' || step === 'journal_engaged' || step === 'review_complete') userInteractions.get(uid)!.add('clicked')
    if (step === 'morning_page_view' || step === 'evening_page_view') userInteractions.get(uid)!.add('viewed')
  }
  for (const e of journeyEvents ?? []) {
    const uid = (e as { user_id?: string }).user_id
    const action = (e as { action?: string }).action
    if (!uid) continue
    if (!userInteractions.has(uid)) userInteractions.set(uid, new Set())
    if (action === 'typed_first_task') userInteractions.get(uid)!.add('typed')
    if (action === 'viewed_morning') userInteractions.get(uid)!.add('viewed')
  }

  // Map transition to relevant path for time-on-page
  const transitionToPath: Record<string, string> = {
    'Viewed goal → Completed goal': '/onboarding/goal',
    'Viewed personalization → Completed personalization': '/onboarding/personalization',
    'Viewed morning page → Typed first task': '/morning',
    'Typed first task → Saved first morning': '/morning',
    'Viewed evening page → Saved first evening': '/evening',
  }

  // Build actionable insights for each transition with drop-off
  const stageInsights: StageInsight[] = []
  for (let i = 1; i < stages.length; i++) {
    const fromLabel = stages[i - 1]!.label
    const toLabel = stages[i]!.label
    const fromCount = stageCounts[i - 1]!
    const toCount = stageCounts[i]!
    const dropOff = fromCount - toCount
    if (dropOff <= 0) continue

    const transitionKey = `${fromLabel} → ${toLabel}`
    const template = STAGE_SOLUTIONS[transitionKey]
    const dropPct = fromCount > 0 ? Math.round((100 * dropOff) / fromCount) : 0

    // Users who reached fromStage but not toStage
    const fromCheck = stages[i - 1]!.check
    const passedToStage =
      stages[i]!.key === 'returned_next_day'
        ? (uid: string) => (userActivityDates.get(uid)?.size ?? 0) >= 2
        : stages[i]!.check
    const affectedIds = userIds.filter((uid) => fromCheck(uid) && !passedToStage(uid))
    const affectedUsers = affectedIds.map((id) => ({
      id,
      email: userEmailMap.get(id) || null,
    }))

    // Build droppedUsers with timeOnPage, interactions, lastActive
    const relevantPath = transitionToPath[transitionKey]
    const droppedUsers: DroppedUser[] = affectedIds.map((uid) => {
      const pvKey = relevantPath ? `${uid}|${relevantPath}` : ''
      const pv = relevantPath ? pageViewByUserPath.get(pvKey) : null
      const timeOnPage = pv?.duration ?? null
      const ints = userInteractions.get(uid)
      let interactions = 'None'
      if (ints?.has('typed')) interactions = 'Typed'
      else if (ints?.has('clicked')) interactions = 'Clicked'
      const lastReview = (profileMap.get(uid) as { last_review_date?: string })?.last_review_date
      const u = allUsers.find((x) => x.id === uid) as { last_sign_in_at?: string; created_at?: string } | undefined
      const lastActive = lastReview ?? u?.last_sign_in_at ?? u?.created_at ?? null

      return {
        id: uid,
        email: userEmailMap.get(uid) || null,
        timeOnPage,
        interactions,
        lastActive,
      }
    })

    // Pattern summary
    const withShortStay = droppedUsers.filter((d) => d.timeOnPage != null && d.timeOnPage < 30).length
    const withNoInteractions = droppedUsers.filter((d) => d.interactions === 'None').length
    let patternSummary: string | null = null
    if (droppedUsers.length > 0) {
      const parts: string[] = []
      if (withNoInteractions >= droppedUsers.length * 0.5) {
        parts.push(`${withNoInteractions}/${droppedUsers.length} users had no interactions`)
      }
      if (withShortStay >= droppedUsers.length * 0.5 && relevantPath) {
        parts.push(`${withShortStay}/${droppedUsers.length} left within 30 seconds`)
      }
      if (parts.length > 0) patternSummary = parts.join('. ')
    }

    const whatHappened = `${fromCount} users reached "${fromLabel}", but only ${toCount} reached "${toLabel}".`
    const problem = template?.problem ?? `${dropOff} users (${dropPct}%) dropped between these stages.`
    const solution = template?.solution ?? [
      'Review the flow between these stages',
      'Add clear CTAs and reduce friction',
      'Consider user interviews with affected users',
    ]

    stageInsights.push({
      fromStage: fromLabel,
      toStage: toLabel,
      fromCount,
      toCount,
      dropOff,
      dropPct,
      whatHappened,
      problem,
      solution,
      affectedUsers,
      droppedUsers,
      patternSummary,
    })
  }

  // User-by-user: current stage, last active, days since
  const userStages: Array<{
    id: string
    email: string | null
    currentStage: string
    lastActive: string | null
    daysSince: number | null
  }> = []

  for (const u of allUsers) {
    let currentStage = 'Signed up'
    for (let i = stages.length - 1; i >= 0; i--) {
      const s = stages[i]
      const reached =
        s.key === 'returned_next_day'
          ? (userActivityDates.get(u.id)?.size ?? 0) >= 2
          : s.check(u.id)
      if (reached) {
        currentStage = s.label
        break
      }
    }

    const lastReview = (profileMap.get(u.id) as { last_review_date?: string })?.last_review_date
    const lastCreated = u.created_at
    const lastActive = lastReview ?? lastCreated
    const daysSince = lastActive ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000) : null

    userStages.push({
      id: u.id,
      email: u.email ?? null,
      currentStage,
      lastActive: lastActive ?? null,
      daysSince,
    })
  }

  userStages.sort((a, b) => (a.daysSince ?? 999) - (b.daysSince ?? 999))

  // Debug: user journey breakdown for a specific email
  let userJourney: Record<string, unknown> | null = null
  if (userEmailParam) {
    const targetUser = allUsers.find((u) => u.email?.toLowerCase() === userEmailParam.toLowerCase())
    if (targetUser) {
      const uid = targetUser.id
      const journeySteps = journeyByUser.get(uid)
      const profile = profileMap.get(uid) as Record<string, unknown> | undefined
      const activityDates = userActivityDates.get(uid)

      const stageResults: Array<{ stage: string; passed: boolean; reason: string }> = []
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i]!
        let passed: boolean
        let reason: string

        if (s.key === 'returned_next_day') {
          passed = (activityDates?.size ?? 0) >= 2
          reason = passed
            ? `Has activity on ${activityDates?.size ?? 0} distinct dates`
            : `Only ${activityDates?.size ?? 0} date(s) of activity (need 2+)`
        } else {
          passed = s.check(uid)
          if (s.key === 'signed_up') reason = 'All users count'
          else if (s.key === 'viewed_goal')
            reason = passed
              ? `journey: ${[...(journeySteps ?? [])].filter((x) => ['viewed_goal', 'completed_goal'].includes(x)).join(', ') || 'none'}; profile.primary_goal_text: ${!!(profile?.primary_goal_text as string)?.trim()}`
              : 'No viewed_goal/completed_goal event and no primary_goal_text'
          else if (s.key === 'completed_goal')
            reason = passed
              ? `profile.primary_goal_text: ${!!(profile?.primary_goal_text as string)?.trim()}; journey.completed_goal: ${journeySteps?.has('completed_goal') ?? false}`
              : 'No primary_goal_text and no completed_goal event'
          else if (s.key === 'viewed_morning')
            reason = passed
              ? `journey: ${[...(journeySteps ?? [])].filter((x) => ['viewed_morning', 'typed_first_task', 'saved_morning'].includes(x)).join(', ') || 'none'}`
              : 'No viewed_morning, typed_first_task, or saved_morning'
          else if (s.key === 'typed_first_task')
            reason = passed
              ? `journey: ${[...(journeySteps ?? [])].filter((x) => ['typed_first_task', 'saved_morning'].includes(x)).join(', ') || 'none'}`
              : 'No typed_first_task or saved_morning'
          else if (s.key.startsWith('tutorial_step_'))
            reason = passed ? `journey.has('${s.key}'): true` : `journey.has('${s.key}'): false`
          else reason = passed ? `check(uid)=true` : `check(uid)=false`
        }

        stageResults.push({ stage: s.label, passed, reason })
      }

      userJourney = {
        email: targetUser.email,
        userId: uid,
        journeyEvents: journeySteps ? [...journeySteps] : [],
        profileRelevant: {
          primary_goal_text: !!(profile?.primary_goal_text as string)?.trim(),
          struggles_count: (profile?.struggles as string[] | undefined)?.length ?? 0,
          onboarding_step: profile?.onboarding_step ?? null,
          onboarding_completed_at: profile?.onboarding_completed_at ?? null,
          last_review_date: profile?.last_review_date ?? null,
        },
        activityDatesCount: activityDates?.size ?? 0,
        stageResults,
      }
    } else {
      userJourney = { error: `User not found: ${userEmailParam}` }
    }
  }

  return NextResponse.json({
    funnel,
    users: userStages,
    totalSignUps: total,
    biggestDrop,
    stageInsights,
    ...(userJourney && { userJourney }),
  })
}
