/**
 * Longitudinal "founder themes" arc memory stored in user_profiles.coach_preferences.
 * Refreshed after weekly insight generation; surfaced in weekly/monthly and rarely on daily.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateAIPrompt } from '@/lib/ai-client'
import { format, subDays } from 'date-fns'
import { getServerSupabase } from '@/lib/server-supabase'

export type FounderThemeBullet = {
  theme: string
  evidence?: string
}

export type FounderThemesSnapshot = {
  themes: FounderThemeBullet[]
  updated_at: string
  period_end?: string
}

const COACH_PREFS_KEY = 'founder_themes_v1'

function parseThemesFromCoachPreferences(raw: unknown): FounderThemesSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const block = (raw as Record<string, unknown>)[COACH_PREFS_KEY]
  if (!block || typeof block !== 'object') return null
  const o = block as Record<string, unknown>
  const themesRaw = o.themes
  if (!Array.isArray(themesRaw) || themesRaw.length === 0) return null
  const themes: FounderThemeBullet[] = []
  for (const item of themesRaw) {
    if (!item || typeof item !== 'object') continue
    const t = (item as Record<string, unknown>).theme
    if (typeof t !== 'string' || !t.trim()) continue
    const evidence = (item as Record<string, unknown>).evidence
    themes.push({
      theme: t.trim(),
      evidence: typeof evidence === 'string' && evidence.trim() ? evidence.trim().slice(0, 200) : undefined,
    })
  }
  if (themes.length === 0) return null
  return {
    themes: themes.slice(0, 5),
    updated_at: typeof o.updated_at === 'string' ? o.updated_at : '',
    period_end: typeof o.period_end === 'string' ? o.period_end : undefined,
  }
}

export async function getFounderThemes(
  userId: string,
  db?: SupabaseClient
): Promise<FounderThemesSnapshot | null> {
  const client = db ?? getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client.from('user_profiles') as any)
    .select('coach_preferences')
    .eq('id', userId)
    .maybeSingle()
  const prefs = data?.coach_preferences
  return parseThemesFromCoachPreferences(prefs)
}

async function saveFounderThemes(
  userId: string,
  snapshot: FounderThemesSnapshot,
  db: SupabaseClient
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (db.from('user_profiles') as any)
    .select('coach_preferences')
    .eq('id', userId)
    .maybeSingle()

  const existing =
    row?.coach_preferences && typeof row.coach_preferences === 'object'
      ? { ...(row.coach_preferences as Record<string, unknown>) }
      : {}

  const merged = {
    ...existing,
    [COACH_PREFS_KEY]: snapshot,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from('user_profiles') as any)
    .update({ coach_preferences: merged, updated_at: new Date().toISOString() })
    .eq('id', userId)
}

function parseLessonsFromReview(lessons: unknown): string[] {
  if (!lessons) return []
  try {
    const parsed = typeof lessons === 'string' && lessons.startsWith('[') ? JSON.parse(lessons) : lessons
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map((l) => String(l).trim()).slice(0, 8)
  } catch {
    if (typeof lessons === 'string') return [lessons.trim()].filter(Boolean)
  }
  return []
}

/**
 * Regenerate 3–5 theme bullets from the last ~21 days of entries. Non-blocking on failure.
 */
