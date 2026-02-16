import { getServerSupabase } from '@/lib/server-supabase'
import { processPatternQueue } from '@/lib/analytics/pattern-extractor'
import { format } from 'date-fns'

/**
 * Daily analytics cron: process pattern queue, compute and upsert daily_stats.
 * Vercel Cron: 0 3 * * * (daily at 3 AM).
 * Secured by CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const db = getServerSupabase()
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayStart = `${today}T00:00:00`
  const todayEnd = `${today}T23:59:59`

  await processPatternQueue()

  const [newUsersRes, usageRes, patternsRes] = await Promise.all([
    db.from('user_profiles').select('id').gte('created_at', todayStart).lte('created_at', todayEnd),
    db.from('feature_usage').select('user_id, feature_name, metadata').gte('created_at', todayStart).lte('created_at', todayEnd),
    db.from('user_patterns').select('pattern_text, pattern_type').gte('detected_at', todayStart).lte('detected_at', todayEnd),
  ])

  const morningUserIds = new Set<string>()
  const eveningUserIds = new Set<string>()
  const { data: morningRows } = await db.from('morning_tasks').select('user_id').gte('plan_date', today).lte('plan_date', today)
  ;(morningRows || []).forEach((r) => morningUserIds.add(r.user_id))
  const { data: eveningRows } = await db.from('evening_reviews').select('user_id').eq('review_date', today)
  ;(eveningRows || []).forEach((r) => eveningUserIds.add(r.user_id))

  const activeUserIds = new Set([...morningUserIds, ...eveningUserIds])
  const active_users = activeUserIds.size
  const new_users = ((newUsersRes as { data?: unknown[] })?.data?.length ?? 0)

  const morningCount = morningUserIds.size
  const eveningCount = eveningUserIds.size
  const morning_plan_rate = active_users > 0 ? morningCount / active_users : 0
  const evening_review_rate = active_users > 0 ? eveningCount / active_users : 0

  const usage = (usageRes as { data?: Array<{ user_id: string; feature_name: string; metadata?: { has_needle_mover?: boolean; is_needle_mover?: boolean } }> })?.data || []
  const usersWithNeedleMover = new Set<string>()
  for (const u of usage) {
    if (u.feature_name === 'morning_plan' && u.metadata?.has_needle_mover) usersWithNeedleMover.add(u.user_id)
    if (u.feature_name === 'task_completion' && u.metadata?.is_needle_mover) usersWithNeedleMover.add(u.user_id)
  }
  const needle_mover_usage_rate = morningUserIds.size > 0 ? Math.min(1, usersWithNeedleMover.size / morningUserIds.size) : 0

  const patterns = ((patternsRes as { data?: Array<{ pattern_text: string; pattern_type: string }> })?.data) || []
  const struggleCounts: Record<string, number> = {}
  const winCounts: Record<string, number> = {}
  for (const p of patterns) {
    if (p.pattern_type === 'struggle') {
      struggleCounts[p.pattern_text] = (struggleCounts[p.pattern_text] || 0) + 1
    }
    if (p.pattern_type === 'win') {
      winCounts[p.pattern_text] = (winCounts[p.pattern_text] || 0) + 1
    }
  }
  const top_struggles = Object.entries(struggleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text, count]) => ({ text, count }))
  const top_wins = Object.entries(winCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text, count]) => ({ text, count }))

  const { data: taskStats } = await db
    .from('morning_tasks')
    .select('completed')
    .gte('plan_date', today)
    .lte('plan_date', today)
  const completedCount = (taskStats || []).filter((t) => (t as { completed?: boolean }).completed).length
  const totalTasks = (taskStats || []).length
  const avg_tasks_completed = morningCount > 0 ? completedCount / morningCount : 0

  const { data: reviews } = await db.from('evening_reviews').select('mood, energy').eq('review_date', today)
  let focusSum = 0
  let focusCount = 0
  for (const r of reviews || []) {
    const m = (r as { mood?: number }).mood
    const e = (r as { energy?: number }).energy
    if (m != null && e != null) {
      focusSum += (m + e) / 2
      focusCount++
    }
  }
  const avg_focus_score = focusCount > 0 ? focusSum / focusCount : 0

  await db
    .from('daily_stats')
    .upsert(
      {
        date: today,
        active_users,
        new_users,
        morning_plan_rate,
        evening_review_rate,
        needle_mover_usage_rate,
        avg_tasks_completed,
        avg_focus_score,
        top_struggles,
        top_wins,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    )

  return Response.json({ success: true, date: today })
}
