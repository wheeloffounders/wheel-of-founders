'use client'

type Props = {
  text: string | null | undefined
  className?: string
}

/**
 * Mrs. Deer “Coach layer” — one-line heuristic read on top of raw metrics.
 */
export function CoachVerdictBox({ text, className }: Props) {
  const t = text?.trim()
  if (!t) return null
  return (
    <div
      className={`rounded-lg border border-blue-200/90 bg-blue-50 px-3 py-2.5 text-sm leading-snug text-blue-950 shadow-sm dark:border-blue-800/55 dark:bg-blue-950/35 dark:text-blue-50 ${className ?? ''}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-900/90 dark:text-blue-200/90 not-italic mb-1">
        Mrs. Deer — quick note
      </p>
      <p className="italic font-medium text-blue-950 dark:text-blue-50">{t}</p>
    </div>
  )
}
