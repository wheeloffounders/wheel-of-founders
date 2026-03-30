'use client'

import { useMicroLesson, type MicroLessonLocation } from '@/lib/hooks/useMicroLesson'

interface MicroLessonCardProps {
  location: MicroLessonLocation
  compact?: boolean
  className?: string
}

export function MicroLessonCard({ location, compact = true, className = '' }: MicroLessonCardProps) {
  const { lesson } = useMicroLesson(location)

  if (!lesson?.message) return null

  return (
    <div
      className={`rounded-lg border-l-4 border-[#ef725c] bg-[#152b50]/5 dark:bg-[#152b50]/20 ${
        compact ? 'p-3' : 'p-4'
      } ${className}`}
    >
      <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-300`}>
        {lesson.emoji ? `${lesson.emoji} ` : ''}
        {lesson.message}
      </p>
    </div>
  )
}
