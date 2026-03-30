/**
 * Warm, identity-focused copy for badge unlocks (Mrs. Deer voice).
 * Used by modals (major/epic) and warm one-line toasts (minors).
 */

export type BadgeCelebrationCopy = {
  /** Paragraphs shown in italic in the celebration modal */
  paragraphs: string[]
  ctaLabel: string
  ctaHref: string
  /** When true, show primary_goal quote block (founder_story) */
  includeFounderGoalQuote?: boolean
}

/** Short line for minor-badge toasts — replaces generic description */
export type BadgeToastLine = string

const JOURNEY = '/founder-dna/journey'
const ARCHETYPE = '/founder-dna/archetype'
const PATTERNS = '/founder-dna/patterns'
const RHYTHM = '/founder-dna/rhythm'
const MORNING = '/morning'

const COPY: Record<string, BadgeCelebrationCopy> = {
  first_spark: {
    paragraphs: [
      'Your first morning task — logged. That small commit is where momentum starts.',
      "I'm watching. Each choice to show up builds the thread I'll reflect back to you.",
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },
  one_week_strong: {
    paragraphs: [
      "Seven days. You're becoming someone who shows up even when the path isn't clear.",
      "That's not luck — that's the beginning of rhythm.",
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },
  two_weeks_strong: {
    paragraphs: [
      'Two weeks in a row. Consistency is starting to feel less like effort and more like you.',
      "Keep going — I'm learning the shape of how you lead yourself.",
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },
  three_weeks_strong: {
    paragraphs: [
      'Twenty-one days. Habits are forming beneath the surface — the kind that outlast motivation.',
      "This is the stretch where your story gets harder to ignore.",
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },
  one_month_strong: {
    paragraphs: [
      'A full month of showing up. That is rare — and it says something about who you are when no one is applauding.',
      "I'm here for the long arc you're building.",
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },
  two_months_strong: {
    paragraphs: [
      "Sixty days. You're not experimenting anymore — you're practicing.",
      'Rhythm like this changes what you believe you can carry.',
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },
  quarter_of_greatness: {
    paragraphs: [
      'Ninety days. A quarter of showing up for your own vision — that is not a streak, it is a statement.',
      "Whatever you're building, you've proven you can stay with it.",
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },
  century_club: {
    paragraphs: [
      'One hundred tasks completed. That is a lot of mornings you chose forward motion.',
      "Execution isn't glamorous — but it's how founders turn intent into proof.",
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },
  execution_machine: {
    paragraphs: [
      "Five hundred tasks. You've moved from trying to doing — again and again.",
      "The volume tells me something: you don't wait for perfect conditions.",
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },
  decision_maker: {
    paragraphs: [
      "Fifty decisions logged. You're not just moving — you're naming how you choose.",
      "That honesty is what lets me reflect you accurately.",
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },
  evening_reflector: {
    paragraphs: [
      "Thirty evening reflections. You've given me enough texture to see patterns, not just moments.",
      'This is how self-awareness compounds.',
    ],
    ctaLabel: 'See your journey →',
    ctaHref: JOURNEY,
  },

  founder_story: {
    paragraphs: [
      'You shared your story. That takes courage.',
      "Now I know how to guide you — what matters to you, what you're building toward, and the kind of founder you're becoming.",
    ],
    ctaLabel: 'Continue →',
    ctaHref: JOURNEY,
    includeFounderGoalQuote: true,
  },
  guided_founder: {
    paragraphs: [
      'You walked the tour — not every founder does. You wanted to understand the loop before trusting it.',
      "That curiosity is how you get more from every morning and evening.",
    ],
    ctaLabel: 'Open morning →',
    ctaHref: MORNING,
  },
  pattern_hunter: {
    paragraphs: [
      "You've unlocked every Patterns lens — energy, decisions, postponement, recurring questions.",
      "Now I can mirror how you think, not just what you did.",
    ],
    ctaLabel: 'Explore patterns →',
    ctaHref: PATTERNS,
  },
  rhythm_keeper: {
    paragraphs: [
      "You've unlocked all three rhythm features — Your Story So Far, Celebration Gap, and Unseen Wins.",
      "Now your weekly rhythm is complete. Every Tuesday, I'll weave them together into something new.",
    ],
    ctaLabel: "See what's next →",
    ctaHref: RHYTHM,
  },
  dna_discovered: {
    paragraphs: [
      'Your full Founder Archetype is here — not a label, a lens.',
      "I've seen enough of you to name how you lead yourself when it counts.",
    ],
    ctaLabel: 'See your archetype →',
    ctaHref: ARCHETYPE,
  },

  visionary: {
    paragraphs: [
      'Visionary shows up in how you talk about what could be — before the path is obvious.',
      "I'll keep reflecting that forward pull in your insights.",
    ],
    ctaLabel: 'See your archetype →',
    ctaHref: ARCHETYPE,
  },
  builder: {
    paragraphs: [
      'Builder is in the way you turn ideas into structure — ships, systems, proof.',
      "I'll keep naming that craft in what I notice.",
    ],
    ctaLabel: 'See your archetype →',
    ctaHref: ARCHETYPE,
  },
  hustler: {
    paragraphs: [
      'Hustler is energy in motion — you move when others hesitate.',
      "I'll keep honoring that bias toward action in your story.",
    ],
    ctaLabel: 'See your archetype →',
    ctaHref: ARCHETYPE,
  },
  strategist: {
    paragraphs: [
      'Strategist is how you zoom out — tradeoffs, timing, the chess behind the calendar.',
      "I'll keep weaving that lens into your reflections.",
    ],
    ctaLabel: 'See your archetype →',
    ctaHref: ARCHETYPE,
  },
  hybrid: {
    paragraphs: [
      "You're not just one thing. You're a blend — part visionary, part builder, part hustler.",
      "That's rare. That's you.",
    ],
    ctaLabel: 'See your archetype →',
    ctaHref: ARCHETYPE,
  },

  deep_worker: {
    paragraphs: [
      "You've leaned into focus — again and again. That's not discipline bragging; it's how depth gets built.",
      'Your patterns page now carries that signal.',
    ],
    ctaLabel: 'View patterns →',
    ctaHref: PATTERNS,
  },
  quick_win_master: {
    paragraphs: [
      "Quick wins aren't small when they keep you moving — you've chosen momentum as a strategy.",
      "I'll keep noticing when that serves you.",
    ],
    ctaLabel: 'View patterns →',
    ctaHref: PATTERNS,
  },
  strategic_mind: {
    paragraphs: [
      'Your decisions have been leaning strategic — long arc, not just the next hour.',
      "That shows up in how I'll frame your next chapters.",
    ],
    ctaLabel: 'View patterns →',
    ctaHref: PATTERNS,
  },
  tactical_pro: {
    paragraphs: [
      "You've been closing the gap between plan and ground — tactical, again and again.",
      "That's how execution earns trust with yourself.",
    ],
    ctaLabel: 'View patterns →',
    ctaHref: PATTERNS,
  },

  deep_reflector: {
    paragraphs: [
      'Your evenings carry weight — real sentences, not checkboxes. That depth is gold for pattern.',
      "I'll keep reading between the lines with care.",
    ],
    ctaLabel: 'Open rhythm →',
    ctaHref: RHYTHM,
  },
  pattern_seeker: {
    paragraphs: [
      "You've surfaced enough signals that themes are real — not noise.",
      "Pattern-seeking is how founders stop repeating the same hard week.",
    ],
    ctaLabel: 'Explore patterns →',
    ctaHref: PATTERNS,
  },
  question_asker: {
    paragraphs: [
      'The same questions returning in new words? That is your mind circling what matters.',
      "I'll keep naming those echoes so they don't stay invisible.",
    ],
    ctaLabel: 'Open rhythm →',
    ctaHref: RHYTHM,
  },
  growth_edge: {
    paragraphs: [
      'I found a win hiding inside a lesson — the kind you were too modest to spotlight.',
      "Celebration Gap is working when you let yourself be seen.",
    ],
    ctaLabel: 'Open rhythm →',
    ctaHref: RHYTHM,
  },
}

const TOAST: Record<string, BadgeToastLine> = {
  first_spark: 'Your first spark — this is where it begins.',
  one_week_strong: 'Seven days of showing up. Rhythm is forming.',
  two_weeks_strong: 'Two weeks strong. Consistency is becoming you.',
  three_weeks_strong: 'Twenty-one days — habits are taking root.',
  one_month_strong: 'A full month. Rare and earned.',
  two_months_strong: 'Sixty days. You practice like you mean it.',
  quarter_of_greatness: 'Ninety days. A quarter of showing up for your vision.',
  century_club: 'One hundred tasks — proof in motion.',
  execution_machine: 'Five hundred tasks. You move.',
  decision_maker: 'Fifty decisions named. Clarity compounds.',
  evening_reflector: 'Thirty reflections — I can finally see the texture.',
  founder_story: 'Your story is on the map. I can guide you better now.',
  guided_founder: 'Tour complete — you know the loop.',
  pattern_hunter: 'Every Patterns lens unlocked.',
  rhythm_keeper: 'Rhythm features complete — Tuesdays just got richer.',
  dna_discovered: 'Your full archetype is here.',
  visionary: 'Visionary — I see the pull toward what could be.',
  builder: 'Builder — you ship what others only sketch.',
  hustler: 'Hustler — motion is your honest answer.',
  strategist: 'Strategist — you think in arcs, not accidents.',
  hybrid: 'Hybrid — rare blend. That is you.',
  deep_worker: 'Deep Worker — focus is your repeated choice.',
  quick_win_master: 'Quick Win Master — momentum as craft.',
  strategic_mind: 'Strategic Mind — your arc shows in your picks.',
  tactical_pro: 'Tactical Pro — you close the gap to the ground.',
  deep_reflector: 'Deep Reflector — your evenings carry weight.',
  pattern_seeker: 'Pattern Seeker — themes are real now.',
  question_asker: 'Question Asker — your mind circles what matters.',
  growth_edge: 'Growth Edge — a win was hiding in plain sight.',
}

export function getBadgeCelebrationCopy(badgeName: string): BadgeCelebrationCopy | null {
  const c = COPY[badgeName]
  return c ?? null
}

export function getBadgeToastLine(badgeName: string, fallbackDescription: string): string {
  return TOAST[badgeName] ?? fallbackDescription
}
