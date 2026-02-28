'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

interface ExpandableDataProps {
  title: string
  wins?: string[]
  lessons?: string[]
}

export function ExpandableData({ title, wins = [], lessons = [] }: ExpandableDataProps) {
  const [open, setOpen] = useState(false)

  if (wins.length === 0 && lessons.length === 0) return null

  return (
    <div className="border-2" style={{ borderColor: colors.navy.DEFAULT }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-medium transition-colors hover:bg-gray-50 dark:bg-gray-900 text-[#152B50] dark:text-white"
      >
        {title}
        {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 space-y-4 border-t-2" style={{ borderColor: colors.neutral.border }}>
          {wins.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">
                Wins This Week
              </h4>
              <ul className="space-y-1.5">
                {wins.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span style={{ color: colors.coral.DEFAULT }}>•</span>
                    <span className="text-gray-900 dark:text-white">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lessons.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">
                Lessons
              </h4>
              <ul className="space-y-1.5">
                {lessons.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span style={{ color: colors.navy.DEFAULT }}>•</span>
                    <span className="text-gray-900 dark:text-white">{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
