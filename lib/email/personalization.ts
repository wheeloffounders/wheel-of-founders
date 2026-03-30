import { getServerSupabase } from '@/lib/server-supabase'

export interface EmailContext {
  userName: string
  streak: number
  recentWin?: string
  unseenWin?: string
  celebrationGap?: string
  weeklyInsight?: string
  archetype?: string
  growthEdge?: string
  /** Short phrase for curiosity-themed reminder copy (insights / recent reflection) */
  recentThemeSnippet?: string
  /** Today's morning decision or top task (for evening check-in copy); requires planDate */
  todaysIntentionSnippet?: string
}

export type AuthUserLike = {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
} | null

function pickFirstLine(s: string | null | undefined, fallback?: string): string | undefined {
  const v = String(s || '').trim()
  if (!v) return fallback
  const line = v
    .split('\n')
    .map((x) => x.trim())
    .find(Boolean)
  return line || fallback
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/**
 * First name for email greetings: "First Last" → First; "Last, First …" → First;
 * strips trailing comma on tokens. Empty if unparseable.
 */
export function emailGreetingFromDisplayString(raw: string | null | undefined): string {
  const t = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!t) return ''
  if (t.includes(',')) {
    const afterComma = t
      .split(',')
      .slice(1)
      .join(',')
      .trim()
    if (afterComma) {
      const first = afterComma.split(/\s+/)[0]?.replace(/[,;.:]+$/, '') ?? ''
      return first || afterComma
    }
    return t.split(',')[0]?.trim().replace(/[,;.:]+$/, '') ?? t
  }
  const firstWord = t.split(/\s+/)[0]?.replace(/[,;.:]+$/, '') ?? ''
  return firstWord || t
}

/**
 * 1. preferred_name (first name only) · 2. auth first_name / given_name · 3. profile full name → first name ·
 * 4. email local part (profile then auth) · 5. Founder
 */
export function resolveEmailDisplayName(
  profile: {
    preferred_name?: string | null
    name?: string | null
    email_address?: string | null
  } | null,
  auth?: AuthUserLike
): string {
  const fromPreferred = emailGreetingFromDisplayString(profile?.preferred_name)
  if (fromPreferred) return fromPreferred

  const meta = auth?.user_metadata
  const fn = meta?.first_name ?? meta?.given_name
  if (typeof fn === 'string' && fn.trim()) {
    const g = emailGreetingFromDisplayString(fn)
    if (g) return g
  }

  const authFull = meta?.full_name ?? meta?.name
  if (typeof authFull === 'string' && authFull.trim()) {
    const g = emailGreetingFromDisplayString(authFull)
    if (g) return g
  }

  const fromFull = emailGreetingFromDisplayString(profile?.name)
  if (fromFull) return fromFull

  const em = (profile?.email_address || auth?.email || '').trim()
  if (em.includes('@')) {
    const local = em.split('@')[0] ?? ''
    const g = emailGreetingFromDisplayString(local.replace(/[._+]/g, ' '))
    if (g) return g
    return local || 'Founder'
  }
  return 'Founder'
}

export type BuildPersonalizedEmailContextOptions = {
  /** User's effective plan date (YYYY-MM-DD) for today's morning intention */
  planDate?: string
  authUser?: AuthUserLike
}