export async function refreshFounderThemes(
  userId: string,
  periodEndYmd: string,
  db?: SupabaseClient
): Promise<FounderThemesSnapshot | null> {
  const client = db ?? getServerSupabase()
  const start = format(subDays(new Date(`${periodEndYmd}T12:00:00`), 21), 'yyyy-MM-dd')

  const [reviewsRes, tasksRes, decisionsRes] = await Promise.all([
    client
      .from('evening_reviews')
      .select('review_date, wins, lessons, journal')
      .eq('user_id', userId)
      .gte('review_date', start)
      .lte('review_date', periodEndYmd)
      .order('review_date', { ascending: false })
      .limit(14),
    client
      .from('morning_tasks')
      .select('plan_date, description')
      .eq('user_id', userId)
      .gte('plan_date', start)
      .lte('plan_date', periodEndYmd)
      .order('plan_date', { ascending: false })
      .limit(40),
    client
      .from('morning_decisions')
      .select('plan_date, decision, why_this_decision')
      .eq('user_id', userId)
      .gte('plan_date', start)
      .lte('plan_date', periodEndYmd)
      .order('plan_date', { ascending: false })
      .limit(10),
  ])

  const reviews = (reviewsRes.data ?? []) as Array<{
    wins?: string
    lessons?: string
    journal?: string
  }>
  const lessons: string[] = []
  const journalSnippets: string[] = []
  for (const r of reviews) {
    lessons.push(...parseLessonsFromReview(r.lessons))
    if (r.journal && String(r.journal).trim()) {
      journalSnippets.push(String(r.journal).trim().slice(0, 180))
    }
  }

  const tasks = ((tasksRes.data ?? []) as Array<{ description?: string }>)
    .map((t) => t.description?.trim())
    .filter(Boolean)
    .slice(0, 15)

  const decisions = ((decisionsRes.data ?? []) as Array<{ decision?: string; why_this_decision?: string }>)
    .map((d) => {
      const bits = [d.decision, d.why_this_decision].filter(Boolean).join(' — ')
      return bits.trim()
    })
    .filter(Boolean)
    .slice(0, 5)

  if (reviews.length === 0 && tasks.length === 0 && lessons.length === 0) {
    return null
  }

  const userPrompt = `Extract 3–5 ongoing founder themes from this recent activity. Return ONLY valid JSON:
{"themes":[{"theme":"short label","evidence":"optional 8-15 word quote or paraphrase from their words"}]}

Rules:
- Themes are ongoing threads (e.g. delegation guilt, launch fatigue), not one-off tasks.
- evidence must use their language when possible.
- No advice. No Mrs. Deer voice. JSON only.

RECENT LESSONS: ${[...new Set(lessons)].slice(0, 12).join(' | ') || '(none)'}
RECENT TASKS: ${tasks.join(' | ') || '(none)'}
RECENT DECISIONS: ${decisions.join(' | ') || '(none)'}
JOURNAL SNIPPETS: ${journalSnippets.slice(0, 5).join(' | ') || '(none)'}`

  try {
    const raw = await generateAIPrompt({
      systemPrompt:
        'You extract structured founder themes from journal data. Output JSON only, no markdown fences.',
      userPrompt,
      maxTokens: 500,
      temperature: 0.35,
    })
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as { themes?: FounderThemeBullet[] }
    const themes = (parsed.themes ?? [])
      .filter((t) => t && typeof t.theme === 'string' && t.theme.trim())
      .slice(0, 5)
      .map((t) => ({
        theme: t.theme.trim(),
        evidence: t.evidence?.trim().slice(0, 200),
      }))

    if (themes.length === 0) return null

    const snapshot: FounderThemesSnapshot = {
      themes,
      updated_at: new Date().toISOString(),
      period_end: periodEndYmd,
    }
    await saveFounderThemes(userId, snapshot, client)
    return snapshot
  } catch (err) {
    console.warn('[founder-themes] refresh failed', userId, err)
    return null
  }
}

export function buildFounderThemesPromptBlock(
  snapshot: FounderThemesSnapshot | null,
  mode: 'daily_sprinkle' | 'weekly' | 'monthly'
): string {
  if (!snapshot || snapshot.themes.length === 0) return ''

  const lines = snapshot.themes.map((t, i) => {
    const ev = t.evidence ? ` (e.g. ${t.evidence})` : ''
    return `${i + 1}. ${t.theme}${ev}`
  })

  if (mode === 'daily_sprinkle') {
    return `\n\nFOUNDER THEMES (optional — at most ONE sentence, only if clearly relevant today):\n${lines.join('\n')}`
  }

  if (mode === 'weekly') {
    return `\n\nFOUNDER THEMES (arc memory — weave one thread into the weekly insight; quote their week too):\n${lines.join('\n')}`
  }

  return `\n\nFOUNDER THEMES (chapter memory — name how this month relates to these ongoing threads):\n${lines.join('\n')}\nYou may include ONE practical beat: 1–2 optional directions for next month as choices, not orders.`
}

/** Last 7 days of lesson strings (for daily arc sprinkle eligibility). */
export async function fetchRecentLessonPhrases(
  userId: string,
  endYmd: string,
  db?: SupabaseClient
): Promise<string[]> {
  const client = db ?? getServerSupabase()
  const start = format(subDays(new Date(`${endYmd}T12:00:00`), 7), 'yyyy-MM-dd')
  const { data } = await client
    .from('evening_reviews')
    .select('lessons')
    .eq('user_id', userId)
    .gte('review_date', start)
    .lte('review_date', endYmd)
  const out: string[] = []
  for (const row of (data ?? []) as Array<{ lessons?: string }>) {
    out.push(...parseLessonsFromReview(row.lessons))
  }
  return out
}

/** Detect repeated lesson text in last 7 days for daily arc sprinkle eligibility */
export function hasRepeatingLessonSignal(lessonsList: string[]): boolean {
  if (lessonsList.length < 2) return false
  const normalized = lessonsList.map((l) => l.toLowerCase().trim()).filter((l) => l.length >= 12)
  const counts = new Map<string, number>()
  for (const l of normalized) {
    counts.set(l, (counts.get(l) ?? 0) + 1)
  }
  return [...counts.values()].some((c) => c >= 2)
}
