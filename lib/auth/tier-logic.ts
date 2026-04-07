/** Product tier used for morning plan routing (Free manual vs Pro Smart Stream). */

import { resolveProEntitlement, type ProEntitlementProfile, type ResolveProEntitlementOptions } from '@/lib/auth/is-pro'

export type EffectiveMorningTier = 'free' | 'pro'

export type TierProfileInput = ProEntitlementProfile

const MS_PER_DAY = 24 * 60 * 60 * 1000
const PRO_HOOK_DAYS = 7

export function isWithinProHookWindow(createdAtIso: string | null | undefined): boolean {
  if (!createdAtIso) return false
  const t = new Date(createdAtIso).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < PRO_HOOK_DAYS * MS_PER_DAY
}

/**
 * Returns `pro` when unified entitlement grants Pro (beta, trial, subscription, tier, or legacy hook).
 * Pass `simulateExpired` on the client to match dev trial simulation.
 */
export function getEffectiveUserTier(
  profile: TierProfileInput | null | undefined,
  options?: ResolveProEntitlementOptions
): EffectiveMorningTier {
  return resolveProEntitlement(profile, Date.now(), options).isPro ? 'pro' : 'free'
}

/**
 * Production: always `effectiveTier`. Development: `view=free` | `view=pro` overrides for sandboxing.
 */
export function resolveMorningPlanView(
  effectiveTier: EffectiveMorningTier,
  viewParam: string | null | undefined,
  isDev: boolean
): EffectiveMorningTier {
  if (isDev) {
    const v = String(viewParam ?? '')
      .trim()
      .toLowerCase()
    if (v === 'free' || v === 'pro') return v
  }
  return effectiveTier
}
