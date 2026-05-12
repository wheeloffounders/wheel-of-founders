import { WOF_PENDING_DECISION_PARSER_KEY } from '@/lib/pending-decision-parser-ingest'
import { getBlogInteractiveFunnel } from '@/lib/blog-interactive-funnels'

export type MorningEntryContext =
  | 'decision'
  | 'eos'
  | 'energy'
  | 'delegation'
  | 'values'
  | 'momentum'
  | 'boundaries'

const DEFAULT_NUDGE = "Good morning, Founder. Let's set your intentions."

const AUTH_WARM_COPY: Record<
  MorningEntryContext,
  { login: string; signup: string }
> = {
  decision: {
    login: 'You are one step away from clearing the 2 AM fog. Log in to continue.',
    signup: 'You are one step away from clearing the 2 AM fog. Sign up to save your progress.',
  },
  eos: {
    login: 'Ready to start your EOS loop? Just log in below.',
    signup: 'Ready to start your EOS loop? Sign up to lock in your first cycle.',
  },
  energy: {
    login: "You're one step away from mapping your battery. Log in to continue.",
    signup: "You're one step away from mapping your battery. Sign up to save your progress.",
  },
  delegation: {
    login: 'You are one step away from a cleaner handoff. Log in to continue.',
    signup: 'You are one step away from a cleaner handoff. Sign up to save your delegation mirror.',
  },
  values: {
    login: 'You are one step away from wiring meaning into your day. Log in to continue.',
    signup: 'You are one step away from wiring meaning into your day. Sign up to save your legacy map.',
  },
  momentum: {
    login: 'You are one step away from your first discipline loop. Log in to continue.',
    signup: 'You are one step away from your first discipline loop. Sign up to save your streak anchor.',
  },
  boundaries: {
    login: 'You are one step away from a clean shutdown line. Log in to continue.',
    signup: 'You are one step away from a clean shutdown line. Sign up to save your Presence Permit.',
  },
}

const CONTEXT_TEMPLATES: Record<MorningEntryContext, string[]> = {
  eos: [
    'Finalize Rocks for the week',
    'Conduct Level 10 Meeting prep',
    "Clear In-Tray to zero",
  ],
  energy: [
    "Schedule deep work during peak battery",
    'Delegate one energy-draining task',
    "Set a hard offline time for tonight",
  ],
  decision: [
    'Identify the one one-way door decision',
    'Log current mental friction point',
    'Review parking lot for non-essentials',
  ],
  delegation: [
    'Name one limb-level task to hand off this week',
    'Draft a 3-point Done Checklist for that handoff',
    'Schedule 5 minutes of contained worry time after you delegate',
  ],
  values: [
    'Name one task today that serves your remembered impact',
    'Capture one Legacy Principle your team could repeat without you',
    'Review yesterday: where did you default to heroics instead of systems?',
  ],
  momentum: [
    'Confirm your trigger fired once today',
    'Complete one tiny habit rep—nothing bigger',
    'Close the loop with your chosen celebration cue',
  ],
  boundaries: [
    'Name the one itch trying to keep the laptop open tonight',
    'Write the minimum “finished enough” version you can walk away from',
    'Block five minutes tomorrow to repeat this line before you open Slack',
  ],
}

export function parseMorningEntryContext(
  contextParam: string | undefined | null,
  parserPassLegacy: string | undefined | null
): MorningEntryContext | null {
  const raw = (contextParam ?? '').trim().toLowerCase()
  if (
    raw === 'decision' ||
    raw === 'eos' ||
    raw === 'energy' ||
    raw === 'delegation' ||
    raw === 'values' ||
    raw === 'momentum' ||
    raw === 'boundaries'
  )
    return raw
  if (parserPassLegacy === '1') return 'decision'
  return null
}

/**
 * Topic-based Mrs. Deer line for blog → morning handoffs.
 * For `decision`, pass whether a guest parser capture still exists in localStorage; otherwise copy falls back to default (no false "saved" claim).
 * Optional `funnelId` (registry slug) sharpens copy when `?funnel=` or session carries a blog funnel.
 */
export function getNudgeMessage(
  context: MorningEntryContext,
  hasPendingDecisionCapture: boolean,
  funnelId?: string | null
): string {
  if (context === 'decision' && hasPendingDecisionCapture) {
    return "I've placed your 2 AM decision here. Let's set your other two Needle Movers to clear the fog."
  }
  const funnelCfg = funnelId ? getBlogInteractiveFunnel(funnelId) : undefined
  if (funnelCfg?.morningNudge) {
    return funnelCfg.morningNudge
  }
  if (context === 'decision' && !hasPendingDecisionCapture) {
    return DEFAULT_NUDGE
  }
  switch (context) {
    case 'eos':
      return 'Time to execute like an EOS pro. Set your 3 Needle Movers.'
    case 'energy':
      return "Let's protect your battery today. Pick 3 Needle Movers that match your current energy level."
    case 'decision':
      return DEFAULT_NUDGE
    case 'delegation':
      return "Let's build one trust-based handoff today—pick a limb, not a baby."
    case 'values':
      return "Let's build one thing today that outlasts your presence—start from your remembered impact, not the inbox."
    case 'momentum':
      return "Today's job is the loop—trigger, tiny habit, celebration. Big goals can wait until the streak is real."
    case 'boundaries':
      return "Let's draw one honest 'finished enough' line today—then protect tonight's presence like it matters. It does."
    default:
      return DEFAULT_NUDGE
  }
}

export function getWarmAuthMessage(
  context: MorningEntryContext | null,
  mode: 'login' | 'signup'
): string | null {
  if (!context) return null
  return AUTH_WARM_COPY[context][mode]
}

export function getTemplates(context: MorningEntryContext | null): string[] {
  if (!context) return []
  return CONTEXT_TEMPLATES[context]
}

export function readPendingDecisionParserInStorage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(localStorage.getItem(WOF_PENDING_DECISION_PARSER_KEY))
  } catch {
    return false
  }
}
