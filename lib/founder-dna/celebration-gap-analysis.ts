import { getISOWeek, getISOWeekYear } from 'date-fns'

/** Evening row from DB (newest-first query). */
export type EveningLessonRow = {
  lessons: string
  review_date: string
}

const MIN_LESSON_LEN = 28
const MAX_CANDIDATES = 14

/**
 * Prefer lessons that look like real reflection (length + problem/process language).
 */
function scoreLesson(text: string): number {
  const t = text.trim()
  if (t.length < MIN_LESSON_LEN) return -1
  let s = Math.min(100, t.length * 0.35)
  const lower = t.toLowerCase()
  const signals = [
    'felt',
    'feel',
    'hard',
    'struggle',
    'need',
    'should',
    'overwhelm',
    'worried',
    "didn't",
    "don't",
    'learn',
    'mistake',
    'wrong',
    'fix',
    'better',
    'try',
    'real',
    'approach',
    'priority',
    'failed',
    'stuck',
    'difficult',
    'stress',
    'anxious',
  ]
  for (const w of signals) {
    if (lower.includes(w)) s += 10
  }
  return s
}

export type PickedCelebrationLesson = {
  lesson: string
  lessonDate: string
}

/**
 * Pick one lesson from the last-30-days window for the weekly "hidden win" mirror.
 * Rotates among top-scored candidates by ISO week so the featured lesson can change each week.
 */
export function findBestLessonForCelebrationGap(rows: EveningLessonRow[], now: Date): PickedCelebrationLesson | null {
  const candidates: { lesson: string; lessonDate: string; score: number }[] = []

  for (const r of rows) {
    const lesson = typeof r.lessons === 'string' ? r.lessons.trim() : ''
    const rawDate = typeof r.review_date === 'string' ? r.review_date : ''
    const lessonDate = rawDate.slice(0, 10)
    const sc = scoreLesson(lesson)
    if (sc < 0 || !lessonDate) continue
    candidates.push({ lesson, lessonDate, score: sc })
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.lessonDate.localeCompare(a.lessonDate)
  })

  const top = candidates.slice(0, MAX_CANDIDATES)
  if (top.length === 0) return null

  const week = getISOWeek(now)
  const year = getISOWeekYear(now)
  const idx = (week + year * 53) % top.length
  const pick = top[idx]!
  return { lesson: pick.lesson, lessonDate: pick.lessonDate }
}
