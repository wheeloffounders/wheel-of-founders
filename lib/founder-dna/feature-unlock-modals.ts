/**
 * Personalized Mrs. Deer copy for feature unlock modals.
 * Structure: opening observation (first paragraph, shown italic in UI) → noticed → now → cadence.
 * Unlock thresholds stay in sync with `unlock-schedule-config` / `archetype-timing`.
 */

import { ARCHETYPE_FULL_MIN_DAYS, ARCHETYPE_PREVIEW_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import { FOUNDER_DNA_FEATURE_META } from '@/lib/founder-dna/feature-links'
import {
  DECISION_STYLE_MIN_DAYS,
  MORNING_INSIGHTS_MIN_DAYS,
  MONTHLY_INSIGHT_MIN_DAYS,
  POSTPONEMENT_MIN_DAYS,
  QUARTERLY_INSIGHT_MIN_DAYS,
  RECURRING_QUESTION_MIN_DAYS,
  SCHEDULE_ENERGY_MIN_DAYS,
  SCHEDULE_STORY_SO_FAR_DAY,
  SCHEDULE_UNSEEN_WINS_DAY,
  WEEKLY_INSIGHT_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'

export type FeatureUnlockModalContext = {
  /** Days with entries (from journey); used in body copy */
  daysWithEntries: number
}

export type FeatureUnlockModalCopy = {
  /**
   * Body copy in order: [0] = Mrs. Deer’s opening line (italic in UI), then supporting paragraphs.
   * Feature name is shown above as a subtle header in the modal template.
   */
  paragraphs: string[]
  ctaLabel: string
  href: string
  icon: string
  /** Shown as the subtle modal header (with icon) */
  featureTitle: string
}

function nDays(ctx: FeatureUnlockModalContext, threshold: number): number {
  const d = ctx.daysWithEntries
  return d >= threshold ? d : threshold
}

function dayWord(n: number): string {
  return `${n} day${n === 1 ? '' : 's'}`
}

export function parseFeatureNameFromWhatsNewId(id: string): string | null {
  if (!id.startsWith('feature-')) return null
  return id.slice('feature-'.length)
}

function metaFor(name: string) {
  return FOUNDER_DNA_FEATURE_META[name]
}

/**
 * Returns personalized modal copy, or null if this feature uses another surface (e.g. first_glimpse).
 */
export function getFeatureUnlockModalContent(
  featureName: string,
  ctx: FeatureUnlockModalContext
): FeatureUnlockModalCopy | null {
  const meta = metaFor(featureName)
  const href = meta?.link ?? '/founder-dna/journey'
  const icon = meta?.icon ?? '✨'
  const featureTitle = meta?.title ?? featureName.replace(/_/g, ' ')

  switch (featureName) {
    case 'first_glimpse':
      return null

    case 'morning_insights': {
      const n = nDays(ctx, MORNING_INSIGHTS_MIN_DAYS)
      return {
        featureTitle,
        icon,
        href,
        paragraphs: [
          'Beside you in the morning…',
          `I've watched you close the loop — morning and evening starting to speak to each other. With ${dayWord(n)} of showing up, I can finally whisper back while you plan.`,
          'Your morning insights are on now: gentle context after you commit to the day, and nudges when they help. This grows with you; it is not a one-off report.',
          "I'll keep refreshing what I notice as your rhythm deepens.",
        ],
        ctaLabel: 'Open morning insights →',
      }
    }

    case 'your_story_so_far': {
      const n = nDays(ctx, SCHEDULE_STORY_SO_FAR_DAY)
      return {
        featureTitle,
        icon,
        href,
        paragraphs: [
          'A thread is beginning to show…',
          `With ${n} days of entries, a story is starting to take shape. I've written your first narrative — what I notice about how you work, decide, and show up.`,
          "It's yours to read now. Every Tuesday, I'll add a new chapter as your story grows.",
        ],
        ctaLabel: 'Read my story →',
      }
    }

    case 'weekly_insight': {
      const n = nDays(ctx, WEEKLY_INSIGHT_MIN_DAYS)
      return {
        featureTitle,
        icon,
        href: '/weekly',
        paragraphs: [
          'The beginning of your rhythm…',
          `I've been watching how you plan, decide, and reflect. With ${n} days of entries, a pattern is starting to show.`,
          "Your first Weekly Insight is ready now — a snapshot of what I'm seeing so far.",
          'After this, a fresh insight will arrive every Monday, capturing your patterns from the week before.',
        ],
        ctaLabel: 'Show me my first insight →',
      }
    }

    case 'celebration_gap': {
      return {
        featureTitle,
        icon,
        href,
        paragraphs: [
          "A win you didn't name…",
          "I've noticed something in your reflections. Sometimes what you call a \"lesson\" actually holds a win you didn't spotlight.",
          'Celebration Gap finds those moments and mirrors them back to you. Your first one is ready now.',
          'Every Tuesday, as new reflections land, I may refresh this mirror.',
        ],
        ctaLabel: 'See my Celebration Gap →',
      }
    }

    case 'unseen_wins': {
      const n = nDays(ctx, SCHEDULE_UNSEEN_WINS_DAY)
      return {
        featureTitle,
        icon,
        href,
        paragraphs: [
          'What hides in plain sight…',
          `With ${n} days of entries, I'm starting to see the wins you might not be naming — the quiet moments, the small habits, the progress you're making without realizing it.`,
          "Your first Unseen Wins read is ready. It's a gentle mirror for the threads that deserve celebrating.",
          'Every Tuesday, as your evenings add more texture, I may find new ones.',
        ],
        ctaLabel: 'Read Unseen Wins →',
      }
    }

    case 'energy_trends': {
      const n = nDays(ctx, SCHEDULE_ENERGY_MIN_DAYS)
      return {
        featureTitle,
        icon,
        href,
        paragraphs: [
          'The shape of your days…',
          `I've been reading your evening check-ins. After ${n} days of entries, a pattern is emerging — how your energy and mood move together, where they rise, where they dip.`,
          "Your first Energy & Mood chart is ready now. It's a map of what you're carrying and where you're finding flow.",
          "Every Wednesday, as new reflections land, I'll refresh what I see.",
        ],
        ctaLabel: 'Open my chart →',
      }
    }

    case 'decision_style': {
      const n = nDays(ctx, DECISION_STYLE_MIN_DAYS)
      return {
        featureTitle,
        icon,
        href,
        paragraphs: [
          'How you choose…',
          `I've tracked what you capture when you decide. With ${n} days of entries, a pattern is emerging — when you think long-term, and when you act now.`,
          "Your first Decision Style breakdown is ready now. It's a mirror for how you move between strategy and action.",
          "Every Wednesday, as you log more decisions, I'll refine what I see.",
        ],
        ctaLabel: 'See my decision style →',
      }
    }

    case 'monthly_insight': {
      const n = nDays(ctx, MONTHLY_INSIGHT_MIN_DAYS)
      return {
        featureTitle,
        icon,
        href: '/monthly-insight',
        paragraphs: [
          'Enough breadth for a wider lens…',
          `With ${dayWord(n)} of entries, a single week is no longer the whole story. I can start to see the through-line — the wins that repeat, the lessons that surface again.`,
          "Your first Monthly Insight is ready now. It's a step back to see what's emerging across weeks, not just days.",
          'After this, a fresh read lands on the 1st of each month, looking back at the month that just closed.',
        ],
        ctaLabel: 'Read my monthly insight →',
      }
    }

    case 'postponement_patterns': {
      const n = nDays(ctx, POSTPONEMENT_MIN_DAYS)
      return {
        featureTitle,
        icon,
        href,
        paragraphs: [
          'What tends to wait…',
          `I've noticed how tasks move across your days. At ${n} entries, there is enough signal to see what you tend to push — gently, without judgment.`,
          'Your first Postponement Patterns view is ready now: a map of delay and a hint at why.',
          'Every Wednesday, I refresh this as your plan and reflections evolve.',
        ],
        ctaLabel: 'View postponement patterns →',
      }
    }

    case 'recurring_question': {
      const n = nDays(ctx, RECURRING_QUESTION_MIN_DAYS)
      return {
        featureTitle,
        icon,
        href,
        paragraphs: [
          'The questions that return…',
          `I've read enough of your evenings to hear echoes. With ${n} days of reflections, certain questions keep showing up in new words.`,
          'Your first Recurring Question insight is ready now — themes you circle without needing a final answer.',
          'Every Wednesday, I update this as your language shifts.',
        ],
        ctaLabel: 'See my recurring question →',
      }
    }

    case 'quarterly_insight': {
      const n = nDays(ctx, QUARTERLY_INSIGHT_MIN_DAYS)
      return {
        featureTitle,
        icon,
        href: '/quarterly',
        paragraphs: [
          'The long arc…',
          `You've built ${n} days of entries — long enough that trajectory matters, not just this week's weather.`,
          'Your first Quarterly Trajectory is ready now: how the quarter is shaping who you are becoming as a founder.',
          'After this, a fresh read arrives at the start of each quarter — January, April, July, October.',
        ],
        ctaLabel: 'Open my quarterly trajectory →',
      }
    }

    case 'founder_archetype': {
      return {
        featureTitle,
        icon,
        href,
        paragraphs: [
          'A pattern is starting to show.',
          `After ${dayWord(ARCHETYPE_PREVIEW_MIN_DAYS)} of entries, I can see the first hints of your founder style — how you build, decide, and lead.`,
          `This is a preview. The full picture will emerge at ${ARCHETYPE_FULL_MIN_DAYS} days, when I'll reveal your complete Founder Archetype.`,
        ],
        ctaLabel: 'See my preview →',
      }
    }

    case 'founder_archetype_full': {
      const metaFull = metaFor('founder_archetype_full')
      return {
        featureTitle: metaFull?.title ?? 'Founder Archetype (Full)',
        icon: metaFull?.icon ?? '🔮',
        href: metaFull?.link ?? '/founder-dna/archetype',
        paragraphs: [
          'Your founder style has fully emerged.',
          `After ${dayWord(ARCHETYPE_FULL_MIN_DAYS)} of entries, I can see the complete picture — the kind of founder you're becoming. How you build. How you decide. How you lead.`,
          "Your Founder Archetype is ready. It's a mirror, not a label. Use it to see yourself more clearly.",
          "Every 90 days, I'll refresh this as you grow.",
        ],
        ctaLabel: 'See my archetype →',
      }
    }

    default:
      if (!meta) return null
      return {
        featureTitle: meta.title,
        icon: meta.icon,
        href: meta.link,
        paragraphs: ['Something new opened…', meta.description],
        ctaLabel: 'Open →',
      }
  }
}
