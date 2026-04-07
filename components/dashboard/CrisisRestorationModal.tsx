'use client'

import { Button } from '@/components/ui/button'
import { colors } from '@/lib/design-tokens'

type CrisisRestorationModalProps = {
  open: boolean
  taskCount: number
  /** True while refetching count from /api/tasks/restorable-from-tomorrow */
  countLoading?: boolean
  loading: boolean
  onRestore: () => void
  /** User chose to leave tasks in tomorrow (only shown when restore is available). */
  onKeepTomorrow: () => void
  /** Modal dismissed when nothing was restorable (Got it). */
  onAcknowledgeNoRestore?: () => void
}

export function CrisisRestorationModal({
  open,
  taskCount,
  countLoading = false,
  loading,
  onRestore,
  onKeepTomorrow,
  onAcknowledgeNoRestore,
}: CrisisRestorationModalProps) {
  if (!open) return null

  const canRestore = !countLoading && taskCount > 0

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-restore-title"
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-emerald-200/80 bg-white p-6 shadow-xl dark:border-emerald-900/50 dark:bg-gray-900">
        <h2 id="crisis-restore-title" className="text-lg font-semibold text-gray-900 dark:text-white">
          Restore your day?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          The fire is out. Since you moved today&apos;s tasks to tomorrow, you can pull them back into this afternoon,
          or keep the day light.
        </p>
        {countLoading ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Checking what can move back to today…</p>
        ) : canRestore ? (
          <p className="mt-2 text-sm font-medium text-[#152b50] dark:text-sky-200">
            {taskCount} task{taskCount === 1 ? '' : 's'} can return to today.
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Nothing left to pull back to today—your tasks stay on tomorrow&apos;s plan. You&apos;re all set for a lighter
            afternoon.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          {canRestore ? (
            <Button
              type="button"
              className="w-full font-semibold"
              style={{ backgroundColor: colors.navy.DEFAULT, color: '#fff' }}
              disabled={loading}
              onClick={() => onRestore()}
            >
              {loading ? 'Restoring…' : 'Restore to today'}
            </Button>
          ) : null}
          {countLoading ? (
            <button
              type="button"
              className="w-full rounded-lg border border-transparent py-2.5 text-sm font-medium text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => onAcknowledgeNoRestore?.()}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className="w-full rounded-lg border border-transparent py-2.5 text-sm font-medium text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => {
                if (canRestore) onKeepTomorrow()
                else onAcknowledgeNoRestore?.()
              }}
            >
              {canRestore ? 'Keep in tomorrow' : 'Got it'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
