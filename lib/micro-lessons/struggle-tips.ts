export type StruggleTip = {
  key: string
  message: string
  emoji?: string
  action?: { label: string; link: string }
}

const BASE_STRUGGLE_TIPS: Record<string, StruggleTip> = {
  purpose: {
    key: 'purpose',
    message: "Your purpose isn't found - it's built. Each task is a brick.",
    emoji: '🧱',
    action: { label: 'Morning plan', link: '/morning' },
  },
  meaningful: {
    key: 'meaningful',
    message: 'Meaningful businesses start with meaningful days. What made today count?',
    emoji: '🌱',
    action: { label: 'Evening reflection', link: '/evening' },
  },
  overwhelm: {
    key: 'overwhelm',
    message: "Overwhelm shrinks when you name one priority. What's the one thing?",
    emoji: '🫧',
  },
  stuck: {
    key: 'stuck',
    message: "Stuck is a sign you're looking too far ahead. What's the next tiny step?",
    emoji: '🪜',
  },
  focus: {
    key: 'focus',
    message: "Focus isn't a superpower - it's protecting one thing from everything else.",
    emoji: '🎯',
  },
  systems: {
    key: 'systems',
    message: 'Systems are habits with a plan. What one thing could you automate?',
    emoji: '⚙️',
    action: { label: 'View rhythm', link: '/founder-dna/rhythm' },
  },
  clarity: {
    key: 'clarity',
    message: "Clarity comes from action, not thinking. What's one small move today?",
    emoji: '🔎',
  },
  motivation: {
    key: 'motivation',
    message: 'Motivation follows action. Start small, let momentum build.',
    emoji: '🔥',
  },
  calm: {
    key: 'calm',
    message: "Calm isn't the absence of chaos - it's the presence of one thing at a time.",
    emoji: '🫶',
  },
  confidence: {
    key: 'confidence',
    message: "Confidence is built one completed task at a time. What's done today?",
    emoji: '🛠️',
  },
  work_life_balance: {
    key: 'work_life_balance',
    message:
      "Balance isn't 50/50 - it's being present where you are. Today, where do you want to be fully present?",
    emoji: '⚖️',
  },
}

const WORK_LIFE_BALANCE_TIP: StruggleTip = {
  key: 'work_life_balance',
  message:
    "Balance isn't 50/50 - it's being present where you are. Today, where do you want to be fully present?",
  emoji: '⚖️',
}

export function getTipForStruggle(struggle: string): StruggleTip | null {
  return BASE_STRUGGLE_TIPS[struggle] ?? null
}

export function getCustomStruggleTip(strugglesOther?: string | null): StruggleTip | null {
  const text = (strugglesOther ?? '').trim().toLowerCase()
  if (!text) return null
  if (text.includes('balance') || (text.includes('work') && (text.includes('son') || text.includes('family')))) {
    return WORK_LIFE_BALANCE_TIP
  }
  return {
    key: 'other_custom',
    message: "Your challenge matters. Break it into one small step and let today's loop hold it.",
    emoji: '🧭',
  }
}

