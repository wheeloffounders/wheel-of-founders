import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { format } from 'date-fns'

export type FeedbackTriggerType = '7_days_active' | '7_evening_reviews' | 'first_export' | '30_days'

interface TriggerStatus {
  triggerType: FeedbackTriggerType
  shouldShow: boolean
  message: string
  daysOrCount?: number
}

/** GET: Check if any feedback popup should show */
export async function GET() {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ triggers: [] })
    }

    const userId = session.user.id
    const db = getServerSupabase()

    // Fetch trigger preferences
    const { data: prefs } = await db
      .from('feedback_trigger_preferences')
      .select('dismissed_triggers, maybe_later_until')
      .eq('user_id', userId)
      .maybeSingle()

    const dismissed = (prefs?.dismissed_triggers as Record<string, boolean>) || {}
    const maybeLater = (prefs?.maybe_later_until as Record<string, string>) || {}
    const now = new Date()

    // Get user activity data
    const [reviewsRes, tasksRes, exportsRes, profileRes] = await Promise.all([
      db.from('evening_reviews').select('review_date').eq('user_id', userId),
      db.from('morning_tasks').select('plan_date, created_at').eq('user_id', userId).order('plan_date', { ascending: true }).limit(1),
      db.from('data_exports').select('id').eq('user_id', userId).limit(1),
      db.from('user_profiles').select('created_at').eq('id', userId).maybeSingle(),
    ])

    const reviews = reviewsRes.data || []
    const firstTask = tasksRes.data?.[0]
    const hasExported = (exportsRes.data?.length ?? 0) > 0
    const profileCreated = profileRes.data?.created_at

    // Days since first activity (profile or first task)
    const firstActivity = profileCreated || firstTask?.created_at || firstTask?.plan_date
    const daysInApp = firstActivity
      ? Math.floor((now.getTime() - new Date(firstActivity).getTime()) / (24 * 60 * 60 * 1000))
      : 0

    // Distinct active days (days with morning tasks or evening reviews)
    const activeDaysSet = new Set<string>()
    const { data: allTasks } = await db.from('morning_tasks').select('plan_date').eq('user_id', userId)
    ;(allTasks || []).forEach((t: { plan_date: string }) => activeDaysSet.add(t.plan_date))
    reviews.forEach((r: { review_date: string }) => activeDaysSet.add(r.review_date))
    const activeDays = activeDaysSet.size
    const eveningReviewCount = reviews.length

    const triggers: TriggerStatus[] = []

    // Trigger: 7 days active
    const t1: FeedbackTriggerType = '7_days_active'
    if (!dismissed[t1] && activeDays >= 7) {
      const until = maybeLater[t1] ? new Date(maybeLater[t1]) : null
      if (!until || now >= until) {
        triggers.push({
          triggerType: t1,
          shouldShow: true,
          message: `You've been using WoF for ${activeDays} days.`,
          daysOrCount: activeDays,
        })
      }
    }

    // Trigger: 7 evening reviews
    const t2: FeedbackTriggerType = '7_evening_reviews'
    if (!dismissed[t2] && eveningReviewCount >= 7) {
      const until = maybeLater[t2] ? new Date(maybeLater[t2]) : null
      if (!until || now >= until) {
        triggers.push({
          triggerType: t2,
          shouldShow: true,
          message: `You've completed ${eveningReviewCount} evening reviews.`,
          daysOrCount: eveningReviewCount,
        })
      }
    }

    // Trigger: first export
    const t3: FeedbackTriggerType = 'first_export'
    if (!dismissed[t3] && hasExported) {
      const until = maybeLater[t3] ? new Date(maybeLater[t3]) : null
      if (!until || now >= until) {
        triggers.push({
          triggerType: t3,
          shouldShow: true,
          message: "You've exported your Pattern Dashboard for the first time.",
        })
      }
    }

    // Trigger: 30 days in app
    const t4: FeedbackTriggerType = '30_days'
    if (!dismissed[t4] && daysInApp >= 30) {
      const until = maybeLater[t4] ? new Date(maybeLater[t4]) : null
      if (!until || now >= until) {
        triggers.push({
          triggerType: t4,
          shouldShow: true,
          message: `You've been with WoF for ${daysInApp} days.`,
          daysOrCount: daysInApp,
        })
      }
    }

    // Return first eligible trigger only (one at a time)
    const toShow = triggers[0] || null
    return NextResponse.json({ trigger: toShow })
  } catch (err) {
    console.error('[Feedback trigger status]', err)
    return NextResponse.json({ trigger: null })
  }
}
