'use client'

import { WeeklyInsightSection } from '@/components/weekly/WeeklyInsightSection'
import type { WeeklyInsightAccent } from '@/components/weekly/WeeklyInsightSection'
import { WinReflection } from '@/components/weekly/WinReflection'
import { LessonInput } from '@/components/weekly/LessonInput'

type CelebrationAndGapsCardProps = {
  winsAccent: WeeklyInsightAccent
  lessonsAccent: WeeklyInsightAccent
  wins: string[]
  lessons: string[]
  favoriteWinIndices: number[]
  keyLessonIndices: number[]
  onToggleFavoriteWin: (index: number) => void
  onToggleKeyLesson: (index: number) => void
  selectionLocked: boolean
}

/** Wins vs lessons alignment — celebration and gap reflections for the week. */
export function CelebrationAndGapsCard({
  winsAccent,
  lessonsAccent,
  wins,
  lessons,
  favoriteWinIndices,
  keyLessonIndices,
  onToggleFavoriteWin,
  onToggleKeyLesson,
  selectionLocked,
}: CelebrationAndGapsCardProps) {
  if (wins.length === 0 && lessons.length === 0) return null

  return (
    <div className="min-w-0 space-y-6">
      {wins.length > 0 ? (
        <WeeklyInsightSection title="Your Top Wins" accent={winsAccent}>
          <WinReflection
            wins={wins}
            favoriteIndices={favoriteWinIndices}
            onToggle={onToggleFavoriteWin}
            selectionLocked={selectionLocked}
          />
        </WeeklyInsightSection>
      ) : null}

      {lessons.length > 0 ? (
        <WeeklyInsightSection title="Your Key Insights" accent={lessonsAccent}>
          <LessonInput
            lessons={lessons}
            keyIndices={keyLessonIndices}
            onToggle={onToggleKeyLesson}
            selectionLocked={selectionLocked}
          />
        </WeeklyInsightSection>
      ) : null}
    </div>
  )
}
