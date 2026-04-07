'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

export type EveningTaskRow = {
  id: string
  description: string
  completed: boolean
  needle_mover?: boolean
  movedToTomorrow?: boolean
}

type Props = {
  tasks: EveningTaskRow[]
  justCompletedId: string | null
  prefersReducedMotion: boolean | null
  onToggleComplete: (taskId: string, currentCompleted: boolean) => void
  onMoveToTomorrow: (task: EveningTaskRow) => void
  onUndoMove: (task: EveningTaskRow) => void
}

export function EveningTaskRows({
  tasks,
  justCompletedId,
  prefersReducedMotion,
  onToggleComplete,
  onMoveToTomorrow,
  onUndoMove,
}: Props) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">No tasks on this plan day.</p>
    )
  }
  return (
    <ul className="space-y-4">
      {tasks.map((task, index) => (
        <motion.li
          key={task.id}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={`flex items-start gap-4 rounded-xl py-5 px-4 sm:px-5 sm:py-6 transition-all duration-300 ${
            justCompletedId === task.id ? 'animate-pulse' : ''
          } ${
            task.movedToTomorrow
              ? 'bg-blue-50 dark:bg-blue-900/20'
              : task.completed
                ? 'bg-emerald-50 dark:bg-emerald-900/30'
                : 'bg-gray-50 dark:bg-gray-700'
          }`}
        >
          <motion.button
            type="button"
            onClick={() => onToggleComplete(task.id, task.completed)}
            className="flex-shrink-0 mt-1 w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              backgroundColor: task.completed ? colors.emerald.DEFAULT : 'transparent',
              borderWidth: task.completed ? '0' : '2px',
              borderColor: colors.neutral.border,
              color: task.completed ? '#FFFFFF' : 'transparent',
            }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {task.completed && (
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </motion.div>
            )}
          </motion.button>
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <span
              className={`min-w-0 text-lg leading-snug break-words ${
                task.completed ? 'text-emerald-600' : 'text-gray-900 dark:text-white'
              }`}
            >
              {task.description}
            </span>
            {task.completed && (
              <p className="text-sm font-medium" style={{ color: colors.emerald.DEFAULT }}>
                ✓ Priority completed with intention
              </p>
            )}
            {!task.completed && !task.movedToTomorrow && (
              <button
                type="button"
                onClick={() => onMoveToTomorrow(task)}
                className="self-start rounded-lg py-2.5 px-3 text-left text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 active:bg-black/5 dark:active:bg-white/10 min-h-[44px] inline-flex items-center"
              >
                Move to tomorrow
              </button>
            )}
            {!task.completed && task.movedToTomorrow && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs text-blue-700 dark:text-blue-300">Task moved to tomorrow</span>
                <button
                  type="button"
                  onClick={() => onUndoMove(task)}
                  className="self-start rounded-lg py-2.5 px-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline underline-offset-2 min-h-[44px] inline-flex items-center"
                >
                  Undo move
                </button>
              </div>
            )}
          </div>
        </motion.li>
      ))}
    </ul>
  )
}
