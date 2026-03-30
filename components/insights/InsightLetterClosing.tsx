'use client'

type Cadence = 'week' | 'month' | 'quarter'

const LINE: Record<Cadence, string> = {
  week: "I'll be here next week to see what you build.",
  month: "I'll be here next month to see what you build.",
  quarter: "I'll be here next quarter to see what you build.",
}

export function InsightLetterClosing({ cadence, className = '' }: { cadence: Cadence; className?: string }) {
  return (
    <div className={`space-y-2 text-sm text-gray-700 dark:text-gray-300 ${className}`}>
      <p className="italic leading-relaxed">{LINE[cadence]}</p>
      <p className="text-gray-600 dark:text-gray-400">— Mrs. Deer</p>
    </div>
  )
}
