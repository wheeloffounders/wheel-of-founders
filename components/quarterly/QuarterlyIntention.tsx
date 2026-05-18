'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AutoExpandTextarea } from '@/components/AutoExpandTextarea'
import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

export type QuarterlyIntentionProps = {
  initialValue?: string
  onSave: (value: string) => Promise<void>
  placeholder?: string
  unlocked?: boolean
  accent?: InsightPeriodAccent
}

export function QuarterlyIntention({
  initialValue = '',
  onSave,
  placeholder = 'I commit to...',
  unlocked = true,
  accent = 'transformation',
}: QuarterlyIntentionProps) {
  const [intention, setIntention] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const lastSaved = useRef(initialValue)

  useEffect(() => {
    setIntention(initialValue)
    lastSaved.current = initialValue
  }, [initialValue])

  const persist = useCallback(async () => {
    const next = intention.trim()
    if (next === lastSaved.current.trim()) return
    setSaving(true)
    try {
      await onSave(next)
      lastSaved.current = next
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [intention, onSave])

  const handleBlur = () => {
    if (!unlocked) return
    void persist()
  }

  const handleSaveClick = () => {
    if (!unlocked || !intention.trim()) return
    void persist()
  }

  if (!unlocked) {
    return (
      <InsightPeriodSection title="Quarterly Intention" accent={accent}>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Unlocks after 45 days with entries on your founder journey—same as this Trajectory view.
        </p>
      </InsightPeriodSection>
    )
  }

  return (
    <InsightPeriodSection title="Set Your Quarterly Intention" accent={accent}>
      <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
        One focus to carry you through the quarter. Saved to your profile—Mrs. Deer will use it once you reach day 45.
      </p>
      <AutoExpandTextarea
        value={intention}
        onChange={(e) => setIntention(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        minRows={4}
        className="w-full min-h-[100px] rounded-lg border-2 border-gray-200 p-4 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:border-gray-600 dark:bg-gray-900/40"
      />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="primary"
          type="button"
          onClick={handleSaveClick}
          disabled={!intention.trim() || saving}
          className="w-full sm:w-auto"
        >
          {saving ? 'Saving…' : savedFlash ? 'Saved' : 'Save my commitment'}
        </Button>
        {savedFlash ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Synced to your profile.</span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">Saves when you leave the field or tap Save.</span>
        )}
      </div>
    </InsightPeriodSection>
  )
}
