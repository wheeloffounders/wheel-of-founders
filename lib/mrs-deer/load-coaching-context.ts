import type { SupabaseClient } from '@supabase/supabase-js'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import { getServerSupabase } from '@/lib/server-supabase'
import {
  getRelationshipPhase,
  pickDailyResponseShape,
  getDailyWordBudget,
  buildDailyStructurePrompt,
  shouldAllowArcSprinkleOnDaily,
  type DailyInsightKind,
} from '@/lib/mrs-deer/coaching-evolution'
import {
  getFounderThemes,
  buildFounderThemesPromptBlock,
  hasRepeatingLessonSignal,
  type FounderThemesSnapshot,
} from '@/lib/mrs-deer/founder-themes'

export type DailyCoachingContext = {
  daysWithEntries: number
  phase: ReturnType<typeof getRelationshipPhase>
  themes: FounderThemesSnapshot | null
  themesBlock: string
  dailySystemStructure: string
  questionHint: string
  shapeId: string
}

export async function loadDailyCoachingContext(params: {
  userId: string
  kind: DailyInsightKind
  targetDate: string
  recentLessons?: string[]
  db?: SupabaseClient
}): Promise<DailyCoachingContext> {
  const db = params.db ?? getServerSupabase()
  const daysWithEntries = await getDaysWithEntries(params.userId, db)
  const phase = getRelationshipPhase(daysWithEntries)
  const themes = await getFounderThemes(params.userId, db)
  const allowArc = shouldAllowArcSprinkleOnDaily({
    userId: params.userId,
    targetDate: params.targetDate,
    phase,
    hasRepeatingLessonSignal: hasRepeatingLessonSignal(params.recentLessons ?? []),
    hasFounderThemes: Boolean(themes?.themes.length),
  })
  const { shapeId, instructions } = pickDailyResponseShape({
    userId: params.userId,
    kind: params.kind,
    targetDate: params.targetDate,
    phase,
    allowArcSprinkle: allowArc,
  })
  const wordBudget = getDailyWordBudget(phase, params.kind)
  const dailySystemStructure = buildDailyStructurePrompt({
    kind: params.kind,
    phase,
    shapeInstructions: instructions,
    wordBudget,
  })
  const themesBlock =
    allowArc && shapeId === 'pattern_nudge'
      ? buildFounderThemesPromptBlock(themes, 'daily_sprinkle')
      : ''

  const questionHint =
    wordBudget.questionLikelihood === 'always'
      ? 'End with ONE complete open question.'
      : wordBudget.questionLikelihood === 'often'
        ? 'Usually end with ONE open question unless your shape says otherwise.'
        : wordBudget.questionLikelihood === 'sometimes'
          ? 'A question is optional — only if it adds something new.'
          : 'Skip generic reframe questions; prefer a specific closing line.'

  return {
    daysWithEntries,
    phase,
    themes,
    themesBlock,
    dailySystemStructure,
    questionHint,
    shapeId,
  }
}
