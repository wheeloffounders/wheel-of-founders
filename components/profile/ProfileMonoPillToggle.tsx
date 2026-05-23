'use client'

import { cn } from '@/components/ui/utils'

type ProfileMonoPillToggleProps = {
  enabled: boolean
  onToggle: () => void
  label: string
  description?: string
  id?: string
}

/** High-contrast monochrome pill — replaces generic mobile toggles on dossier. */
export function ProfileMonoPillToggle({
  enabled,
  onToggle,
  label,
  description,
  id,
}: ProfileMonoPillToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 id={id} className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </h3>
        {description ? (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      <div
        className="inline-flex rounded-full border border-slate-200/80 bg-slate-50/80 p-0.5 dark:border-slate-600/60 dark:bg-gray-900/40"
        role="group"
        aria-labelledby={id}
      >
        <button
          type="button"
          role="switch"
          aria-checked={!enabled}
          onClick={() => enabled && onToggle()}
          className={cn(
            'rounded-full px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase transition-colors',
            !enabled
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400',
          )}
        >
          Off
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => !enabled && onToggle()}
          className={cn(
            'rounded-full px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase transition-colors',
            enabled
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400',
          )}
        >
          On
        </button>
      </div>
    </div>
  )
}
