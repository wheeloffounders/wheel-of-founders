'use client'

import { Button } from '@/components/ui/button'
import { MicroLessonCard } from '@/components/MicroLessonCard'

interface EmptyTasksProps {
  onAddTask: () => void
}

export function EmptyTasks({ onAddTask }: EmptyTasksProps) {
  return (
    <div className="text-center p-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
      <p className="text-gray-500 dark:text-gray-400">No tasks yet.</p>
      <MicroLessonCard location="morning" compact className="mt-3 text-left" />
      <Button onClick={onAddTask} className="mt-4">
        Add your first task →
      </Button>
    </div>
  )
}
