import { BADGE_DEFINITION_MAP } from '@/lib/badges/badge-definitions'
import type { BadgeCategory } from '@/lib/badges/badge-definitions'

export type MilestoneUserContext = {
  currentStreak?: number | null
}

const SINGLE_MESSAGES: Record<string, string> = {
  first_spark:
    "You started. That's the hardest part. And you did it anyway.",
  one_week_strong:
    "One week. You're becoming someone who builds consistency from the ground up.",
  two_weeks_strong:
    "Two weeks. The beginning is behind you. Now you're building momentum.",
  three_weeks_strong:
    "Three weeks. You're becoming someone who doesn't just start — you continue.",
  one_month_strong:
    "One month. You're becoming someone who trusts the process, even when results aren't instant.",
  two_months_strong:
    "Two months. You're becoming someone who shows up. Even on the days it doesn't feel like progress.",
  quarter_of_greatness:
    "Ninety days. You've been showing up for yourself. That's not luck — that's you.",
  century_club:
    "100 tasks completed. You're becoming someone who moves things forward, one step at a time.",
  execution_machine:
    "500 tasks. You're becoming someone who doesn't just plan — you execute.",
  decision_maker:
    "50 decisions logged. You're becoming someone who notices their own thinking.",
  evening_reflector:
    "30 reflections. You're becoming someone who doesn't just do — you reflect. That's rare.",
  founder_story:
    "You shared your story. That takes courage. You're becoming someone who knows themselves.",
  guided_founder:
    "You completed the tour. You're becoming someone who learns the craft.",
  pattern_hunter:
    "You're starting to see your own patterns. That's where growth begins.",
  rhythm_keeper:
    "You've unlocked all Rhythm features. You're becoming someone who finds their flow.",
  dna_discovered:
    "Your archetype is emerging. You're becoming the kind of founder who keeps choosing growth.",
  visionary: "You're becoming someone who sees what's possible before it exists.",
  builder: "You're becoming someone who turns ideas into something real.",
  hustler: "You're becoming someone who makes things happen, no matter what.",
  strategist: "You're becoming someone who thinks three steps ahead.",
  hybrid: "You're becoming someone who holds multiple ways of being. That's rare.",
  deep_worker: "You're becoming someone who protects their focus. That's a superpower.",
  quick_win_master: "You're becoming someone who knows when to move fast and get momentum.",
  strategic_mind: "You're becoming someone who thinks before they act — and acts with purpose.",
  tactical_pro: "You're becoming someone who knows how to get things done, right now.",
  deep_reflector: "You're becoming someone who digs deeper. That's where the real insights live.",
  pattern_seeker: "You're becoming someone who notices what repeats — and learns from it.",
  question_asker: "You're becoming someone who asks why. That's where wisdom begins.",
  growth_edge:
    "You're becoming someone who sees where they're growing — even when it's uncomfortable.",
}

const DESCRIPTIONS: Record<string, string> = {
  first_spark: 'Day 1 milestone',
  one_week_strong: 'Week 1 milestone',
  two_weeks_strong: 'Week 2 milestone',
  three_weeks_strong: 'Week 3 milestone',
  one_month_strong: '30-day milestone',
  two_months_strong: '60-day milestone',
  quarter_of_greatness: '90-day milestone',
}

/** Second clause after "Label — " on the multi-badge milestone card; overrides auto-derived copy. */
const ACHIEVEMENT_LINE_FRAGMENT_OVERRIDE: Partial<Record<string, string>> = {
  first_spark: "you started. That's the hardest part.",
  founder_story: 'you shared your story. Now I know how to guide you.',
  guided_founder: 'you learned the rhythm. Now the real insights begin.',
}

function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

function deriveAchievementLineFragment(name: string): string {
  const o = ACHIEVEMENT_LINE_FRAGMENT_OVERRIDE[name]
  if (o) return o

  const single = SINGLE_MESSAGES[name]
  if (single) {
    const sentences = single.match(/[^.!?]+[.!?]+/g) ?? [single]
    const joined = sentences.slice(0, 2).join(' ').trim()
    const base = joined || single.trim()
    return base.charAt(0).toLowerCase() + base.slice(1)
  }

  const def = BADGE_DEFINITION_MAP[name]
  if (def?.description) {
    const d = def.description.trim()
    const body = d.charAt(0).toLowerCase() + d.slice(1)
    return body.endsWith('.') ? body : `${body}.`
  }

  const label = def?.label ?? name.replaceAll('_', ' ')
  return `you unlocked ${label.toLowerCase()}.`
}

export function getMilestoneMessage(badgeName: string, _userData: MilestoneUserContext): string {
  const key = String(badgeName ?? '').trim()
  if (SINGLE_MESSAGES[key]) return SINGLE_MESSAGES[key]!
  const def = BADGE_DEFINITION_MAP[key]
  const label = def?.label ?? key.replaceAll('_', ' ')
  return `You earned '${label}'. You're becoming someone who keeps going, even when the path isn't clear.`
}

export function getMilestoneDescription(badgeName: string): string {
  const key = String(badgeName ?? '').trim()
  if (DESCRIPTIONS[key]) return DESCRIPTIONS[key]!
  return 'Badge unlocked'
}

function categoryOf(name: string): BadgeCategory | null {
  return BADGE_DEFINITION_MAP[name]?.category ?? null
}

export function getMultipleMilestoneMessage(badgeNames: string[], _userData: MilestoneUserContext): string {
  const cats = new Set(
    badgeNames.map((n) => categoryOf(n)).filter((c): c is BadgeCategory => c != null)
  )
  if (cats.size === 1 && cats.has('milestone')) {
    return "This week, you've become someone who shows up. Day after day."
  }
  if (cats.size > 1) {
    return "This week, you've become someone who shows up, reflects, and grows."
  }
  return "This week, you've become someone who keeps building their founder rhythm."
}

/**
 * One line per badge for the multi-badge milestone card: "First Spark — you started…"
 */
export function getAchievementsList(badgeNames: string[], _userData: MilestoneUserContext): string[] {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const raw of badgeNames) {
    const name = String(raw ?? '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    const label =
      BADGE_DEFINITION_MAP[name]?.label ?? titleCaseWords(name.replaceAll('_', ' '))
    const fragment = deriveAchievementLineFragment(name)
    lines.push(`${label} — ${fragment}`)
  }
  return lines
}
