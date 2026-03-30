'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'

/** Shared copy for calendar subscription flows — reminders as caring nudges, not spam. */
export function CalendarMrsDeerReminderNote() {
  return (
    <div
      className="mt-4 flex gap-3 border border-[#EF725C]/45 dark:border-[#F28771]/35 bg-[#FFF0EC] dark:bg-[#EF725C]/10 px-3 py-3"
      style={{ borderRadius: 0 }}
      role="note"
    >
      <MrsDeerAvatar expression="encouraging" size="small" className="shrink-0" />
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        I&apos;ll gently remind you when it&apos;s time to reflect. No spam — just a nudge from me.
      </p>
    </div>
  )
}
