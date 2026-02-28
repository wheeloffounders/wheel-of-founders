'use client'

import { colors } from '@/lib/design-tokens'

interface LessonSelectorProps {
  lessons: string[]
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export function LessonSelector({ lessons, selectedIndex, onSelect }: LessonSelectorProps) {
  if (lessons.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Select the lesson that mattered most
      </p>
      <ul className="space-y-2">
        {lessons.map((lesson, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(selectedIndex === i ? -1 : i)}
              className={`w-full text-left flex items-center gap-3 p-3 border-2 transition-colors ${selectedIndex === i ? 'border-[#EF725C] bg-[#FFF0EC] dark:bg-[#1E293B]' : 'border-[#152B50] dark:border-[#334155]'}`}
            >
              <span
                className={`w-5 h-5 flex shrink-0 border-2 flex items-center justify-center text-sm ${selectedIndex === i ? 'border-[#EF725C]' : 'border-[#152B50] dark:border-[#334155]'}`}
              >
                {selectedIndex === i ? '✓' : ''}
              </span>
              <span className="text-gray-900 dark:text-white">{lesson}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
