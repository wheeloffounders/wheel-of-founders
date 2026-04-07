/**
 * High-level trial / Pro state for UX (countdown, expiration, simulation).
 * Complements `resolveProEntitlement` with explicit `status` and floor `daysLeft`.
 */

import { isBetaModeEnabled, resolveProEntitlement, type ProEntitlementProfile } from '@/lib/auth/is-pro'
import { showDebugTools } from '@/lib/env'

function trialDebugLog(status: string, beta: boolean, sim: boolean) {
  if (typeof window !== 'undefined' && showDebugTools) {
    console.log(`[TrialDebug] Status: ${status}, Beta: ${beta}, Sim: ${sim}`)
  }
}

const MS_PER_HOUR = 60 * 60 * 1000

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type TrialUxStatus = 'beta' | 'trialing' | 'expired' | 'subscriber'

export type TrialStatusResult = {
  status: TrialUxStatus
  /** Whole days remaining in trial window (floor). Meaningful when `status === 'trialing'`. */
  daysLeft: number
  isPro: boolean
  /** Compact line for nav / badges */
  badgeLabel: string | null
}

function activeTrial(profile: ProEntitlementProfile | null | undefined, nowMs: number): boolean {
  const end = profile?.trial_ends_at
  if (!end) return false
  const t = new Date(end).getTime()
  if (Number.isNaN(t)) return false
  return t > nowMs
}

/**
 * Returns unified trial UX state. Pass `simulateExpired: true` (from dev localStorage) to preview Day-8 downgrade.
 * Hierarchy: sim expired → beta env → active trial → resolveProEntitlement → (no trial dates → trialing grace) → expired.
 */
export function getTrialStatus(
  profile: ProEntitlementProfile | null | undefined,
  options?: { nowMs?: number; simulateExpired?: boolean }
): TrialStatusResult {
  const nowMs = options?.nowMs ?? Date.now()
  const sim = options?.simulateExpired === true
  const beta = isBetaModeEnabled()

  if (sim) {
    const out: TrialStatusResult = {
      status: 'expired',
      daysLeft: 0,
      isPro: false,
      badgeLabel: 'Pro trial ended — upgrade to continue',
    }
    trialDebugLog(out.status, beta, sim)
    return out
  }

  if (beta) {
    const out: TrialStatusResult = {
      status: 'beta',
      daysLeft: 0,
      isPro: true,
      badgeLabel: 'Beta: Full access unlocked',
    }
    trialDebugLog(out.status, true, sim)
    return out
  }

  if (activeTrial(profile, nowMs)) {
    const end = new Date(profile!.trial_ends_at!).getTime()
    const daysLeft = Math.max(0, Math.floor((end - nowMs) / MS_PER_DAY))
    const label =
      daysLeft <= 0
        ? 'Last day of Pro trial'
        : `${daysLeft} day${daysLeft === 1 ? '' : 's'} of Pro left`
    const out: TrialStatusResult = {
      status: 'trialing',
      daysLeft,
      isPro: true,
      badgeLabel: label,
    }
    trialDebugLog(out.status, beta, sim)
    return out
  }

  const ent = resolveProEntitlement(profile, nowMs)
  if (ent.isPro) {
    const out: TrialStatusResult = {
      status: 'subscriber',
      daysLeft: 0,
      isPro: true,
      badgeLabel: ent.navBadgeLabel,
    }
    trialDebugLog(out.status, beta, sim)
    return out
  }

  // No trial window on profile row — treat as trial not started yet (not Day-8 expired).
  if (!profile?.trial_ends_at && !profile?.trial_starts_at) {
    const grace: TrialStatusResult = {
      status: 'trialing',
      daysLeft: 7,
      isPro: true,
      badgeLabel: '7 days of Pro left',
    }
    trialDebugLog(`${grace.status} (no trial dates)`, beta, sim)
    return grace
  }

  const out: TrialStatusResult = {
    status: 'expired',
    daysLeft: 0,
    isPro: false,
    badgeLabel: 'Pro trial ended — upgrade to continue',
  }
  trialDebugLog(out.status, beta, sim)
  return out
}

const FIRST_DAY_EXPIRED_HOURS = 24

/**
 * True when the Pro trial just ended (within the last 24 hours) — use for one-time wrap-up UX.
 * Requires `trial_ends_at`. Ignores subscribers / beta. With `simulateExpired`, always true (dev preview).
 */
export function isFirstDayExpired(
  profile: ProEntitlementProfile | null | undefined,
  options?: { nowMs?: number; simulateExpired?: boolean }
): boolean {
  if (options?.simulateExpired) return true
  if (isBetaModeEnabled()) return false

  const nowMs = options?.nowMs ?? Date.now()
  if (resolveProEntitlement(profile, nowMs, { simulateExpired: options?.simulateExpired }).isPro) return false

  const endRaw = profile?.trial_ends_at
  if (!endRaw) return false
  const endMs = new Date(endRaw).getTime()
  if (Number.isNaN(endMs)) return false
  if (endMs >= nowMs) return false

  const hoursSinceEnd = (nowMs - endMs) / MS_PER_HOUR
  return hoursSinceEnd >= 0 && hoursSinceEnd <= FIRST_DAY_EXPIRED_HOURS
}
