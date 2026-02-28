'use client'

import { ArrowRight } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

interface TransformationPair {
  start: string
  now: string
}

interface TransformationSelectorProps {
  pairs: TransformationPair[]
  options: string[]
  selectedIndex: number | null
  onSelect: (index: number | null) => void
  question?: string
}

export function TransformationSelector({
  pairs,
  options,
  selectedIndex,
  onSelect,
  question = "What's the biggest shift for you?",
}: TransformationSelectorProps) {
  if (pairs.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {pairs.map((pair, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 border-2"
            style={{ borderColor: colors.navy.DEFAULT }}
          >
            <div className="flex-1">
              <p className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">
                BEFORE
              </p>
              <p className="text-gray-900 dark:text-white">&quot;{pair.start}&quot;</p>
            </div>
            <ArrowRight className="w-5 h-5 shrink-0" style={{ color: colors.coral.DEFAULT }} />
            <div className="flex-1">
              <p className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">
                NOW
              </p>
              <p className="text-gray-900 dark:text-white">&quot;{pair.now}&quot;</p>
            </div>
          </div>
        ))}
      </div>
      {options.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">
            {question}
          </p>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(selectedIndex === i ? null : i)}
                className={`w-full text-left flex items-center gap-3 p-3 border-2 transition-colors ${selectedIndex === i ? 'border-[#EF725C] bg-[#FFF0EC] dark:bg-[#1E293B]' : 'border-[#152B50] dark:border-[#334155]'}`}
              >
                <span
                  className={`w-5 h-5 flex shrink-0 border-2 flex items-center justify-center text-sm ${selectedIndex === i ? 'border-[#EF725C]' : 'border-[#152B50] dark:border-[#334155]'}`}
                >
                  {selectedIndex === i ? '✓' : ''}
                </span>
                <span className="text-gray-900 dark:text-white">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
