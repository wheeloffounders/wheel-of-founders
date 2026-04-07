/**
 * Evening "auto-snooze": pending morning tasks that are not already framed as a win/lesson.
 */

export function isTaskCoveredByEveningWinOrLesson(
  taskDescription: string,
  wins: string[],
  lessons: string[]
): boolean {
  const d = taskDescription.trim().toLowerCase()
  if (d.length < 4) return false
  const pool = [...wins, ...lessons].map((x) => x.trim().toLowerCase()).filter((x) => x.length >= 4)
  for (const p of pool) {
    if (p.includes(d) || d.includes(p)) return true
    const dw = new Set(d.split(/\s+/).filter((w) => w.length > 3))
    const pw = p.split(/\s+/).filter((w) => w.length > 3)
    let overlap = 0
    for (const w of pw) {
      if (dw.has(w)) overlap++
    }
    if (overlap >= 2) return true
  }
  return false
}

export function getPendingTasksForSnoozePrompt<
  T extends { id: string; description: string; completed: boolean; movedToTomorrow?: boolean },
>(tasks: T[], wins: string[], lessons: string[]): T[] {
  const winLines = wins.map((w) => w.trim()).filter(Boolean)
  const lessonLines = lessons.map((l) => l.trim()).filter(Boolean)
  return tasks.filter(
    (t) =>
      !t.completed &&
      !t.movedToTomorrow &&
      t.description.trim().length > 0 &&
      !isTaskCoveredByEveningWinOrLesson(t.description, winLines, lessonLines)
  )
}
