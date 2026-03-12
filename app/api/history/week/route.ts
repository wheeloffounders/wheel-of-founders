import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return NextResponse.json({ error: 'Invalid start or end date (use yyyy-MM-dd)' }, { status: 400 })
    }

    const db = getServerSupabase()

    const [tasksRes, decisionsRes, reviewsRes, promptsRes, emergenciesRes, emergencyPromptsRes] = await Promise.all([
      db
        .from('morning_tasks')
        .select('id, plan_date, description, needle_mover, action_plan, completed, task_order')
        .eq('user_id', session.user.id)
        .gte('plan_date', start)
        .lte('plan_date', end)
        .order('plan_date', { ascending: true })
        .order('task_order', { ascending: true }),
      db
        .from('morning_decisions')
        .select('id, plan_date, decision, decision_type, why_this_decision')
        .eq('user_id', session.user.id)
        .gte('plan_date', start)
        .lte('plan_date', end)
        .order('plan_date', { ascending: true }),
      db
        .from('evening_reviews')
        .select('review_date, journal, mood, energy, wins, lessons')
        .eq('user_id', session.user.id)
        .gte('review_date', start)
        .lte('review_date', end)
        .order('review_date', { ascending: true }),
      db
        .from('personal_prompts')
        .select('prompt_date, prompt_type, prompt_text, generated_at')
        .eq('user_id', session.user.id)
        .in('prompt_type', ['morning', 'post_morning', 'post_evening'])
        .gte('prompt_date', start)
        .lte('prompt_date', end)
        .order('generated_at', { ascending: false }),
      db
        .from('emergencies')
        .select('id, fire_date, description, severity, notes, resolved, created_at')
        .eq('user_id', session.user.id)
        .gte('fire_date', start)
        .lte('fire_date', end)
        .order('fire_date', { ascending: true })
        .order('created_at', { ascending: true }),
      db
        .from('personal_prompts')
        .select('emergency_id, prompt_text')
        .eq('user_id', session.user.id)
        .eq('prompt_type', 'emergency')
        .not('emergency_id', 'is', null)
        .gte('prompt_date', start)
        .lte('prompt_date', end),
    ])

    const tasks = (tasksRes.data ?? []) as Array<{
      id: string
      plan_date: string
      description: string
      needle_mover?: boolean
      action_plan?: string
      completed?: boolean
      task_order?: number
    }>
    const decisions = (decisionsRes.data ?? []) as Array<{
      id: string
      plan_date: string
      decision: string
      decision_type: string
      why_this_decision?: string
    }>
    const reviews = (reviewsRes.data ?? []) as Array<{
      review_date: string
      journal?: string
      mood?: number
      energy?: number
      wins?: string
      lessons?: string
    }>
    const prompts = (promptsRes.data ?? []) as Array<{
      prompt_date: string
      prompt_type: string
      prompt_text: string
    }>
    const emergencies = (emergenciesRes.data ?? []) as Array<{
      id: string
      fire_date: string
      description: string
      severity?: string
      notes?: string
      resolved?: boolean
      created_at?: string
    }>

    const emergencyPrompts = (emergencyPromptsRes.data ?? []) as Array<{ emergency_id: string; prompt_text: string }>
    const emergencyIdToInsight: Record<string, string> = {}
    emergencyPrompts.forEach((row) => {
      if (row.emergency_id && row.prompt_text) emergencyIdToInsight[row.emergency_id] = row.prompt_text
    })

    const morningByDate: Record<string, string> = {}
    const postMorningByDate: Record<string, string> = {}
    const postEveningByDate: Record<string, string> = {}

    prompts.forEach((p) => {
      if (p.prompt_type === 'morning' && !morningByDate[p.prompt_date]) morningByDate[p.prompt_date] = p.prompt_text
      if (p.prompt_type === 'post_morning' && !postMorningByDate[p.prompt_date]) postMorningByDate[p.prompt_date] = p.prompt_text
      if (p.prompt_type === 'post_evening' && !postEveningByDate[p.prompt_date]) postEveningByDate[p.prompt_date] = p.prompt_text
    })

    const days: Record<
      string,
      {
        morningInsight: string | null
        morningPlan: { tasks: typeof tasks; decision: (typeof decisions)[0] | null }
        postMorningInsight: string | null
        emergencies: typeof emergencies
        emergencyInsight: string | null
        eveningReview: (typeof reviews)[0] | null
        eveningInsight: string | null
        mood: number | null
        energy: number | null
      }
    > = {}

    const dateStrs = new Set<string>()
    tasks.forEach((t) => dateStrs.add(t.plan_date))
    decisions.forEach((d) => dateStrs.add(d.plan_date))
    reviews.forEach((r) => dateStrs.add(r.review_date))
    prompts.forEach((p) => dateStrs.add(p.prompt_date))
    emergencies.forEach((e) => dateStrs.add(e.fire_date))

    const sortedDates = Array.from(dateStrs).sort()

    // Build days for all dates in the week range (Mon-Sun)
    const allDatesInWeek: string[] = []
    const [sy, sm, sd] = start.split('-').map(Number)
    const [ey, em, ed] = end.split('-').map(Number)
    let d = new Date(sy, sm - 1, sd)
    const endDate = new Date(ey, em - 1, ed)
    while (d <= endDate) {
      allDatesInWeek.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() + 1)
    }

    allDatesInWeek.forEach((dateStr) => {
      const dayTasks = tasks.filter((t) => t.plan_date === dateStr).sort((a, b) => (a.task_order ?? 0) - (b.task_order ?? 0))
      const dayDecision = decisions.find((d) => d.plan_date === dateStr) ?? null
      const dayReview = reviews.find((r) => r.review_date === dateStr) ?? null
      const dayEmergencies = emergencies
        .filter((e) => e.fire_date === dateStr)
        .map((e) => ({ ...e, insight: emergencyIdToInsight[e.id] ?? null }))

      days[dateStr] = {
        morningInsight: morningByDate[dateStr] ?? null,
        morningPlan: { tasks: dayTasks, decision: dayDecision },
        postMorningInsight: postMorningByDate[dateStr] ?? null,
        emergencies: dayEmergencies,
        emergencyInsight: dayEmergencies[0]?.insight ?? null,
        eveningReview: dayReview,
        eveningInsight: postEveningByDate[dateStr] ?? null,
        mood: dayReview?.mood ?? null,
        energy: dayReview?.energy ?? null,
      }
    })

    return NextResponse.json({
      weekStart: start,
      weekEnd: end,
      days,
    })
  } catch (error) {
    console.error('[history/week] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch week data' }, { status: 500 })
  }
}
