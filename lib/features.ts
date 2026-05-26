import { resolveProEntitlement } from '@/lib/auth/is-pro'
import { getTrialStatus } from '@/lib/auth/trial-status'
import { isTrialExpirySimulationEnabled } from '@/lib/trial-simulation'

function resolveOptsForClient() {
  if (typeof window === 'undefined') return undefined
  return { simulateExpired: isTrialExpirySimulationEnabled() } as const
}

export interface FeatureAccess {
  // History viewing limits (data stored forever for all)
  canViewFullHistory: boolean
  viewableHistoryDays: number // Free: 7 days, others: Infinity
  
  // REMOVED: Smart Constraints (feature deprecated - all AI from Mrs. Deer)
  smartConstraints: boolean      // Always false - feature removed
  communityWeeklyInsights: boolean // Weekly community trends (Sunday 6 PM)
  
  // PRO COACH: Personal Coach (Individual real-time analysis)
  dailyMorningPrompt: boolean    // Morning Dashboard Prompt (Gentle Architect)
  dailyPostMorningPrompt: boolean // Post-Morning Plan Analysis
  dailyPostEveningPrompt: boolean // Post-Evening Reflection Insight
  personalWeeklyInsight: boolean  // Personalized weekly (Sunday 6 PM)
  personalMonthlyInsight: boolean // Personalized monthly (1st of month)
  personalQuarterlyInsight: boolean // Personalized quarterly trajectory
  
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
  is_pro_trial?: boolean | null
  subscription_override?: string | null
  is_beta_retired?: boolean | null
  is_beta?: boolean | null
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
  const ov = String(user?.subscription_override ?? 'none')
    .trim()
    .toLowerCase()
  if (ov === 'free') return true
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
  const ov = String(user?.subscription_override ?? 'none')
    .trim()
    .toLowerCase()
  if (GLOBAL_BETA_OVERRIDE && !auditPath && ov !== 'free') return false

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

/** Options for voice brain-dump UI (Pro billboard vs interactive mic). */
export type EmergencyVoiceBrainDumpLockOptions = {
  /** `/emergency/free` — always show locked free-tier preview regardless of session tier. */
  forceFreemiumAuditPath?: boolean
}

/**
 * Voice-only Emergency Brain Dump: locked unless trial UX + entitlement both say Pro.
 * Matches bottom nav (“7 days of Pro left” / “Pro trial ended”) — not only `tier === 'free'`,
 * so beta/dev rows with Day-8 sim still see the glass billboard.
 *
 * `/emergency/free` audit path forces the locked billboard regardless of session tier.
 */
export function isEmergencyVoiceBrainDumpLocked(
  user: UserProfile | null | undefined,
  options?: EmergencyVoiceBrainDumpLockOptions
): boolean {
  if (options?.forceFreemiumAuditPath) return true
  if (!user) {
    if (isTrialExpirySimulationEnabled()) return true
    return false
  }

  const sim = isTrialExpirySimulationEnabled()
  const ov = String(user.subscription_override ?? 'none').trim().toLowerCase()
  if (ov === 'pro') return false

  const trialUx = getTrialStatus(user, { simulateExpired: sim })
  if (trialUx.isPro) return false

  const entitlement = resolveProEntitlement(user, Date.now(), { simulateExpired: sim })
  if (entitlement.isPro) return false

  return true
}

/**
 * Strict emergency Pro gate — brain dump, protocol voice, AI triage, refine (same bundle + trial UX as nav).
 * Prefer this over `isEmergencyFeatureLocked` on `/emergency` (beta override bypasses the latter).
 */
export function isEmergencyProSurfaceLocked(
  user: UserProfile | null | undefined,
  options?: EmergencyVoiceBrainDumpLockOptions
): boolean {
  return isEmergencyVoiceBrainDumpLocked(user, options)
}

/**
 * Per-feature lock for emergency + related UX (morning pause while a Hot fire is active).
 * When `GLOBAL_BETA_OVERRIDE` is true, locks are off unless the path includes `/emergency/free` (audit).
 */
/** Weekly insight: AI synthesis, pattern quote intersections, quarterly memory starring. */
export type WeeklyInsightFreemiumFeature =
  | 'ai_synthesis'
  | 'pattern_quote_analysis'
  | 'quarterly_memory_selection'

export type WeeklyInsightProLockOptions = {
  /** `/weekly/free` — force freemium locks for UI audit. */
  forceFreemiumAuditPath?: boolean
}

function isWeeklyInsightFreemiumAuditPath(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.location.pathname.includes('/weekly/free')
  } catch {
    return false
  }
}

