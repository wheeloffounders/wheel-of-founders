'use client'

import { Button } from '@/components/ui/button'
import { colors } from '@/lib/design-tokens'

export type ClearYourPathChoice = 'move' | 'later'

type ClearYourPathModalProps = {
  open: boolean
  taskCount: number | null
  loadingCount: boolean
  onChoose: (choice: ClearYourPathChoice) => void
}

export function ClearYourPathModal({ open, taskCount, loadingCount, onChoose }: ClearYourPathModalProps) {
  if (!open) return null

  const n = taskCount ?? 0
  const taskWord = n === 1 ? 'task' : 'tasks'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-path-title"
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-[#152b50]/20 bg-white p-6 shadow-xl dark:border-sky-800/40 dark:bg-gray-900">
        <h2 id="clear-path-title" className="text-lg font-semibold text-gray-900 dark:text-white">
          Clear your path
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          Mrs. Deer recommends rescheduling your original day to focus on this resolution. What should we do with
          today&apos;s{' '}
          {loadingCount ? (
            <span className="tabular-nums text-gray-500">…</span>
          ) : (
            <span className="font-semibold tabular-nums text-[#152b50] dark:text-sky-200">{n}</span>
          )}{' '}
          {loadingCount ? 'tasks' : taskWord}?
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            type="button"
            className="w-full font-semibold"
            style={{ backgroundColor: colors.navy.DEFAULT, color: '#fff' }}
            disabled={loadingCount}
            onClick={() => onChoose('move')}
          >
            Move all to tomorrow
          </Button>
          <Button type="button" variant="outline" className="w-full border-gray-300 dark:border-gray-600" onClick={() => onChoose('later')}>
            Decide later
          </Button>
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          &quot;Decide later&quot; keeps your tasks on today so you can rearrange them yourself.
        </p>
      </div>
    </div>
  )
}
