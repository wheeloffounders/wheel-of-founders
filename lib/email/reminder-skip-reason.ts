/**
 * Explains why the daily reminder cron did not send morning or evening for a user
 * who passed the early gates (unsubscribe / bounce / email engagement).
 *
 * Morning sends when: within morning window AND morning tasks not all complete.
 * Evening sends when: within evening window AND evening review missing (morning completion not required).
 */
export function describeSilentReminderSkip(params: {
  localNow: Date
  morningTime: string
  eveningTime: string
  morningCompleted: boolean
  eveningCompleted: boolean
  timezone: string
  isWithinWindow: (localNow: Date, hhmm: string, minutes?: number) => boolean
}): { code: string; detail: string } {
  const { localNow, morningTime, eveningTime, morningCompleted, eveningCompleted, timezone, isWithinWindow } =
    params
  const Wm = isWithinWindow(localNow, morningTime)
  const We = isWithinWindow(localNow, eveningTime)
  const hh = String(localNow.getUTCHours()).padStart(2, '0')
  const mm = String(localNow.getUTCMinutes()).padStart(2, '0')
  const localClock = `${hh}:${mm}`

  if (Wm && !morningCompleted) {
    return {
      code: 'logic_mismatch',
      detail: `Expected morning send (${morningTime} window); user ${localClock} ${timezone}`,
    }
  }
  if (We && !eveningCompleted) {
    return {
      code: 'logic_mismatch',
      detail: `Expected evening send (${eveningTime} window); user ${localClock} ${timezone}`,
    }
  }

  if (!Wm && !We) {
    return {
      code: 'outside_reminder_windows',
      detail: `Local ${localClock} (${timezone}) not within ±5m of morning ${morningTime} or evening ${eveningTime}`,
    }
  }

  if (Wm && morningCompleted) {
    return {
      code: 'morning_slot_done',
      detail: 'Morning window but morning tasks already completed (wait for evening window for evening nudge)',
    }
  }

  if (We && eveningCompleted) {
    return {
      code: 'evening_slot_done',
      detail: 'Evening window but evening review already saved for this plan date',
    }
  }

  return {
    code: 'idle',
    detail: `No reminder slot applied (morning=${Wm}, evening=${We}, mc=${morningCompleted}, ec=${eveningCompleted})`,
  }
}
