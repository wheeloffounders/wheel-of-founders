'use client'

import { format } from 'date-fns'
import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

type EveningVariant = 'late_night_choice' | 'late_night_yesterday_exists' | 'morning_catchup'
type MorningVariant = 'late_night_choice' | 'morning_catchup'

export type ReflectionPopupVariant =
  | { context: 'evening'; type: EveningVariant }
  | { context: 'morning'; type: MorningVariant }
  | { context: 'fix_date' }

export interface ReflectionPopupProps {
  isOpen: boolean
  onClose: () => void
  variant: ReflectionPopupVariant
  currentDate: Date
  onSelectYesterday?: () => void
  onSelectToday?: () => void
  onOverwriteYesterday?: () => void
  onSaveToToday?: () => void
  onGoToYesterdayEvening?: () => void
  onStartToday?: () => void
  // For fix-date flow
  onConfirmFixDate?: (targetDate: string) => void
}

export function ReflectionPopup({
  isOpen,
  onClose,
  variant,
  currentDate,
  onSelectYesterday,
  onSelectToday,
  onOverwriteYesterday,
  onSaveToToday,
  onGoToYesterdayEvening,
  onStartToday,
  onConfirmFixDate,
}: ReflectionPopupProps) {
  const todayLabel = useMemo(
    () => format(currentDate, 'EEEE, MMMM d'),
    [currentDate]
  )
  const yesterdayLabel = useMemo(
    () => format(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000), 'EEEE, MMMM d'),
    [currentDate]
  )

  // For fix-date custom date selection
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customDate, setCustomDate] = useState(() => format(currentDate, 'yyyy-MM-dd'))

  useEffect(() => {
    setCustomDate(format(currentDate, 'yyyy-MM-dd'))
    setShowCustomPicker(false)
  }, [currentDate])

  if (!isOpen) return null

  const renderContent = () => {
    if (variant.context === 'evening') {
      if (variant.type === 'late_night_choice') {
        return (
          <>
            <CardHeader>
              <CardTitle>🌙 It&apos;s after midnight — which day are you reflecting on?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Mrs. Deer noticed the clock. Let&apos;s make sure this reflection lands on the right day.
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="justify-start" onClick={onSelectYesterday}>
                  Yesterday, {yesterdayLabel}
                </Button>
                <Button variant="outline" className="justify-start" onClick={onSelectToday}>
                  Today, {todayLabel}
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </>
        )
      }
      if (variant.type === 'late_night_yesterday_exists') {
        return (
          <>
            <CardHeader>
              <CardTitle>🌙 It&apos;s after midnight, and you already have a reflection for yesterday.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                What would you like to do?
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="justify-start" onClick={onOverwriteYesterday}>
                  Overwrite yesterday — replace with this reflection
                </Button>
                <Button variant="outline" className="justify-start" onClick={onSaveToToday}>
                  Save to today — keep yesterday as-is, save this for today
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Cancel — go back
                </Button>
              </div>
            </CardContent>
          </>
        )
      }
      if (variant.type === 'morning_catchup') {
        return (
          <>
            <CardHeader>
              <CardTitle>☀️ Did you forget to reflect last night?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                You can still close yesterday&apos;s loop before you move fully into today.
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="justify-start" onClick={onSelectYesterday}>
                  Yes, complete yesterday
                </Button>
                <Button variant="outline" className="justify-start" onClick={onSelectToday}>
                  No, start today
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </>
        )
      }
    }

    if (variant.context === 'morning') {
      if (variant.type === 'late_night_choice') {
        return (
          <>
            <CardHeader>
              <CardTitle>🌅 It&apos;s after midnight — which day are you planning for?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                If yesterday still feels open, you can complete that reflection before planning today.
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="justify-start" onClick={onGoToYesterdayEvening}>
                  Yesterday, {yesterdayLabel} — complete reflection first
                </Button>
                <Button variant="outline" className="justify-start" onClick={onStartToday}>
                  Today, {todayLabel} — plan today
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </>
        )
      }
      if (variant.type === 'morning_catchup') {
        return (
          <>
            <CardHeader>
              <CardTitle>☀️ You missed yesterday&apos;s reflection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                You can close out yesterday first, or head straight into today&apos;s plan.
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="justify-start" onClick={onGoToYesterdayEvening}>
                  Complete yesterday first
                </Button>
                <Button variant="outline" className="justify-start" onClick={onStartToday}>
                  Start today
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </>
        )
      }
    }

    // Fix-date variant
    if (variant.context === 'fix_date') {
      return (
        <>
          <CardHeader>
            <CardTitle>🛠️ Which day did you mean to save to?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Mrs. Deer can move this reflection to the day it really belongs to.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  onConfirmFixDate?.(
                    format(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
                  )
                }
              >
                Yesterday, {yesterdayLabel}
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => onConfirmFixDate?.(format(currentDate, 'yyyy-MM-dd'))}
              >
                Today, {todayLabel}
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setShowCustomPicker((v) => !v)}
              >
                Pick a different day…
              </Button>
              {showCustomPicker && (
                <div className="flex flex-col gap-2 pl-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    Choose the exact date this reflection belongs to:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      value={customDate}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setCustomDate(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (customDate) {
                          onConfirmFixDate?.(customDate)
                        }
                      }}
                    >
                      Move to this day
                    </Button>
                  </div>
                </div>
              )}
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </>
      )
    }

    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <Card className="max-w-md w-full mx-4">
        {renderContent()}
      </Card>
    </div>
  )
}

