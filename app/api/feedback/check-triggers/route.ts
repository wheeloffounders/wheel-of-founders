import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'

export type TriggerType = '7_days_active' | '7_evening_reviews' | 'first_export' | '30_days'

export async function GET() {
  const session = await getUserSession()
  if (!session) {
    return NextResponse.json({ eligible: false })
  }

  const db = getServerSupabase()
  const userId = session.user.id

  // Fetch preferences first
  const { data: prefs } = await db
    .from('feedback_trigger_preferences')
    .select('dismissed_triggers, maybe_later_until, last_trigger_shown')
    .eq('user_id', userId)
    .maybeSingle()

  const dismissed = (prefs?.dismissed_triggers as Record<string, boolean>) || {}
  const maybeLater = (prefs?.maybe_later_until as Record<string, string>) || {}
  const lastShown = (prefs?.last_trigger_shown as Record<string, string>) || {}

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Helper: should show this trigger?
  const shouldShow = (type: TriggerType) => {
    if (dismissed[type]) return false
    const until = maybeLater[type]
    if (until && new Date(until) > now) return false
    const last = lastShown[type]
    if (last && new Date(last) > sevenDaysAgo) return false
    return true
  }

  // 1. Evening reviews count
  const { count: eveningCount } = await db
    .from('evening_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // 2. First activity date (earliest evening_review or morning_task)
  const [reviewsRes, tasksRes, exportsRes] = await Promise.all([
    db.from('evening_reviews').select('review_date').eq('user_id', userId).order('review_date', { ascending: true }).limit(1).maybeSingle(),
    db.from('morning_tasks').select('plan_date').eq('user_id', userId).order('plan_date', { ascending: true }).limit(1).maybeSingle(),
    db.from('data_exports').select('id').eq('user_id', userId).eq('status', 'completed').limit(1).maybeSingle(),
  ])

  const firstReviewDate = reviewsRes.data?.review_date
  const firstTaskDate = (tasksRes.data as { plan_date?: string } | null)?.plan_date
  const dates = [firstReviewDate, firstTaskDate].filter(Boolean) as string[]
  const firstActivityDate = dates.length ? dates.sort()[0] : null
  const daysSinceFirst = firstActivityDate
    ? Math.floor((now.getTime() - new Date(firstActivityDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const hasExported = !!exportsRes.data

  // Pick first eligible trigger (priority order)
  if (shouldShow('7_days_active') && daysSinceFirst >= 7) {
    return NextResponse.json({
      eligible: true,
      triggerType: '7_days_active' as TriggerType,
      message: `You've been using WoF for ${daysSinceFirst} days.`,
    })
  }
  if (shouldShow('7_evening_reviews') && (eveningCount ?? 0) >= 7) {
    return NextResponse.json({
      eligible: true,
      triggerType: '7_evening_reviews' as TriggerType,
      message: `You've completed ${eveningCount} evening reviews.`,
    })
  }
  if (shouldShow('first_export') && hasExported) {
    return NextResponse.json({
      eligible: true,
      triggerType: 'first_export' as TriggerType,
      message: "You've exported your Pattern Dashboard.",
    })
  }
  if (shouldShow('30_days') && daysSinceFirst >= 30) {
    return NextResponse.json({
      eligible: true,
      triggerType: '30_days' as TriggerType,
      message: `You've been with WoF for 30 days.`,
    })
  }

  return NextResponse.json({ eligible: false })
}
