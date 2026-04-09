'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'

/** Shared copy for calendar subscription flows — reminders as caring nudges, not spam. */
export function CalendarMrsDeerReminderNote() {
  return (
    <div
      className="mt-4 flex w-full max-w-full min-w-0 items-start gap-3 overflow-hidden rounded-lg border border-[#EF725C]/45 bg-[#FFF0EC] px-3 py-3 dark:border-[#F28771]/35 dark:bg-[#EF725C]/10 sm:px-4"
      role="note"
    >
      <MrsDeerAvatar expression="encouraging" size="small" className="shrink-0" />
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
        I&apos;ll gently remind you when it&apos;s time to reflect. No spam — just a nudge from me.
      </p>
    </div>
  )
}
