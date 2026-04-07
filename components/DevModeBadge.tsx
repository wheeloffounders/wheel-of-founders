'use client'

/**
 * DevModeBadge - Shows "DEV MODE" indicator in development only.
 * Yellow background, black text. Fixed bottom-left, above the bottom nav (Dashboard strip).
 */
import { useCallback, useEffect, useState } from 'react'
import { showDebugTools } from '@/lib/env'
import { isTrialExpirySimulationEnabled, setTrialExpirySimulation } from '@/lib/trial-simulation'

export function DevModeBadge() {
  const [simExpired, setSimExpired] = useState(false)

  useEffect(() => {
    setSimExpired(isTrialExpirySimulationEnabled())
    const onSim = () => setSimExpired(isTrialExpirySimulationEnabled())
    window.addEventListener('wof-trial-sim-changed', onSim)
    return () => window.removeEventListener('wof-trial-sim-changed', onSim)
  }, [])

  const onToggleTrial = useCallback(() => {
    if (isTrialExpirySimulationEnabled()) {
      setTrialExpirySimulation(false)
      window.location.reload()
      return
    }
    setTrialExpirySimulation(true)
    setSimExpired(true)
  }, [])

  if (!showDebugTools) return null

  return (
    <div
      data-dev-mode-badge
      className="fixed left-4 flex max-w-[min(100vw-2rem,280px)] flex-col gap-1 rounded-md border border-amber-900/20 bg-amber-300/95 p-2 text-xs font-bold text-black shadow-md opacity-80 transition-opacity hover:opacity-100"
      style={{
        backgroundColor: '#FBBF24',
        color: '#000',
        /* Float above safe area + nav strip + icons (Dashboard row) */
        bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Development mode"
    >
      <span className="px-1">DEV MODE</span>
      <button
        type="button"
        onClick={onToggleTrial}
        className="rounded border border-black/20 bg-black/10 px-2 py-1.5 text-left text-[11px] font-semibold leading-tight transition hover:bg-black/15"
      >
        {simExpired ? 'Trial: simulating EXPIRED (click to reset)' : 'Toggle trial expiry (Day 8 sim)'}
      </button>
    </div>
  )
}
