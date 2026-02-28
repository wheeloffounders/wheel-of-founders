'use client'

import { Star } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

interface WinSelectorProps {
  wins: string[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  favoriteIndex: number | null
  onFavorite: (index: number) => void
}

export function WinSelector({
  wins,
  selectedIndex,
  onSelect,
  favoriteIndex,
  onFavorite,
}: WinSelectorProps) {
  if (wins.length === 0) return null

  const topWins = wins.slice(0, 5)

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Click the stars to pick your favorite
      </p>
      <ul className="space-y-2">
        {topWins.map((win, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              className={`w-full text-left flex items-start gap-2 p-3 border-2 transition-colors hover:bg-gray-50 dark:bg-gray-900 ${selectedIndex === i ? 'border-[#EF725C] bg-[#FFF0EC] dark:bg-[#1E293B]' : 'border-[#152B50] dark:border-[#334155]'}`}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onFavorite(i) }}
                className="flex gap-0.5 shrink-0 mt-0.5"
                aria-label={`Rate win ${i + 1}`}
              >
                {[1, 2, 3].map((star) => (
                  <Star
                    key={star}
                    className="w-5 h-5"
                    fill={favoriteIndex === i ? colors.amber.DEFAULT : 'transparent'}
                    stroke={favoriteIndex === i ? colors.amber.DEFAULT : colors.neutral.border}
                    strokeWidth={2}
                  />
                ))}
              </button>
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
