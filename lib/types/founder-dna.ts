/** How loudly we celebrate in the UI (toast vs modal vs confetti). */
export type BadgeCelebrationTier = 'minor' | 'major' | 'epic'

export type JourneyBadge = {
  name: string
  label: string
  description: string
  icon: string
  category?: 'milestone' | 'discovery' | 'identity' | 'behavior' | 'reflection'
  /** From server / badge definitions; drives modal + confetti */
  celebrationTier?: BadgeCelebrationTier
  unlocked_at: string
}

export type JourneyUnlock = {
  id: string
  name: string
  icon: string
  requirement: string
  progress: number
  target: number
  estimatedDays: number | null
}

export type NextMilestoneTeaser = {
  id: string
  name: string
  icon: string
  target: number
  current: number
  remaining: number
  badgeName?: string
}

export type JourneyMilestones = {
  currentStreak: number
  totalTasks: number
  totalDecisions: number
  totalEvenings: number
  daysActive: number
  daysWithEntries?: number
  postponedTasks: number
  nextMilestones: NextMilestoneTeaser[]
}

export type ArchetypeJourneyStatus = 'locked' | 'preview' | 'full'

/** Journey API: founder archetype gate (preview at 21d, full at 31d). */
export type JourneyArchetypeMeta = {
  status: ArchetypeJourneyStatus
  daysActive: number
  daysUntilPreview: number
  daysUntilFull: number
  /** True when `founder_archetype` is in unlocked_features (preview). */
  previewUnlocked: boolean
  /** True when `founder_archetype_full` is in unlocked_features (full). */
  fullUnlocked: boolean
}

/** Row for Founder DNA unlock timeline (journey hub) */
export type FounderDnaScheduleRow = {
  id: string
  sortOrder: number
  name: string
  icon: string
  unlockSummary: string
  updateCadence: string
  href: string | null
  unlocked: boolean
  /** ISO date for next cadence tick (UTC); null if N/A or locked */
  nextUpdateAt: string | null
  progress?: {
    current: number
    target: number
    unit: 'days_with_entries' | 'profile' | 'evenings' | 'decisions'
  }
  /** e.g. archetype preview vs full */
  detail?: string
}

export type FounderJourney = {
  badges: JourneyBadge[]
  newlyUnlockedBadges?: JourneyBadge[]
  /** Features unlocked during this journey evaluation (for modals / What's New) */
  newlyUnlockedFeatures?: JourneyBadge[]
  unlockedFeatures: JourneyBadge[]
  nextUnlocks: JourneyUnlock[]
  milestones: JourneyMilestones
  /** Present from API v2; derive from milestones.daysActive if missing. */
  archetype?: JourneyArchetypeMeta
  /** Full Founder DNA roadmap with next update hints */
  schedule?: FounderDnaScheduleRow[]
}

/** Energy & Mood Trend API + chart */
export type EnergyMoodInsightType =
  | 'energy_drop'
  | 'mood_peak'
  | 'correlation'
  | 'recovery'
  | 'weekly_rhythm'

export type EnergyMoodInsight = {
  type: EnergyMoodInsightType
  description: string
  day?: string
  pattern?: string
}

/** Optional fields returned by Founder DNA feature APIs with refresh windows */
export type FounderDnaRefreshMeta = {
  /** Human-readable next eligible refresh (e.g. "Tuesday, March 25") */
  nextUpdate?: string
  /** True when served from cache (not regenerated this request) */
  fromCache?: boolean
}

export type EnergyTrendsResponse = FounderDnaRefreshMeta & {
  dates: string[]
  mood: number[]
  energy: number[]
  insights: EnergyMoodInsight[]
}

/** First Glimpse 🔓 — after first evening; Rhythm, Tuesday refresh */
export type FirstGlimpseResponse = FounderDnaRefreshMeta & {
  insight: string
  eveningsSampled: number
  firstGlimpseVersion: 1
}

/** What's New (Founder DNA) */
export type WhatsNewItemType = 'insight' | 'feature' | 'badge'

export type WhatsNewItem = {
  type: WhatsNewItemType
  id: string
  title: string
  description: string
  icon: string
  link: string
  createdAt: string
}

export type WhatsNewResponse = {
  hasNew: boolean
  items: WhatsNewItem[]
}

export type FounderArchetypeBreakdown = {
  signals: ArchetypeSignalBreakdown[]
  totalConfidence: number
  explanation: string
}

export type ArchetypeSignalBreakdown = {
  name: string
  contribution: number
  description: string
  archetypeBoost: string
  details?: string
}

