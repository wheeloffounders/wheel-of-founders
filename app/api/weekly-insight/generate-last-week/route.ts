import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getFeatureAccess } from '@/lib/features'
import { generateWeeklyInsightForUser } from '@/lib/batch-weekly-insight'
import { getLastMonday, getLastSunday, toDateStr } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST: Generate the last completed week's insight for the current user (on-demand).
 * Use when the cron didn't run or didn't include this user. Creates/updates weekly_insights
 * so the week appears in the list and on the weekly page.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()

    // Fetch user profile for tier / feature flags (server-side session only has id/email)
    const { data: profileData } = await db
      .from('user_profiles')
      .select('tier, pro_features_enabled')
      .eq('id', session.user.id)
      .maybeSingle()
    type ProfileRow = { tier?: string | null; pro_features_enabled?: boolean | null }
    const profile = profileData as ProfileRow | null

    const access = getFeatureAccess({
      tier: profile?.tier || 'beta',
      pro_features_enabled: profile?.pro_features_enabled ?? true,
    })
    if (!access.personalWeeklyInsight) {
      return NextResponse.json({ error: 'Weekly insights not available for your plan' }, { status: 403 })
    }

    const weekStart = toDateStr(getLastMonday())
    const weekEnd = toDateStr(getLastSunday())

    // If a weekly_insights row already exists with insight_text, reuse it to avoid re-running heavy AI
    const { data: existingRow } = await db
      .from('weekly_insights')
      .select('insight_text, unseen_wins_pattern')
      .eq('user_id', session.user.id)
      .eq('week_start', weekStart)
      .maybeSingle()
    const existing = existingRow as { insight_text?: string | null; unseen_wins_pattern?: string | null } | null

    let insightText: string | null = existing?.insight_text ?? null

    if (!insightText) {
      const result = await generateWeeklyInsightForUser(session.user.id, weekStart, weekEnd)
      insightText = result.success ? result.insight ?? null : null
    }

    // Generate Unseen Wins pattern for this user/week (same as weekly cron)
    let pattern: string | null = existing?.unseen_wins_pattern ?? null
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    const cronSecret = process.env.CRON_SECRET

    if (!pattern && appUrl && cronSecret) {
      try {
        const patternRes = await fetch(`${appUrl}/api/patterns/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({ userId: session.user.id }),
        })
        if (patternRes.ok) {
          const json = await patternRes.json()
          pattern = json.pattern ?? null
        }
      } catch (patternErr) {
        console.warn('[weekly-insight/generate-last-week] Pattern generate failed:', patternErr)
      }
    }

    await (db.from('weekly_insights') as any).upsert(
      {
        user_id: session.user.id,
        week_start: weekStart,
        week_end: weekEnd,
        insight_text: insightText,
        unseen_wins_pattern: pattern,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start' }
    )

    return NextResponse.json({
      success: true,
      weekStart,
      weekEnd,
      hasInsight: !!insightText,
      message: insightText
        ? 'Weekly insight ensured and Unseen Wins pattern refreshed.'
        : 'Week saved; add wins or lessons in evening reviews to generate an AI insight.',
    })
  } catch (err) {
    console.error('[weekly-insight/generate-last-week]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate' },
      { status: 500 }
    )
  }
}
