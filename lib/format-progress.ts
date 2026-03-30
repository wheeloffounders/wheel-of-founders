export type ProgressStatus = 'not_started' | 'in_progress' | 'ready'

export function getProgressStatus(progress: number, target: number): {
  status: ProgressStatus
  label: string
  remaining: number | null
} {
  const safeProgress = Math.max(0, Number.isFinite(progress) ? Math.floor(progress) : 0)
  const safeTarget = Math.max(0, Number.isFinite(target) ? Math.floor(target) : 0)

  if (safeTarget <= 0 || safeProgress >= safeTarget) {
    return {
      status: 'ready',
      label: 'Ready to unlock',
      remaining: 0,
    }
  }

  if (safeProgress <= 0) {
    return {
      status: 'not_started',
      label: 'Start today to unlock',
      remaining: null,
    }
  }

  const remaining = Math.max(0, safeTarget - safeProgress)
  return {
    status: 'in_progress',
    label: `${remaining} day${remaining === 1 ? '' : 's'} away`,
    remaining,
  }
}
