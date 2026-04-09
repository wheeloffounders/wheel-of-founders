'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseContainmentSteps } from '@/lib/emergency-containment-prompt'

function storageKeyFor(emergencyId: string, sourceKey: string): string {
  let h = 0
  for (let i = 0; i < sourceKey.length; i++) h = (Math.imul(31, h) + sourceKey.charCodeAt(i)) | 0
  return `wof:emg-check:${emergencyId}:${h}`
}

/**
 * Checklist rows for a committed containment plan — persisted in localStorage so Dashboard + /emergency stay aligned.
 */
export function usePersistedEmergencyChecklist(emergencyId: string | null, containmentPlanText: string) {
  const steps = useMemo(() => parseContainmentSteps(containmentPlanText.trim()), [containmentPlanText])
  const sourceKey = useMemo(() => steps.join('\u0001'), [steps])
  const key = useMemo(() => {
    if (!emergencyId || !sourceKey) return null
    return storageKeyFor(emergencyId, sourceKey)
  }, [emergencyId, sourceKey])

  const [completedByIndex, setCompletedByIndex] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!key) {
      setCompletedByIndex({})
      return
    }
    try {
      const raw = localStorage.getItem(key)
      setCompletedByIndex(raw ? (JSON.parse(raw) as Record<number, boolean>) : {})
    } catch {
      setCompletedByIndex({})
    }
  }, [key])

  const toggleRow = useCallback(
    (index: number) => {
      if (!key) return
      setCompletedByIndex((prev) => {
        const next = { ...prev, [index]: !prev[index] }
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // private mode / quota
        }
        return next
      })
    },
    [key]
  )

  return { steps, completedByIndex, toggleRow, sourceKey }
}
