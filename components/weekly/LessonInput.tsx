'use client'

import { KeyRound } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

interface LessonInputProps {
  lessons: string[]
  keyIndices: number[]
  onToggle: (index: number) => void
}

export function LessonInput({
  lessons,
  keyIndices,
  onToggle,
}: LessonInputProps) {
  if (lessons.length === 0) return null

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-white">
        🔑 Click to mark lessons that felt important (multiple allowed)
      </p>
      <ul className="space-y-2">
        {lessons.map((lesson, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onToggle(i)}
              className={`w-full text-left flex items-center gap-3 p-3 border-2 transition-colors hover:bg-gray-50 dark:bg-gray-900 ${keyIndices.includes(i) ? 'border-[#EF725C] bg-[#FFF0EC] dark:bg-[#1E293B]' : 'border-[#152B50] dark:border-[#334155]'}`}
            >
              <span className="flex shrink-0">
                {keyIndices.includes(i) ? (
                  <KeyRound className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
                ) : (
                  <span className="w-5 h-5 border-2 flex items-center justify-center text-sm" style={{ borderColor: colors.navy.DEFAULT }} />
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
