import type { SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO, subDays } from 'date-fns'
import { buildReminderVariationEmailParts, pickReminderVariationId } from '@/lib/email/reminder-variations'
import { resolveEmailDisplayName } from '@/lib/email/personalization'
import { renderEmailTemplate } from '@/lib/email/templates'
import type { EmailTemplateUser } from '@/lib/email/templates/types'
import { buildTemplatePreview, type EmailPreview } from '@/lib/test/emailPreview'
import { parseWinsFromReview } from '@/lib/quarterly/parse-wins'
import { TEST_SIMULATION_SOURCE } from '@/lib/test/clearSimulatedEntries'
import { journeyWeekNumberFromDaysWithEntries } from '@/lib/email/weekly-journey-messages'

export type SimulateDaysOptions = {
  startDate: string
  numDays: number
  overwrite: boolean
}

export type SimulateDaysResult = {
  success: boolean
  daysCreated: number
  daysSkipped: number
  errors: string[]
  /** Synthetic reminder / insight previews (not sent) */
  syntheticEmailPreviews: EmailPreview[]
}

type NotifRow = {
  morning_enabled?: boolean
  evening_enabled?: boolean
}

function firstLineFromEveningRow(row: { wins?: unknown; lessons?: unknown }): string | undefined {
  for (const w of parseWinsFromReview(row.wins)) {
    const t = w.trim()
    if (t) return t
  }
  for (const l of parseWinsFromReview(row.lessons)) {
    const t = l.trim()
    if (t) return t
  }
  return undefined
}

/**
 * After simulated rows exist for `planDate`, load the same snippets production reminders use
 * (recent evenings + that day's morning plan).
 */
async function fetchSimReminderSnippets(
  db: SupabaseClient,
  userId: string,
  planDate: string
): Promise<{ recentThemeSnippet?: string; todaysIntentionSnippet?: string }> {
  const { data: evs } = await db
    .from('evening_reviews')
    .select('wins, lessons')
    .eq('user_id', userId)
    .order('review_date', { ascending: false })
    .limit(3)

  let recentThemeSnippet: string | undefined
  for (const row of (evs ?? []) as Array<{ wins?: unknown; lessons?: unknown }>) {
    const line = firstLineFromEveningRow(row)
    if (line) {
      recentThemeSnippet = line.length > 100 ? `${line.slice(0, 99)}…` : line
      break
    }
  }

  const [{ data: dec }, { data: tasks }] = await Promise.all([
    db.from('morning_decisions').select('decision').eq('user_id', userId).eq('plan_date', planDate).maybeSingle(),
    db
      .from('morning_tasks')
      .select('description, needle_mover, task_order')
      .eq('user_id', userId)
      .eq('plan_date', planDate)
      .order('task_order', { ascending: true }),
  ])

  const rawDecision = String((dec as { decision?: string | null } | null)?.decision ?? '').trim()
  const decisionLine = rawDecision
    .split('\n')
    .map((x) => x.trim())
    .find(Boolean)
  const taskList = (tasks ?? []) as Array<{ description?: string | null; needle_mover?: boolean | null }>
  const needle = taskList.find((t) => t.needle_mover === true && String(t.description || '').trim())
  const firstTask = taskList.find((t) => String(t.description || '').trim())
  const intentionRaw = decisionLine || String(needle?.description || firstTask?.description || '').trim() || ''
  const todaysIntentionSnippet =
    intentionRaw.length > 120 ? `${intentionRaw.slice(0, 119)}…` : intentionRaw || undefined

  return {
    recentThemeSnippet,
    todaysIntentionSnippet: todaysIntentionSnippet || undefined,
  }
}

async function loadNotificationPrefs(db: SupabaseClient, userId: string): Promise<{ morning: boolean; evening: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db.from('user_notification_settings') as any)
    .select('morning_enabled, evening_enabled')
    .eq('user_id', userId)
    .maybeSingle()
  const row = data as NotifRow | null
  return {
    morning: row?.morning_enabled ?? true,
    evening: row?.evening_enabled ?? true,
  }
}

