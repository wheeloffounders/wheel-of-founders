import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'
import { detectProcrastinationPatterns } from '@/lib/pattern-detection/procrastination'
import { generateAISuggestions } from '@/lib/ai/decision-suggestions'
import { format, addDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

    const db = serverSupabase()

    const [profileRes, recentDecisionsRes] = await Promise.all([
      (db.from('user_profiles') as any)
        .select('primary_goal_text, struggles, founder_stage, founder_personality, destress_activity, hobbies, message_to_mrs_deer')
        .eq('id', userId)
        .maybeSingle(),
      (db.from('morning_decisions') as any)
        .select('plan_date, decision')
        .eq('user_id', userId)
        .gte('plan_date', format(addDays(new Date(), -7), 'yyyy-MM-dd'))
        .lte('plan_date', tomorrow)
        .order('plan_date', { ascending: false }),
    ])

    const userProfile = (profileRes.data as {
      primary_goal_text?: string | null
      struggles?: string[] | null
      founder_stage?: string | null
      founder_personality?: string | null
      destress_activity?: string | null
      hobbies?: string[] | null
      message_to_mrs_deer?: string | null
    } | null) ?? null

    const recentDecisions =
      (recentDecisionsRes.data as Array<{ plan_date: string; decision: string }> | null) ?? []

    const patterns = await detectProcrastinationPatterns(userId, { days: 14 }).catch(() => null)

    const suggestions = await generateAISuggestions({
      userId,
      tasks: [],
      patterns: patterns ?? undefined,
      userProfile,
      recentDecisions,
      limit: 3,
    })

    if (suggestions.length === 0) {
      return NextResponse.json({ ok: true, suggestions: [] })
    }

    const { error } = await (db.from('scheduled_suggestions') as any).upsert(
      {
        user_id: userId,
        suggestion_date: tomorrow,
        suggestion_type: 'decision_suggestion',
        content: { suggestions },
        based_on: 'patterns/profile',
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,suggestion_date,suggestion_type' }
    )

    if (error) {
      console.error('[generate-for-tomorrow] Upsert error:', error)
      return NextResponse.json({ error: 'Failed to save suggestions' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, suggestions })
  } catch (err) {
    console.error('[generate-for-tomorrow] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
