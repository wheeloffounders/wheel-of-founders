/**
 * Dev-only: simulate an expired Pro trial without touching the database.
 * Client-only; read in browser after mount.
 */

import { showDebugTools } from '@/lib/env'

export const TRIAL_SIM_EXPIRED_KEY = 'wof_trial_sim_expired'

export function isTrialExpirySimulationEnabled(): boolean {
  if (!showDebugTools || typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(TRIAL_SIM_EXPIRED_KEY) === '1'
  } catch {
    return false
  }
}

export function setTrialExpirySimulation(enabled: boolean): void {
  if (!showDebugTools || typeof window === 'undefined') return
  try {
    if (enabled) {
      window.localStorage.setItem(TRIAL_SIM_EXPIRED_KEY, '1')
    } else {
      window.localStorage.removeItem(TRIAL_SIM_EXPIRED_KEY)
    }
    window.dispatchEvent(new CustomEvent('wof-trial-sim-changed'))
  } catch {
    // ignore
  }
}

export function toggleTrialExpirySimulation(): boolean {
  const next = !isTrialExpirySimulationEnabled()
  setTrialExpirySimulation(next)
  return next
}