export type ArchetypeBreakdown = {
  signals: ArchetypeSignalBreakdown[]
  totalConfidence: number
  explanation: string
}

export type ArchetypeUnlockChecklist = {
  unlock: { daysActive: number; targetDays: number; daysRemaining: number }
  decisionsSignal: { total: number; strategic: number; tactical: number; ready: boolean }
  taskPlansSignal: { totalCompletedTasks: number; topPlan?: string | null; ready: boolean }
  eveningPatternsSignal: { reviewsCount: number; keywordHitsTotal: number; ready: boolean }
  founderPersonalitySignal: { provided: boolean; ready: boolean }
}

/** 21–30 days: emerging read only (no full profile / breakdown). */
export type ArchetypeApiPreviewResponse = {
  status: 'preview'
  daysActive: number
  primary: {
    name: string
    label: string
    icon: string
    description: string
    confidence: number
  }
  distribution: Array<{
    name: string
    label: string
    icon: string
    percentage: number
  }>
  message: string
  daysUntilFull: number
  topSignals: ArchetypeSignalBreakdown[]
  unlockChecklist: ArchetypeUnlockChecklist
}

export type ArchetypeEvolutionHistoryEntry = {
  fromPrimary: string
  toPrimary: string
  at: string
  periodLabel: string
  strategicPctRolling?: number
}

/** 31+ days: full archetype + personality profile. */
export type ArchetypeApiFullResponse = {
  status: 'full'
  /** ISO — last time the full archetype snapshot was computed (90-day cadence). */
  archetypeUpdatedAt?: string | null
  /** ISO — earliest automatic recompute after archetypeUpdatedAt. */
  nextArchetypeUpdateAt?: string | null
  /** True when body was served from DB snapshot this request. */
  fromCache?: boolean
  primary: {
    name: string
    label: string
    icon: string
    description: string
    confidence: number
  }
  secondary?: {
    name: string
    label: string
    icon: string
    description: string
    confidence: number
  }
  traits: {
    strategic: number
    tactical: number
    builder: number
    visionary: number
  }
  personalityProfile: FounderPersonalityProfile
  breakdown: ArchetypeBreakdown
  unlockChecklist: ArchetypeUnlockChecklist
  /** Newest first; from quarterly rolling-window reassessment. */
  evolutionHistory?: ArchetypeEvolutionHistoryEntry[]
}

export type ArchetypeApiResponse = ArchetypeApiPreviewResponse | ArchetypeApiFullResponse

/** @deprecated Use ArchetypeApiFullResponse; kept for gradual migration. */
export type ArchetypeResponse = Omit<ArchetypeApiFullResponse, 'status'> & {
  status?: 'full'
}

export type FounderPersonalityProfile = {
  tagline: string
  title: string
  description: string
  recentExampleBox: {
    date: string
    headline: string
    example: string
    interpretation: string
  }
  keyCharacteristics: string[]
  strengths: string[]
  growthEdges: string[]
  relationshipsAndWork: string
  cognitivePattern: {
    dominant: string
    auxiliary: string
    underdeveloped: string
    stressResponse: string
  }
  unlockedInsights: string[]
}

/**
 * Celebration Gap 🪞 — weekly “hidden win” mirror on one recent lesson.
 * v4+ only (older snapshots invalidate).
 */
export type CelebrationGapResponse = FounderDnaRefreshMeta & {
  /** Full lesson text Mrs. Deer reflected on (empty if none in window). */
  lesson: string
  /** YYYY-MM-DD for the evening this lesson came from. */
  lessonDate: string
  /** Mrs. Deer’s mirror — what’s already working inside the “problem.” */
  insight: string
  eveningsSampled: number
  celebrationGapInsightsVersion?: 4
}

/** Recurring Question 💫 — echoed questions in reflections */
export type RecurringQuestionItem = {
  question: string
  count: number
  observation: string
}

export type RecurringQuestionResponse = FounderDnaRefreshMeta & {
  intro: string
  questions: RecurringQuestionItem[]
  eveningsSampled: number
  decisionsSampled: number
}

/** Your Story So Far — server-built wins slice (Rhythm, Tuesday refresh) */
export type YourStoryWin = {
  text: string
  date: string
  formattedDate: string
  /** AI-generated, cached with snapshot; optional for older cached payloads */
  mrsDeerInsight?: string
}

export type YourStorySoFarResponse = FounderDnaRefreshMeta & {
  wins: YourStoryWin[]
  totalCount: number
}

