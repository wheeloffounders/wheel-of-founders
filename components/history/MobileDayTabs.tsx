'use client'

import { format, isSameDay } from 'date-fns'

export interface DayTabItem {
  date: Date
  hasEntries: boolean
}

interface MobileDayTabsProps {
  days: DayTabItem[]
  selectedDate: Date
  onSelectDay: (date: Date) => void
  todayStr: string
}

/** Horizontal day tabs — navy bar, coral selection (matches Daily History design system). */
export function MobileDayTabs({ days, selectedDate, onSelectDay, todayStr }: MobileDayTabsProps) {
  return (
    <div className="bg-[#152b50] rounded-xl overflow-hidden">
      <div className="overflow-x-auto px-2 py-2 scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {days.map((day) => {
            const isSelected = isSameDay(day.date, selectedDate)
            const isToday = format(day.date, 'yyyy-MM-dd') === todayStr
            const dayName = format(day.date, 'EEE')
            const dayNumber = format(day.date, 'd')

            return (
              <button
                key={day.date.toISOString()}
                type="button"
                onClick={() => onSelectDay(day.date)}
                className={`
                  flex flex-col items-center justify-center px-3 py-2.5 rounded-lg min-w-[60px] min-h-[44px]
                  transition-colors touch-manipulation
                  ${isSelected
                    ? 'bg-[#ef725c] text-white shadow-md'
                    : day.hasEntries
                      ? 'bg-white/10 text-white hover:bg-white/15'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }
                `}
              >
                <span className="text-xs font-medium">{dayName}</span>
                <span className="text-lg font-bold">{dayNumber}</span>
                {isToday && !isSelected && (
                  <span className="text-[10px] font-medium text-[#f0886c]">Today</span>
                )}
                {!day.hasEntries && !isSelected && !isToday && (
                  <span className="text-[10px] mt-0.5 text-white/35">—</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