/**
 * Weekly insight Pro gate — AI narrative, pattern quote analysis, win/lesson starring.
 * Uses trial UX + entitlement (same bundle as emergency/morning strict surfaces).
 */
export function isWeeklyInsightProSurfaceLocked(
  user: UserProfile | null | undefined,
  options?: WeeklyInsightProLockOptions
): boolean {
  if (options?.forceFreemiumAuditPath || isWeeklyInsightFreemiumAuditPath()) return true
  if (!user) {
    if (isTrialExpirySimulationEnabled()) return true
    return false
  }

  const sim = isTrialExpirySimulationEnabled()
  const ov = String(user.subscription_override ?? 'none').trim().toLowerCase()
  if (ov === 'pro') return false

  const trialUx = getTrialStatus(user, { simulateExpired: sim })
  if (trialUx.isPro) return false

  const entitlement = resolveProEntitlement(user, Date.now(), { simulateExpired: sim })
  if (entitlement.isPro) return false

  return true
}

export function isWeeklyInsightFeatureLocked(
  feature: WeeklyInsightFreemiumFeature,
  user: UserProfile | null | undefined,
  options?: WeeklyInsightProLockOptions
): boolean {
  if (!isWeeklyInsightProSurfaceLocked(user, options)) return false
  return (
    feature === 'ai_synthesis' ||
    feature === 'pattern_quote_analysis' ||
    feature === 'quarterly_memory_selection'
  )
}

/** Monthly insight: AI synthesis, AI transformation pairs. */
export type MonthlyInsightFreemiumFeature = 'ai_synthesis' | 'transformation_pairs'

export type MonthlyInsightProLockOptions = {
  /** `/monthly-insight/free` — force freemium locks for UI audit. */
  forceFreemiumAuditPath?: boolean
}

function isMonthlyInsightFreemiumAuditPath(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.location.pathname.includes('/monthly-insight/free')
  } catch {
    return false
  }
}

export function isMonthlyInsightProSurfaceLocked(
  user: UserProfile | null | undefined,
  options?: MonthlyInsightProLockOptions
): boolean {
  if (options?.forceFreemiumAuditPath || isMonthlyInsightFreemiumAuditPath()) return true
  return isWeeklyInsightProSurfaceLocked(user)
}

export function isMonthlyInsightFeatureLocked(
  feature: MonthlyInsightFreemiumFeature,
  user: UserProfile | null | undefined,
  options?: MonthlyInsightProLockOptions
): boolean {
  if (!isMonthlyInsightProSurfaceLocked(user, options)) return false
  return feature === 'ai_synthesis' || feature === 'transformation_pairs'
}

/** Quarterly trajectory: AI synthesis + deep narrative sections. */
export type QuarterlyInsightFreemiumFeature = 'ai_synthesis' | 'narrative_depth'

export type QuarterlyInsightProLockOptions = {
  /** `/quarterly/free` or `/quarterly-insight/free` — force freemium locks for UI audit. */
  forceFreemiumAuditPath?: boolean
}

function isQuarterlyInsightFreemiumAuditPath(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const path = window.location.pathname
    return path.includes('/quarterly/free') || path.includes('/quarterly-insight/free')
  } catch {
    return false
  }
}

export function isQuarterlyInsightProSurfaceLocked(
  user: UserProfile | null | undefined,
  options?: QuarterlyInsightProLockOptions
): boolean {
  if (options?.forceFreemiumAuditPath || isQuarterlyInsightFreemiumAuditPath()) return true
  return isWeeklyInsightProSurfaceLocked(user)
}

export function isQuarterlyInsightFeatureLocked(
  feature: QuarterlyInsightFreemiumFeature,
  user: UserProfile | null | undefined,
  options?: QuarterlyInsightProLockOptions
): boolean {
  if (!isQuarterlyInsightProSurfaceLocked(user, options)) return false
  return feature === 'ai_synthesis' || feature === 'narrative_depth'
}

/** Founder DNA archetype profile + signal breakdown. */
export type FounderDnaProLockOptions = {
  /** `/founder-dna/archetype/free` — force freemium locks for UI audit. */
  forceFreemiumAuditPath?: boolean
}

function isFounderDnaFreemiumAuditPath(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.location.pathname.includes('/founder-dna/archetype/free')
  } catch {
    return false
  }
}

export function isFounderDnaProSurfaceLocked(
  user: UserProfile | null | undefined,
  options?: FounderDnaProLockOptions
): boolean {
  if (options?.forceFreemiumAuditPath || isFounderDnaFreemiumAuditPath()) return true
  return isWeeklyInsightProSurfaceLocked(user)
}

