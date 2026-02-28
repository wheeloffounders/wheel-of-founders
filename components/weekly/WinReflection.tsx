'use client'

import { Star } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

interface WinReflectionProps {
  wins: string[]
  favoriteIndices: number[]
  onToggle: (index: number) => void
}

export function WinReflection({
  wins,
  favoriteIndices,
  onToggle,
}: WinReflectionProps) {
  if (wins.length === 0) return null

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-white">
        ⭐ Click stars on wins that felt meaningful (multiple allowed)
      </p>
      <ul className="space-y-2">
        {wins.map((win, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onToggle(i)}
              className={`w-full text-left flex items-start gap-2 p-3 border-2 transition-colors hover:bg-gray-50 dark:bg-gray-900 ${favoriteIndices.includes(i) ? 'border-[#EF725C] bg-[#FFF0EC] dark:bg-[#1E293B]' : 'border-[#152B50] dark:border-[#334155]'}`}
            >
              <span className="flex gap-0.5 shrink-0 mt-0.5">
                {[1, 2, 3].map((star) => (
                  <Star
                    key={star}
                    className="w-5 h-5"
                    fill={favoriteIndices.includes(i) ? colors.amber.DEFAULT : 'transparent'}
                    stroke={favoriteIndices.includes(i) ? colors.amber.DEFAULT : colors.neutral.border}
                    strokeWidth={2}
                  />
                ))}
              </span>
              <span className="flex-1 text-gray-900 dark:text-white">
                {win}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
