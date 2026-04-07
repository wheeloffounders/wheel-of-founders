import { resolveProEntitlement } from '@/lib/auth/is-pro'
import { isTrialExpirySimulationEnabled } from '@/lib/trial-simulation'

function resolveOptsForClient() {
  if (typeof window === 'undefined') return undefined
  return { simulateExpired: isTrialExpirySimulationEnabled() } as const
}

export interface FeatureAccess {
  // History viewing limits (data stored forever for all)
  canViewFullHistory: boolean
  viewableHistoryDays: number // Free: 2 days, others: Infinity
  
  // REMOVED: Smart Constraints (feature deprecated - all AI from Mrs. Deer)
  smartConstraints: boolean      // Always false - feature removed
  communityWeeklyInsights: boolean // Weekly community trends (Sunday 6 PM)
  
  // PRO COACH: Personal Coach (Individual real-time analysis)
  dailyMorningPrompt: boolean    // Morning Dashboard Prompt (Gentle Architect)
  dailyPostMorningPrompt: boolean // Post-Morning Plan Analysis
  dailyPostEveningPrompt: boolean // Post-Evening Reflection Insight
  personalWeeklyInsight: boolean  // Personalized weekly (Sunday 6 PM)
  personalMonthlyInsight: boolean // Personalized monthly (1st of month)
  
  // LIVE AI CHAT IS DISABLED FOR ALL TIERS
  liveAICoach: boolean           // Always false - no live chat
  
  // Other features
  emailDigest: boolean           // Weekly email summaries
  exportFeatures: boolean        // Export/Share functionality
  videoTemplates: boolean        // Video template library (Pro+)
  yearlyReport: boolean          // Yearly insight report
  fiveYearTrends: boolean        // 5-year trends (Pro+)
  // Batch AI insights from analysis engine
  aiInsights: boolean
  /** Pro: refine rough emergency containment notes into a structured plan (Mrs. Deer). */
  emergencyRefineContainment: boolean
}

export interface UserProfile {
  tier?: string
  pro_features_enabled?: boolean
  trial_starts_at?: string | null
  trial_ends_at?: string | null
  stripe_subscription_status?: string | null
  subscription_tier?: string | null
  created_at?: string | null
}

/**
 * While `true`, freemium locks on the morning flow are disabled — everyone gets the Pro UX.
 * Set to `false` when launching paid tiers to enforce `isMorningFeatureLocked` for free accounts.
 * Exception: open `/morning/free` (rewrites to `/morning`) or `/emergency/free` (rewrites to `/emergency`) to force
 * locked freemium UI for audits while this stays `true`.
 */
export const GLOBAL_BETA_OVERRIDE = true

/** Morning-page freemium gates (all bypassed when `GLOBAL_BETA_OVERRIDE` is true). */
export type MorningFreemiumFeature =
  | 'voice_to_text'
  | 'refine_strategic_context'
  | 'decision_ai_suggestions'
  | 'tone_calibration_adjust'
  | 'pro_blueprints'

/** Tier check only (ignores `GLOBAL_BETA_OVERRIDE`). Used internally and for audit path logic. */
function isFreemiumMorningUserCore(user: UserProfile | null | undefined): boolean {
  if (!user) return false
  return user.tier === 'free' && user.pro_features_enabled === false
}

/**
 * Client-only: URL contains `/morning/free` (e.g. dev audit route). When true with `GLOBAL_BETA_OVERRIDE`,
 * `isMorningFeatureLocked` still applies locks as for a free account. Server/SSR has no `window` — first paint
 * may unlock until hydration (acceptable for this dev-only path).
 */
function isMorningFreemiumAuditPath(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.location.pathname.includes('/morning/free')
  } catch {
    return false
  }
}

/** True when we would apply freemium restrictions (explicit free tier + Pro flags off). */
export function isFreemiumMorningUser(user: UserProfile | null | undefined): boolean {
  if (resolveProEntitlement(user).isPro) return false
  if (GLOBAL_BETA_OVERRIDE) return false
  return isFreemiumMorningUserCore(user)
}

const FREEMIUM_MORNING_AUDIT_USER: UserProfile = {
  tier: 'free',
  pro_features_enabled: false,
}

/**
 * Per-feature lock for the morning experience. When `GLOBAL_BETA_OVERRIDE` is true, locks are off unless the
 * browser path includes `/morning/free` (forced free-tier locks for UI audit).
 */