/** Alias for archetype narrative / analytics freemium gate. */
export function isFounderDNALocked(
  user: UserProfile | null | undefined,
  options?: FounderDnaProLockOptions
): boolean {
  return isFounderDnaProSurfaceLocked(user, options)
}

/** Rhythm page: Mrs. Deer AI depth on journey-unlocked modules. */
export type RhythmInsightFreemiumFeature =
  | 'archetype_alignment'
  | 'story_insights'
  | 'celebration_gap_mirror'
  | 'unseen_wins_ai'

export type RhythmInsightProLockOptions = {
  /** `/founder-dna/rhythm/free` — force freemium locks for UI audit. */
  forceFreemiumAuditPath?: boolean
}

function isRhythmInsightFreemiumAuditPath(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.location.pathname.includes('/founder-dna/rhythm/free')
  } catch {
    return false
  }
}

export function isRhythmInsightProSurfaceLocked(
  user: UserProfile | null | undefined,
  options?: RhythmInsightProLockOptions
): boolean {
  if (options?.forceFreemiumAuditPath || isRhythmInsightFreemiumAuditPath()) return true
  return isWeeklyInsightProSurfaceLocked(user)
}

export function isRhythmInsightFeatureLocked(
  feature: RhythmInsightFreemiumFeature,
  user: UserProfile | null | undefined,
  options?: RhythmInsightProLockOptions
): boolean {
  if (!isRhythmInsightProSurfaceLocked(user, options)) return false
  return (
    feature === 'archetype_alignment' ||
    feature === 'story_insights' ||
    feature === 'celebration_gap_mirror' ||
    feature === 'unseen_wins_ai'
  )
}

/** Patterns page: Mrs. Deer AI depth on journey-unlocked modules. */
export type PatternsInsightFreemiumFeature =
  | 'macro_summary'
  | 'energy_insights'
  | 'decision_insight'
  | 'postponement_insight'
  | 'recurring_question_ai'

export type PatternsInsightProLockOptions = {
  /** `/founder-dna/patterns/free` — force freemium locks for UI audit. */
  forceFreemiumAuditPath?: boolean
}

function isPatternsInsightFreemiumAuditPath(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.location.pathname.includes('/founder-dna/patterns/free')
  } catch {
    return false
  }
}

export function isPatternsInsightProSurfaceLocked(
  user: UserProfile | null | undefined,
  options?: PatternsInsightProLockOptions
): boolean {
  if (options?.forceFreemiumAuditPath || isPatternsInsightFreemiumAuditPath()) return true
  return isWeeklyInsightProSurfaceLocked(user)
}

export function isPatternsInsightFeatureLocked(
  feature: PatternsInsightFreemiumFeature,
  user: UserProfile | null | undefined,
  options?: PatternsInsightProLockOptions
): boolean {
  if (!isPatternsInsightProSurfaceLocked(user, options)) return false
  return (
    feature === 'macro_summary' ||
    feature === 'energy_insights' ||
    feature === 'decision_insight' ||
    feature === 'postponement_insight' ||
    feature === 'recurring_question_ai'
  )
}

export function isEmergencyFeatureLocked(
  feature: EmergencyFreemiumFeature,
  user: UserProfile | null | undefined
): boolean {
  const auditPath = isEmergencyFreemiumAuditPath()
  const ov = String(user?.subscription_override ?? 'none')
    .trim()
    .toLowerCase()
  if (GLOBAL_BETA_OVERRIDE && !auditPath && ov !== 'free') return false

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
  const ov = String(user?.subscription_override ?? 'none')
    .trim()
    .toLowerCase()
  const isProEntitled = ent.isPro || (GLOBAL_BETA_OVERRIDE && ov !== 'free')
  const isFreeStrict =
    !isProEntitled &&
    (ov === 'free' || (user?.tier === 'free' && user?.pro_features_enabled === false))

  return {
    // History viewing limits
    canViewFullHistory: isProEntitled,
    viewableHistoryDays: isFreeStrict ? 7 : Infinity, // Free: last 7 days of daily archive

    // REMOVED: Smart Constraints - feature deprecated
    smartConstraints: false,
    communityWeeklyInsights: isProEntitled, // Weekly community trends

    // PRO COACH: Personal Coach (now part of Pro)
    dailyMorningPrompt: isProEntitled, // Gentle Architect morning prompt
    dailyPostMorningPrompt: isProEntitled, // Post-morning plan analysis
    dailyPostEveningPrompt: isProEntitled, // Post-evening reflection
    personalWeeklyInsight: isProEntitled, // Personalized weekly
    personalMonthlyInsight: isProEntitled, // Personalized monthly
    personalQuarterlyInsight: isProEntitled, // Personalized quarterly

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
