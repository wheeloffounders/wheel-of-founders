/**
 * Unified Pro entitlement: beta flag → trial window → Stripe subscription → legacy tier / hook.
 * Client and server can import this; uses only serializable profile fields.
 */

export type ProEntitlementProfile = {
  tier?: string | null
  pro_features_enabled?: boolean | null
  subscription_tier?: string | null
  trial_starts_at?: string | null
  trial_ends_at?: string | null
  stripe_subscription_status?: string | null
  created_at?: string | null
}

export type ProEntitlementSource =
  | 'beta_env'
  | 'trial'
  | 'subscription'
  | 'tier_pro'
  | 'legacy_hook'
  | 'none'

export type ProEntitlement = {
  isPro: boolean
  source: ProEntitlementSource
  /** Whole days left in trial (ceil), or null if not on trial */
  trialDaysRemaining: number | null
  /** Short string for nav / compact UI */
  navBadgeLabel: string | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const LEGACY_HOOK_DAYS = 7

export function isBetaModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BETA_MODE === 'true'
}

function isSubscriberFromStripe(profile: ProEntitlementProfile | null | undefined): boolean {
  const s = String(profile?.stripe_subscription_status ?? '')
    .trim()
    .toLowerCase()
  return s === 'active' || s === 'trialing'
}

function hasActiveTrial(profile: ProEntitlementProfile | null | undefined, nowMs: number): boolean {
  const end = profile?.trial_ends_at
  if (!end) return false
  const t = new Date(end).getTime()
  if (Number.isNaN(t)) return false
  return t > nowMs
}

function trialDaysRemaining(profile: ProEntitlementProfile | null | undefined, nowMs: number): number | null {
  if (!hasActiveTrial(profile, nowMs)) return null
  const end = new Date(profile!.trial_ends_at!).getTime()
  return Math.max(0, Math.ceil((end - nowMs) / MS_PER_DAY))
}

function isWithinLegacyProHookWindow(createdAtIso: string | null | undefined): boolean {
  if (!createdAtIso) return false
  const t = new Date(createdAtIso).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < LEGACY_HOOK_DAYS * MS_PER_DAY
}

function tierImpliesPro(profile: ProEntitlementProfile | null | undefined): boolean {
  if (!profile) return false
  const sub = String(profile.subscription_tier ?? '')
    .trim()
    .toLowerCase()
  const tier = String(profile.tier ?? '')
    .trim()
    .toLowerCase()
  if (sub === 'pro') return true
  if (tier === 'pro' || tier === 'pro_plus') return true
  if (tier === 'beta') return true
  if (profile.pro_features_enabled !== false) return true
  return false
}

export type ResolveProEntitlementOptions = {
  /** Dev-only (localStorage): force expired trial for Day-8 UI. Must run before beta so sim works in beta builds. */
  simulateExpired?: boolean
}

/**
 * Resolves whether the user should receive Pro product behavior.
 * Order: dev trial sim (expired) → public beta → active trial → Stripe → legacy tier / signup hook.
 */
export function resolveProEntitlement(
  profile: ProEntitlementProfile | null | undefined,
  nowMs: number = Date.now(),
  options?: ResolveProEntitlementOptions
): ProEntitlement {
  if (options?.simulateExpired) {
    return {
      isPro: false,
      source: 'none',
      trialDaysRemaining: null,
      navBadgeLabel: 'Pro trial ended — upgrade to continue',
    }
  }

  if (isBetaModeEnabled()) {
    return {
      isPro: true,
      source: 'beta_env',
      trialDaysRemaining: null,
      navBadgeLabel: 'Beta: Full access unlocked',
    }
  }

  if (hasActiveTrial(profile, nowMs)) {
    const days = trialDaysRemaining(profile, nowMs) ?? 0
    return {
      isPro: true,
      source: 'trial',
      trialDaysRemaining: days,
      navBadgeLabel:
        days <= 0 ? 'Pro trial' : `${days} day${days === 1 ? '' : 's'} of Pro remaining`,
    }
  }

  if (isSubscriberFromStripe(profile)) {
    return {
      isPro: true,
      source: 'subscription',
      trialDaysRemaining: null,
      navBadgeLabel: 'Pro',
    }
  }

  if (tierImpliesPro(profile)) {
    return {
      isPro: true,
      source: 'tier_pro',
      trialDaysRemaining: null,
      navBadgeLabel: 'Pro',
    }
  }

  if (isWithinLegacyProHookWindow(profile?.created_at)) {
    return {
      isPro: true,
      source: 'legacy_hook',
      trialDaysRemaining: null,
      navBadgeLabel: 'Pro trial',
    }
  }

  return {
    isPro: false,
    source: 'none',
    trialDaysRemaining: null,
    navBadgeLabel: null,
  }
}

export function isProUser(profile: ProEntitlementProfile | null | undefined): boolean {
  return resolveProEntitlement(profile).isPro
}
