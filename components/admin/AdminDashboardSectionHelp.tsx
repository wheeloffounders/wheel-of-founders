'use client'

import { useId, useState } from 'react'
import { cn } from '@/components/ui/utils'

type Props = {
  /** Visible heading row (e.g. h2 + icon). */
  aside: React.ReactNode
  /** Short name for screen readers. */
  label: string
  children: React.ReactNode
  className?: string
}

/**
 * Heading row plus "(?)" toggle; expanded copy is a full-width subtle alert below.
 */
export function AdminDashboardHelpBlock({ aside, label, children, className }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className={cn('mb-4 w-full space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {aside}
        <button
          type="button"
          className="inline-flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-50 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{label}</span>
          <span aria-hidden>(?)</span>
        </button>
      </div>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={label}
          className="rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2.5 text-sm leading-relaxed text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-100"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