export function isMorningFeatureLocked(
  feature: MorningFreemiumFeature,
  user: UserProfile | null | undefined
): boolean {
  const auditPath = isMorningFreemiumAuditPath()
  if (GLOBAL_BETA_OVERRIDE && !auditPath) return false

  const effectiveUser = auditPath ? FREEMIUM_MORNING_AUDIT_USER : user
  if (!isFreemiumMorningUserCore(effectiveUser)) return false
  return (
    feature === 'voice_to_text' ||
    feature === 'refine_strategic_context' ||
    feature === 'decision_ai_suggestions' ||
    feature === 'tone_calibration_adjust' ||
    feature === 'pro_blueprints'
  )
}

/** Emergency flow: AI triage, morning “pause” grayscale, voice, containment refine (mirrors morning freemium rules). */
export type EmergencyFreemiumFeature =
  | 'ai_triage'
  | 'morning_pause_grayscale'
  | 'voice_to_text'
  | 'refine_containment'
  | 'tone_calibration_adjust'

function isEmergencyFreemiumAuditPath(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.location.pathname.includes('/emergency/free')
  } catch {
    return false
  }
}

const FREEMIUM_EMERGENCY_AUDIT_USER: UserProfile = {
  tier: 'free',
  pro_features_enabled: false,
}

/**
 * Per-feature lock for emergency + related UX (morning pause while a Hot fire is active).
 * When `GLOBAL_BETA_OVERRIDE` is true, locks are off unless the path includes `/emergency/free` (audit).
 */
export function isEmergencyFeatureLocked(
  feature: EmergencyFreemiumFeature,
  user: UserProfile | null | undefined
): boolean {
  const auditPath = isEmergencyFreemiumAuditPath()
  if (GLOBAL_BETA_OVERRIDE && !auditPath) return false

  const effectiveUser = auditPath ? FREEMIUM_EMERGENCY_AUDIT_USER : user
  if (!isFreemiumMorningUserCore(effectiveUser)) return false

  return (
    feature === 'ai_triage' ||
    feature === 'morning_pause_grayscale' ||
    feature === 'voice_to_text' ||
    feature === 'refine_containment' ||
    feature === 'tone_calibration_adjust'
  )
}

export const getFeatureAccess = (user: UserProfile | null | undefined): FeatureAccess => {
  const ent = resolveProEntitlement(user, Date.now(), resolveOptsForClient())
  const isProEntitled = ent.isPro || GLOBAL_BETA_OVERRIDE
  const isFreeStrict = user?.tier === 'free' && user?.pro_features_enabled === false && !isProEntitled

  return {
    // History viewing limits
    canViewFullHistory: isProEntitled,
    viewableHistoryDays: isFreeStrict ? 2 : Infinity, // Free: last 2 days only

    // REMOVED: Smart Constraints - feature deprecated
    smartConstraints: false,
    communityWeeklyInsights: isProEntitled, // Weekly community trends

    // PRO COACH: Personal Coach (now part of Pro)
    dailyMorningPrompt: isProEntitled, // Gentle Architect morning prompt
    dailyPostMorningPrompt: isProEntitled, // Post-morning plan analysis
    dailyPostEveningPrompt: isProEntitled, // Post-evening reflection
    personalWeeklyInsight: isProEntitled, // Personalized weekly
    personalMonthlyInsight: isProEntitled, // Personalized monthly

    // LIVE AI CHAT DISABLED
    liveAICoach: false, // No live chat for any tier

    // Other features
    emailDigest: isProEntitled,
    exportFeatures: isProEntitled,
    videoTemplates: isProEntitled,
    yearlyReport: isProEntitled,
    fiveYearTrends: isProEntitled,
    aiInsights: isProEntitled,
    emergencyRefineContainment: isProEntitled,
  }
}

// Helper to check specific features
export const canAccess = (user: UserProfile | null | undefined, feature: keyof FeatureAccess): boolean => {
  const access = getFeatureAccess(user)[feature]
  // viewableHistoryDays is a number, not boolean - convert to boolean
  if (feature === 'viewableHistoryDays') {
    return typeof access === 'number' ? access > 0 : Boolean(access)
  }
  return Boolean(access)
}

// Helper to get user's tier display name
export const getTierDisplayName = (tier?: string): string => {
  switch (tier) {
    case 'beta':
      return 'Beta'
    case 'free':
      return 'Free'
    case 'pro':
      return 'Pro'
    case 'pro_plus':
      return 'Pro+'
    default:
      return 'Beta'
  }
}
