'use client'

import { Star } from 'lucide-react'
import { colors } from '@/lib/design-tokens'
import { cn } from '@/components/ui/utils'

interface WinReflectionProps {
  wins: string[]
  favoriteIndices: number[]
  onToggle: (index: number) => void
  selectionLocked?: boolean
}

export function WinReflection({
  wins,
  favoriteIndices,
  onToggle,
  selectionLocked = false,
}: WinReflectionProps) {
  if (wins.length === 0) return null

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {selectionLocked
          ? 'Star wins on Pro to build your quarterly memory.'
          : 'Click stars on wins that felt meaningful (multiple allowed).'}
      </p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-700/80">
        {wins.map((win, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => !selectionLocked && onToggle(i)}
              disabled={selectionLocked}
              title={selectionLocked ? 'Upgrade to Pro to star wins for quarterly memory' : undefined}
              className={cn(
                'flex w-full items-start gap-3 py-4 text-left transition-colors first:pt-0',
                selectionLocked ? 'cursor-not-allowed opacity-95' : 'hover:bg-gray-50/80 dark:hover:bg-gray-900/40',
                favoriteIndices.includes(i) && !selectionLocked && 'bg-[#FFF0EC]/60 dark:bg-[#1E293B]/40'
              )}
            >
              <span className="mt-0.5 flex shrink-0 gap-0.5">
                {[1, 2, 3].map((star) => (
                  <Star
                    key={star}
                    className="h-5 w-5"
                    fill={favoriteIndices.includes(i) ? colors.amber.DEFAULT : 'transparent'}
                    stroke={favoriteIndices.includes(i) ? colors.amber.DEFAULT : colors.neutral.border}
                    strokeWidth={2}
                  />
                ))}
              </span>
              <span className="min-w-0 flex-1 break-words text-gray-900 dark:text-white">{win}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