export async function buildPersonalizedEmailContext(
  userId: string,
  options?: BuildPersonalizedEmailContextOptions
): Promise<EmailContext> {
  const db = getServerSupabase()
  const planDate = options?.planDate

  try {
    const [
      profileRes,
      recentEveningsRes,
      weeklyRes,
      storyRes,
      celebrationRes,
      archetypeRes,
    ] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('user_profiles') as any)
        .select('preferred_name, name, email_address, current_streak')
        .eq('id', userId)
        .maybeSingle(),
      db
        .from('evening_reviews')
        .select('wins, lessons')
        .eq('user_id', userId)
        .order('review_date', { ascending: false })
        .limit(3),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('weekly_insights') as any)
        .select('insight_text, unseen_wins_pattern')
        .eq('user_id', userId)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('founder_dna_your_story') as any)
        .select('insight')
        .eq('user_id', userId)
        .order('refreshed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('founder_dna_celebration_gap') as any)
        .select('insight')
        .eq('user_id', userId)
        .order('refreshed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('founder_dna_archetype') as any)
        .select('primary_label, growth_edge')
        .eq('user_id', userId)
        .order('refreshed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    let intentionRes: { data: { decision?: string | null } | null } = { data: null }
    let tasksRes: { data: Array<{ description?: string | null; needle_mover?: boolean | null }> | null } = {
      data: null,
    }
    if (planDate) {
      ;[intentionRes, tasksRes] = await Promise.all([
        db
          .from('morning_decisions')
          .select('decision')
          .eq('user_id', userId)
          .eq('plan_date', planDate)
          .maybeSingle(),
        db
          .from('morning_tasks')
          .select('description, needle_mover, task_order')
          .eq('user_id', userId)
          .eq('plan_date', planDate)
          .order('task_order', { ascending: true }),
      ])
    }

    const profile = (profileRes.data as {
      preferred_name?: string | null
      name?: string | null
      email_address?: string | null
      current_streak?: number | null
    } | null) ?? null
    const recentEveningRows = (recentEveningsRes.data ?? []) as Array<{
      wins?: string | null
      lessons?: string | null
    }>
    const latestEvening = recentEveningRows[0] ?? null
    const weekly = (weeklyRes.data as { insight_text?: string | null; unseen_wins_pattern?: string | null } | null) ?? null
    const story = (storyRes.data as { insight?: string | null } | null) ?? null
    const celebration = (celebrationRes.data as { insight?: string | null } | null) ?? null
    const archetype = (archetypeRes.data as { primary_label?: string | null; growth_edge?: string | null } | null) ?? null

    const name = resolveEmailDisplayName(profile, options?.authUser ?? null)

    let themeFromJournal: string | undefined
    for (const row of recentEveningRows) {
      const w = pickFirstLine(row.wins)
      if (w) {
        themeFromJournal = w
        break
      }
      const l = pickFirstLine(row.lessons)
      if (l) {
        themeFromJournal = l
        break
      }
    }

    const themeCandidates = [
      pickFirstLine(story?.insight),
      pickFirstLine(weekly?.insight_text),
      pickFirstLine(celebration?.insight),
      themeFromJournal,
    ].filter(Boolean) as string[]
    const recentThemeSnippetRaw = themeCandidates[0]
    const recentThemeSnippet = recentThemeSnippetRaw ? truncate(recentThemeSnippetRaw, 100) : undefined

    const decisionLine = pickFirstLine((intentionRes.data as { decision?: string | null } | null)?.decision)
    const tasks = (tasksRes.data ?? []) as Array<{ description?: string | null; needle_mover?: boolean | null }>
    const needle = tasks.find((t) => t.needle_mover === true && String(t.description || '').trim())
    const firstTask = tasks.find((t) => String(t.description || '').trim())
    const intentionFromTasks = pickFirstLine(needle?.description) || pickFirstLine(firstTask?.description)
    const todaysIntentionSnippetRaw = decisionLine || intentionFromTasks
    const todaysIntentionSnippet = todaysIntentionSnippetRaw ? truncate(todaysIntentionSnippetRaw, 120) : undefined

    return {
      userName: name || 'Founder',
      streak: Math.max(0, Number(profile?.current_streak || 0)),
      recentWin: pickFirstLine(latestEvening?.wins),
      unseenWin: pickFirstLine(weekly?.unseen_wins_pattern),
      celebrationGap: pickFirstLine(celebration?.insight),
      weeklyInsight: pickFirstLine(weekly?.insight_text || story?.insight),
      archetype: pickFirstLine(archetype?.primary_label),
      growthEdge: pickFirstLine(archetype?.growth_edge),
      recentThemeSnippet,
      todaysIntentionSnippet,
    }
  } catch {
    return { userName: 'Founder', streak: 0 }
  }
}
