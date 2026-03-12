import { NextRequest, NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/supabase/server'
import { detectProcrastinationPatterns } from '@/lib/pattern-detection/procrastination'
import { generateAISuggestions } from '@/lib/ai/decision-suggestions'
import { getCache, setCache } from '@/lib/cache'
import { getServerSession } from '@/lib/server-auth'
import { generateExamplesForUser } from '@/lib/profile-examples'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const userId = session.user.id

    const cacheKey = `decision-suggestions:${userId}:${date}`
    const cached = await getCache<string[]>(cacheKey)
    if (cached && cached.length > 0) {
      return NextResponse.json({ suggestions: cached, source: 'cache' })
    }

    const supabase = serverSupabase()

    const [tasksRes, patterns, recentDecisionsRes, profileRes] = await Promise.all([
      supabase
        .from('morning_tasks')
        .select('description, action_plan')
        .eq('user_id', userId)
        .eq('plan_date', date)
        .order('task_order', { ascending: true }),
      detectProcrastinationPatterns(userId, { days: 14 }).catch((err) => {
        console.error('[Decision Suggestions] detectProcrastinationPatterns error:', err)
        return null
      }),
      supabase
        .from('morning_decisions')
        .select('plan_date, decision')
        .eq('user_id', userId)
        .gte('plan_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .lte('plan_date', date)
        .order('plan_date', { ascending: false }),
      supabase
        .from('user_profiles')
        .select(
          'primary_goal_text, struggles, founder_stage, founder_personality, destress_activity, hobbies, message_to_mrs_deer'
        )
        .eq('id', userId)
        .maybeSingle(),
    ])

    if (tasksRes.error) {
      console.error('[Decision Suggestions] Error loading tasks:', tasksRes.error)
      return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
    }
    if (recentDecisionsRes.error) {
      console.error('[Decision Suggestions] Error loading decisions:', recentDecisionsRes.error)
    }
    if (profileRes.error) {
      console.error('[Decision Suggestions] Error loading profile:', profileRes.error)
    }

    const tasks =
      (tasksRes.data as Array<{ description: string; action_plan?: string | null }> | null) ?? []
    const recentDecisions =
      (recentDecisionsRes.data as Array<{ plan_date: string; decision: string }> | null) ?? []
    const userProfile =
      (profileRes.data as {
        primary_goal_text?: string | null
        struggles?: string[] | null
        founder_stage?: string | null
        founder_personality?: string | null
        destress_activity?: string | null
        hobbies?: string[] | null
        message_to_mrs_deer?: string | null
      } | null) ?? null

    console.log(
      '🔍 [Step 1] Profile data from DB:',
      JSON.stringify(profileRes.data, null, 2)
    )

    const totalPostponements = patterns?.overallStats?.totalPostponements ?? 0
    // Use a loose cast here because activeDaysLast14 is a derived field not present on the base type
    const activeDaysLast14 =
      ((patterns as any)?.overallStats?.activeDaysLast14 as number | undefined) ?? 0

    // Volume signal: enough tasks today OR enough postponements across 14 days
    const hasVolume = tasks.length >= 3 || totalPostponements >= 5
    // Pattern signal: spread over time (e.g. at least 3 distinct active days)
    const hasSpread = activeDaysLast14 >= 3

    // Mrs. Deer should speak up when there is either enough volume OR
    // enough spread over the last 14 days.
    const hasEnoughData = hasVolume || hasSpread

    console.log(
      '🔍 [Step 2] hasEnoughData:',
      hasEnoughData,
      'tasks.length:',
      tasks.length,
      'totalPostponements:',
      totalPostponements,
      'activeDaysLast14:',
      activeDaysLast14
    )

    if (!hasEnoughData) {
      // If the user has no meaningful profile data AND no volume/spread, stay silent
      const hasProfileSignal =
        !!userProfile?.primary_goal_text ||
        (Array.isArray(userProfile?.struggles) && userProfile!.struggles!.length > 0) ||
        !!userProfile?.founder_stage ||
        !!userProfile?.founder_personality ||
        !!userProfile?.destress_activity ||
        (Array.isArray(userProfile?.hobbies) && userProfile!.hobbies!.length > 0) ||
        !!userProfile?.message_to_mrs_deer

      if (!hasProfileSignal) {
        return NextResponse.json({
          suggestions: [],
          source: 'insufficient-data',
        })
      }

      // Otherwise, fallback: curated examples based on other founders like them (profile-based)
      console.log(
        '🔍 [Step 3] Calling generateExamplesForUser with:',
        JSON.stringify(userProfile, null, 2)
      )
      const examples = generateExamplesForUser((userProfile as any) || {})
      const suggestions = examples.slice(0, 3)
      console.log('🔍 [Step 4] Examples generated:', examples)
      return NextResponse.json({
        suggestions,
        source: 'examples',
      })
    }

    const suggestions = await generateAISuggestions({
      userId,
      tasks,
      patterns,
      userProfile,
      recentDecisions,
      limit: 3,
    })

    const source = suggestions.length > 0 ? 'ai' : 'ai-empty'
    if (suggestions.length > 0) {
      await setCache(cacheKey, suggestions, 24 * 60 * 60)
    }

    console.log('🔍 [Step 5] Returning suggestions:', suggestions, 'source:', source)

    return NextResponse.json({ suggestions, source })
  } catch (error) {
    console.error('[Decision Suggestions] Unexpected error in GET:', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}

