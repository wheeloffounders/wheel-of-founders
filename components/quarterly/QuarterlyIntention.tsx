'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AutoExpandTextarea } from '@/components/AutoExpandTextarea'

export type QuarterlyIntentionProps = {
  /** Value from `user_profiles.quarterly_intention` */
  initialValue?: string
  /** Persist to server (blur + save button) */
  onSave: (value: string) => Promise<void>
  placeholder?: string
  /** When false, show locked copy (e.g. &lt; 45 days — parent should gate page, but safe fallback) */
  unlocked?: boolean
}

export function QuarterlyIntention({
  initialValue = '',
  onSave,
  placeholder = 'I commit to...',
  unlocked = true,
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
      <Card className="border-dashed border-gray-300 dark:border-gray-600">
        <CardHeader>
          <CardTitle className="text-[#152b50] dark:text-white">Quarterly Intention</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Unlocks after 45 days with entries on your founder journey—same as this Trajectory view.
          </p>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#152b50] dark:text-white">Set Your Quarterly Intention</CardTitle>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          One focus to carry you through the quarter. Saved to your profile—Mrs. Deer will use it once you reach day 45.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <AutoExpandTextarea
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          minRows={4}
          className="w-full min-h-[100px] p-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 border-gray-200 dark:border-gray-600 dark:bg-gray-900/40"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
      </CardContent>
    </Card>
  )
}
