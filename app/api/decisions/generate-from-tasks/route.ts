import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'
import { detectProcrastinationPatterns } from '@/lib/pattern-detection/procrastination'
import { generateAISuggestions } from '@/lib/ai/decision-suggestions'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const tasks = Array.isArray(body.tasks)
      ? body.tasks
          .filter((t: { description?: string }) => t?.description?.trim?.())
          .map((t: { description: string; action_plan?: string | null }) => ({
            description: String(t.description).trim(),
            action_plan: t.action_plan ?? null,
          }))
      : []

    if (tasks.length === 0) {
      return NextResponse.json({ suggestions: [], source: 'tasks' })
    }

    const userId = session.user.id
    const db = serverSupabase()

    const [profileRes, patterns] = await Promise.all([
      (db.from('user_profiles') as any)
        .select('primary_goal_text, struggles, founder_stage')
        .eq('id', userId)
        .maybeSingle(),
      detectProcrastinationPatterns(userId, { days: 14 }).catch(() => null),
    ])

    const userProfile = (profileRes.data as {
      primary_goal_text?: string | null
      struggles?: string[] | null
      founder_stage?: string | null
    } | null) ?? null

    const suggestions = await generateAISuggestions({
      userId,
      tasks,
      patterns: patterns ?? undefined,
      userProfile,
      recentDecisions: [],
      limit: 3,
    })

    return NextResponse.json({ suggestions, source: 'tasks' })
  } catch (err) {
    console.error('[generate-from-tasks] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
