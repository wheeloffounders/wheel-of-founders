'use client'

import { Heart, Battery } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

export interface DayMood {
  date: string
  dayName: string
  mood: number | null
  energy: number | null
  needleMovers: number
}

interface MoodChartProps {
  days: DayMood[]
  avgMood: number | null
  avgEnergy: number | null
  moodTrend?: 'up' | 'down' | 'flat'
  energyTrend?: 'up' | 'down' | 'flat'
}

const MOOD_LABELS: Record<number, string> = {
  1: 'Tough',
  2: 'Meh',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
}

export function MoodChart({ days, avgMood, avgEnergy, moodTrend, energyTrend }: MoodChartProps) {
  const maxVal = 5

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4">
        {avgMood != null && (
          <div className="flex items-center gap-3 p-4 border-2" style={{ borderColor: colors.navy.DEFAULT }}>
            <Heart className="w-6 h-6 flex-shrink-0" style={{ color: colors.coral.DEFAULT }} />
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                MOOD AVG
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {avgMood.toFixed(1)}/5
                {moodTrend && (
                  <span className="text-sm font-normal ml-1">
                    {moodTrend === 'up' && '↑'}
                    {moodTrend === 'down' && '↓'}
                    {moodTrend === 'flat' && '→'}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {MOOD_LABELS[Math.round(avgMood)]}
              </p>
            </div>
          </div>
        )}
        {avgEnergy != null && (
          <div className="flex items-center gap-3 p-4 border-2" style={{ borderColor: colors.navy.DEFAULT }}>
            <Battery className="w-6 h-6 flex-shrink-0" style={{ color: colors.amber.DEFAULT }} />
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                ENERGY AVG
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {avgEnergy.toFixed(1)}/5
                {energyTrend && (
                  <span className="text-sm font-normal ml-1">
                    {energyTrend === 'up' && '↑'}
                    {energyTrend === 'down' && '↓'}
                    {energyTrend === 'flat' && '→'}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Day-by-day bars */}
      {days.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            By day
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => (
              <div
                key={d.date}
                className="flex-shrink-0 w-14 text-center"
              >
                <p className="text-xs mb-1 text-gray-600 dark:text-gray-300">
                  {d.dayName}
                </p>
                <div className="flex gap-1 justify-center">
                  {d.mood != null && (
                    <div
                      className="h-8 min-w-[20px] flex items-end justify-center"
                      title={`Mood: ${d.mood}`}
                    >
                      <div
                        className="w-4 rounded-none"
                        style={{
                          height: `${(d.mood / maxVal) * 100}%`,
                          minHeight: d.mood > 0 ? '4px' : '0',
                          backgroundColor: colors.coral.DEFAULT,
                        }}
                      />
                    </div>
                  )}
                  {d.energy != null && (
                    <div
                      className="h-8 min-w-[20px] flex items-end justify-center"
                      title={`Energy: ${d.energy}`}
                    >
                      <div
                        className="w-4 rounded-none"
                        style={{
                          height: `${(d.energy / maxVal) * 100}%`,
                          minHeight: d.energy > 0 ? '4px' : '0',
                          backgroundColor: colors.amber.DEFAULT,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
