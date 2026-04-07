/** Full quotes — dashboard footer, onboarding rotation, etc. */
export const SOCIAL_PROOF_MESSAGES = [
  {
    text: 'I used to wake up and react. Now I wake up with intention. Mrs. Deer helped me see my own growth.',
    author: 'Early beta founder',
  },
  {
    text: 'Founders who complete 7 days are 3x more likely to build a lasting rhythm.',
    author: 'Mrs. Deer',
  },
  {
    text: 'Join 500+ founders building rhythm, not chaos.',
    author: 'Wheel of Founders',
  },
  {
    text: 'The weekly insights feel like a conversation with someone who actually remembers what I said last week.',
    author: 'Jamie, solopreneur',
  },
  {
    text: 'I never celebrated wins until Mrs. Deer asked me to. Now I notice them everywhere.',
    author: 'Chris, builder',
  },
] as const

/** Onboarding social proof: keyed by `user_profiles.primary_goal` + text fallback buckets. */
export const ONBOARDING_SOCIAL_PROOF_BY_BUCKET = {
  clarity: [
    {
      text: 'I stopped drowning in noise. A few minutes each morning gave me clarity I hadn’t felt in months.',
      author: 'Early beta founder',
    },
    {
      text: 'Naming what actually matters each day made the overwhelm shrink — not the tasks, but my headspace.',
      author: 'Solo founder, SaaS',
    },
  ],
  growth: [
    {
      text: 'I thought I was busy. Mrs. Deer helped me see what was actually moving the business forward.',
      author: 'Early beta founder',
    },
    {
      text: 'The rhythm turned strategy from a slide deck into something I lived every week.',
      author: 'Builder, marketplace',
    },
  ],
  purpose: [
    {
      text: 'I came for productivity and stayed because the questions helped me hear my own voice again.',
      author: 'Early beta founder',
    },
    {
      text: 'Reflection didn’t feel fluffy — it became where I remembered why I started.',
      author: 'Founder, health tech',
    },
  ],
} as const

export type OnboardingSocialBucket = keyof typeof ONBOARDING_SOCIAL_PROOF_BY_BUCKET

/** Map DB `primary_goal` + free-text goal to onboarding quote bucket. */
/** When onboarding only collects free-text goal, infer enum for `user_profiles.primary_goal`. */
export function inferPrimaryGoalEnumFromFreeText(text: string): string | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  if (/overwhelm|calm|peace|clarity|quiet|anxious|stress|sanity|sane/.test(t)) return 'reduce_overwhelm'
  if (/purpose|meaning|why i|who i want/.test(t)) return 'find_purpose'
  if (/launch|business|revenue|grow|product|customers|sales|mvp|saas/.test(t)) return 'build_significance'
  return null
}

export function getOnboardingSocialProofBucket(
  primaryGoal: string | null | undefined,
  primaryGoalText: string | null | undefined
): OnboardingSocialBucket | 'default' {
  const g = primaryGoal?.trim() ?? ''
  if (
    g === 'reduce_overwhelm' ||
    g === 'find_calm' ||
    g === 'improve_focus' ||
    g === 'general_clarity'
  ) {
    return 'clarity'
  }
  if (g === 'find_purpose' || g === 'stay_motivated') return 'purpose'
  if (g === 'build_significance' || g === 'build_systems' || g === 'break_through_stuck') {
    return 'growth'
  }

  const t = (primaryGoalText ?? '').toLowerCase()
  if (/overwhelm|calm|peace|clarity|quiet|anxious|stress/.test(t)) return 'clarity'
  if (/purpose|meaning|why i|who i want/.test(t)) return 'purpose'
  if (/launch|business|revenue|grow|plush|product|customers|sales/.test(t)) return 'growth'
  return 'default'
}

export function getOnboardingSocialProofMessages(
  primaryGoal: string | null | undefined,
  primaryGoalText: string | null | undefined
): readonly { text: string; author: string }[] {
  const bucket = getOnboardingSocialProofBucket(primaryGoal, primaryGoalText)
  if (bucket === 'default') return SOCIAL_PROOF_MESSAGES
  return ONBOARDING_SOCIAL_PROOF_BY_BUCKET[bucket]
}

const N = SOCIAL_PROOF_MESSAGES.length

/** Same index as legacy dashboard logic: login #1 → message 0, etc. */
export function getSocialProofIndexForLoginCount(loginCount: number): number {
  const safe = Number.isFinite(loginCount) ? Math.max(0, Math.floor(loginCount)) : 0
  if (safe <= 0) return 0
  return (safe - 1) % N
}

export function getSocialProofForLoginCount(loginCount: number): (typeof SOCIAL_PROOF_MESSAGES)[number] {
  return SOCIAL_PROOF_MESSAGES[getSocialProofIndexForLoginCount(loginCount)]
}

/** Short lines for transactional email footers */
export const SOCIAL_PROOF_EMAIL_LINES = [
  { text: 'I used to wake up and react. Now I wake up with intention.', author: 'Early beta founder' },
  { text: '7-day founders build lasting rhythm.', author: 'Mrs. Deer' },
  { text: 'Join 50+ founders building rhythm, not chaos.', author: 'Wheel of Founders' },
  { text: 'Mrs. Deer remembers what I said last week.', author: 'Jamie' },
  { text: 'I celebrate wins now. Mrs. Deer taught me to.', author: 'Chris' },
] as const

export function getSocialProofEmailLine(loginCount: number | null | undefined): (typeof SOCIAL_PROOF_EMAIL_LINES)[number] {
  const safe = Number.isFinite(Number(loginCount)) ? Math.max(0, Math.floor(Number(loginCount))) : 0
  const idx = safe > 0 ? (safe - 1) % SOCIAL_PROOF_EMAIL_LINES.length : 0
  return SOCIAL_PROOF_EMAIL_LINES[idx]
}
