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

export function MobileDayTabs({ days, selectedDate, onSelectDay, todayStr }: MobileDayTabsProps) {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
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
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                    : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500'
                }
              `}
            >
              <span className="text-xs font-medium">{dayName}</span>
              <span className="text-lg font-bold">{dayNumber}</span>
              {isToday && !isSelected && (
                <span className="text-[10px] font-medium text-[#ef725c] dark:text-[#f0886c]">Today</span>
              )}
              {!day.hasEntries && !isSelected && !isToday && (
                <span className="text-[10px] mt-0.5 text-gray-400">—</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
