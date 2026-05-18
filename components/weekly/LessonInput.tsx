'use client'

import { KeyRound } from 'lucide-react'
import { colors } from '@/lib/design-tokens'
import { cn } from '@/components/ui/utils'

interface LessonInputProps {
  lessons: string[]
  keyIndices: number[]
  onToggle: (index: number) => void
  selectionLocked?: boolean
}

export function LessonInput({
  lessons,
  keyIndices,
  onToggle,
  selectionLocked = false,
}: LessonInputProps) {
  if (lessons.length === 0) return null

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {selectionLocked
          ? 'Mark key lessons on Pro to build your quarterly memory.'
          : 'Click to mark lessons that felt important (multiple allowed).'}
      </p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-700/80">
        {lessons.map((lesson, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => !selectionLocked && onToggle(i)}
              disabled={selectionLocked}
              title={selectionLocked ? 'Upgrade to Pro to mark key lessons for quarterly memory' : undefined}
              className={cn(
                'flex w-full items-center gap-3 py-4 text-left transition-colors first:pt-0',
                selectionLocked ? 'cursor-not-allowed opacity-95' : 'hover:bg-gray-50/80 dark:hover:bg-gray-900/40',
                keyIndices.includes(i) && !selectionLocked && 'bg-[#FFF0EC]/60 dark:bg-[#1E293B]/40'
              )}
            >
              <span className="flex shrink-0">
                {keyIndices.includes(i) ? (
                  <KeyRound className="h-5 w-5" style={{ color: colors.coral.DEFAULT }} />
                ) : (
                  <span
                    className="flex h-5 w-5 items-center justify-center border-2 border-[#152B50] dark:border-slate-500"
                    aria-hidden
                  />
                )}
              </span>
              <span className="text-gray-900 dark:text-white">{lesson}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
