'use client'

interface GoalProgressProps {
  primaryGoal: string | null
  progressItems: string[]
  missingItem?: string | null
  mrsDeerQuestion: string
}

export function GoalProgress({
  primaryGoal,
  progressItems,
  missingItem,
  mrsDeerQuestion,
}: GoalProgressProps) {
  if (!primaryGoal) return null

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-100/80 bg-slate-50/50 p-4 dark:border-slate-700/60 dark:bg-slate-900/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Your goal
        </p>
        <p className="mt-1 text-base font-medium text-gray-900 dark:text-white">{primaryGoal}</p>
      </div>

      {progressItems.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">This week&apos;s progress</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-900 dark:text-white">
            {progressItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {missingItem ? (
        <p className="text-sm italic text-gray-600 dark:text-gray-400">Missing: {missingItem}</p>
      ) : null}

      <div className="border-t border-slate-100 pt-5 dark:border-slate-700/80">
        <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">{mrsDeerQuestion}</p>
      </div>
    </div>
  )
}