export async function simulateDays(
  db: SupabaseClient,
  userId: string,
  options: SimulateDaysOptions
): Promise<SimulateDaysResult> {
  const errors: string[] = []
  let daysCreated = 0
  let daysSkipped = 0
  const syntheticEmailPreviews: EmailPreview[] = []

  const endDate = options.startDate
  const n = Math.min(100, Math.max(1, Math.floor(options.numDays)))

  const { data: profile } = await db.from('user_profiles').select('preferred_name, name, email_address').eq('id', userId).maybeSingle()
  const pr = profile as { preferred_name?: string | null; name?: string | null; email_address?: string | null } | null
  const recipient = (pr?.email_address || 'preview@localhost').trim()
  const templateUser: EmailTemplateUser = {
    name: resolveEmailDisplayName(
      pr
        ? {
            preferred_name: pr.preferred_name,
            name: pr.name,
            email_address: pr.email_address,
          }
        : null,
      null
    ),
    email: recipient,
  }

  const prefs = await loadNotificationPrefs(db, userId)

  for (let i = 0; i < n; i++) {
    const dayStr = format(subDays(parseISO(`${endDate}T12:00:00`), n - 1 - i), 'yyyy-MM-dd')

    try {
      if (!options.overwrite) {
        const { data: existingEvening } = await db
          .from('evening_reviews')
          .select('id')
          .eq('user_id', userId)
          .eq('review_date', dayStr)
          .limit(1)
        if (existingEvening?.length) {
          daysSkipped++
          continue
        }
      } else {
        await db.from('morning_tasks').delete().eq('user_id', userId).eq('plan_date', dayStr)
        await db.from('morning_decisions').delete().eq('user_id', userId).eq('plan_date', dayStr)
        await db.from('morning_plan_commits').delete().eq('user_id', userId).eq('plan_date', dayStr)
        await db.from('evening_reviews').delete().eq('user_id', userId).eq('review_date', dayStr)
      }

      const committedAt = `${dayStr}T14:00:00.000Z`
      const source = TEST_SIMULATION_SOURCE

      const tasksPayload = [
        {
          user_id: userId,
          plan_date: dayStr,
          task_order: 1,
          description: `Simulated needle mover — ${dayStr}`,
          why_this_matters: 'Test simulation',
          needle_mover: true,
          is_proactive: true,
          action_plan: 'my_zone' as const,
          completed: true,
          source,
        },
        {
          user_id: userId,
          plan_date: dayStr,
          task_order: 2,
          description: `Simulated task B — ${dayStr}`,
          why_this_matters: null,
          needle_mover: false,
          is_proactive: true,
          action_plan: 'quick_win_founder' as const,
          completed: true,
          source,
        },
        {
          user_id: userId,
          plan_date: dayStr,
          task_order: 3,
          description: `Simulated task C — ${dayStr}`,
          why_this_matters: null,
          needle_mover: false,
          is_proactive: false,
          action_plan: 'systemize' as const,
          completed: true,
          source,
        },
      ]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insTasks = await (db.from('morning_tasks') as any).insert(tasksPayload)
      if (insTasks.error) throw insTasks.error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insDec = await (db.from('morning_decisions') as any).insert({
        user_id: userId,
        plan_date: dayStr,
        decision: `Simulated decision for ${dayStr}`,
        decision_type: 'strategic',
        why_this_decision: 'Simulation',
      })
      if (insDec.error) throw insDec.error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insCommit = await (db.from('morning_plan_commits') as any).insert({
        user_id: userId,
        plan_date: dayStr,
        committed_at: committedAt,
        original_task_count: 3,
        source,
      })
      if (insCommit.error) throw insCommit.error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insEv = await (db.from('evening_reviews') as any).insert({
        user_id: userId,
        review_date: dayStr,
        journal: null,
        mood: 4,
        energy: 4,
        wins: JSON.stringify([`Evening win — ${dayStr}`]),
        lessons: JSON.stringify([]),
        source,
      })
      if (insEv.error) throw insEv.error

      daysCreated++

      const dayIndex1 = i + 1
      const snippets = await fetchSimReminderSnippets(db, userId, dayStr)
      const hasRecentTheme = Boolean(snippets.recentThemeSnippet && snippets.recentThemeSnippet.length >= 12)
      const hasRecentIntention = Boolean(
        snippets.todaysIntentionSnippet && snippets.todaysIntentionSnippet.length >= 8
      )
      const greetingForVariations = resolveEmailDisplayName(
        pr
          ? { preferred_name: pr.preferred_name, name: pr.name, email_address: pr.email_address }
          : null,
        null
      )

      if (prefs.morning) {
        const morningVid = pickReminderVariationId({
          kind: 'morning',
          streak: dayIndex1,
          hasRecentTheme,
          hasRecentIntention,
          dayOfWeek: new Date().getUTCDay(),
          blocked: new Set(),
          random: Math.random,
        })
        const morningParts = buildReminderVariationEmailParts({
          kind: 'morning',
          variationId: morningVid,
          params: {
            displayName: greetingForVariations,
            streak: dayIndex1,
            recentTheme: snippets.recentThemeSnippet,
            recentIntention: snippets.todaysIntentionSnippet,
          },
        })
        const r = renderEmailTemplate('morning_reminder', templateUser, {
          growthEdge: 'Start small; one honest step counts.',
          streak: dayIndex1,
          recentThemeSnippet: snippets.recentThemeSnippet,
          todaysIntentionSnippet: snippets.todaysIntentionSnippet,
          reminderVariationId: morningParts.variationId,
          reminderSubject: morningParts.subject,
          reminderPreheader: morningParts.preheader,
          reminderOpeningHtml: `<p style="margin:0 0 16px 0;line-height:1.65;">${morningParts.openingParagraph}</p>`,
          reminderOpeningPlain: morningParts.openingParagraph,
        })
        syntheticEmailPreviews.push(
          buildTemplatePreview(recipient, `morning_reminder_sim_day_${dayIndex1}`, r.subject, r.html)
        )
      }
      if (prefs.evening) {
        const eveningVid = pickReminderVariationId({
          kind: 'evening',
          streak: dayIndex1,
          hasRecentTheme,
          hasRecentIntention,
          dayOfWeek: new Date().getUTCDay(),
          blocked: new Set(),
          random: Math.random,
        })
        const eveningParts = buildReminderVariationEmailParts({
          kind: 'evening',
          variationId: eveningVid,
          params: {
            displayName: greetingForVariations,
            streak: dayIndex1,
            recentTheme: snippets.recentThemeSnippet,
            recentIntention: snippets.todaysIntentionSnippet,
          },
        })
        const r = renderEmailTemplate('evening_reminder', templateUser, {
          streak: dayIndex1,
          recentThemeSnippet: snippets.recentThemeSnippet,
          todaysIntentionSnippet: snippets.todaysIntentionSnippet,
          reminderVariationId: eveningParts.variationId,
          reminderSubject: eveningParts.subject,
          reminderPreheader: eveningParts.preheader,
          reminderOpeningHtml: `<p style="margin:0 0 16px 0;line-height:1.65;">${eveningParts.openingParagraph}</p>`,
          reminderOpeningPlain: eveningParts.openingParagraph,
        })
        syntheticEmailPreviews.push(
          buildTemplatePreview(recipient, `evening_reminder_sim_day_${dayIndex1}`, r.subject, r.html)
        )
      }

      if (dayIndex1 === 5) {
        const r = renderEmailTemplate('weekly_insight', templateUser, {
          weeklyInsightText: `Simulated first weekly insight after ${dayIndex1} days (unlock). Mrs. Deer sees your rhythm building.`,
          daysWithEntries: 5,
          weeklyJourneyWeekNumber: 1,
          tasksCompleted: 15,
          decisionsMade: 5,
          weeklyInsightStatsScope: 'cumulative_to_date',
        })
        syntheticEmailPreviews.push(
          buildTemplatePreview(recipient, 'weekly_insight_sim_unlock_day_5', r.subject, r.html)
        )
      }

      if (dayIndex1 >= 7 && dayIndex1 % 7 === 0) {
        const journeyWeek = journeyWeekNumberFromDaysWithEntries(dayIndex1)
        const firstWeekMilestone = dayIndex1 === 7
        const r = renderEmailTemplate('weekly_insight', templateUser, {
          weeklyInsightText: `Simulated weekly insight after ${dayIndex1} simulated days. Mrs. Deer sees your rhythm building.`,
          daysWithEntries: dayIndex1,
          weeklyJourneyWeekNumber: journeyWeek,
          tasksCompleted: firstWeekMilestone ? dayIndex1 * 3 : 21,
          decisionsMade: firstWeekMilestone ? dayIndex1 : 7,
          weeklyInsightStatsScope: firstWeekMilestone ? 'cumulative_to_date' : 'weekly_window',
        })
        syntheticEmailPreviews.push(
          buildTemplatePreview(recipient, `weekly_insight_sim_week_${dayIndex1 / 7}`, r.subject, r.html)
        )
      }

      const dom = parseISO(`${dayStr}T12:00:00`).getUTCDate()
      if (dom === 1 && dayIndex1 > 1) {
        const r = renderEmailTemplate('monthly_insight', templateUser, {
          monthlyInsightText: `Simulated monthly insight for month boundary ${dayStr}. In production, this is generated from your weeks and selections; this preview uses placeholder copy.`,
          streak: String(dayIndex1),
          tasksCompleted: String(dayIndex1 * 3),
          decisionsMade: String(dayIndex1),
        })
        syntheticEmailPreviews.push(buildTemplatePreview(recipient, 'monthly_insight_simulated', r.subject, r.html))
      }
    } catch (e) {
      errors.push(`${dayStr}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return {
    success: errors.length === 0,
    daysCreated,
    daysSkipped,
    errors,
    syntheticEmailPreviews,
  }
}
