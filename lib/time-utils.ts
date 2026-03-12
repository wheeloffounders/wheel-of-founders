import { isAfter, isBefore, setHours, setMinutes, setSeconds } from 'date-fns'

export type DayPhase = 'late_night' | 'morning_catchup' | 'normal'

export interface TimeAwareness {
  phase: DayPhase
  isAfterMidnight: boolean
  isMorningCatchup: boolean
}

function withTime(base: Date, hours: number, minutes: number): Date {
  return setSeconds(setMinutes(setHours(base, hours), minutes), 0)
}

export function getTimeAwareness(nowInput?: Date): TimeAwareness {
  const now = nowInput ?? new Date()

  const midnight = withTime(now, 0, 0)
  const fourAm = withTime(now, 4, 0)
  const noon = withTime(now, 12, 0)

  const afterMidnight = !isBefore(now, midnight) && isBefore(now, fourAm)
  const morningCatchup = !isBefore(now, fourAm) && isBefore(now, noon)

  let phase: DayPhase = 'normal'
  if (afterMidnight) phase = 'late_night'
  else if (morningCatchup) phase = 'morning_catchup'

  return {
    phase,
    isAfterMidnight: afterMidnight,
    isMorningCatchup: morningCatchup,
  }
}

