/** Matches `ActionPlanOption2` on `Task` / `morning_tasks.action_plan` (kept here to avoid circular imports). */
export type ActionPlanMatrixKey =
  | 'my_zone'
  | 'systemize'
  | 'delegate_founder'
  | 'eliminate_founder'
  | 'quick_win_founder'

const MATRIX_KEYS: readonly ActionPlanMatrixKey[] = [
  'my_zone',
  'systemize',
  'delegate_founder',
  'eliminate_founder',
  'quick_win_founder',
] as const

export function isActionPlanMatrixKey(v: string): v is ActionPlanMatrixKey {
  return (MATRIX_KEYS as readonly string[]).includes(v)
}

/** Normalize AI or alias strings to a matrix key (default: milestone / my_zone). */
export function parseAISuggestedActionTypeToMatrixKey(raw: unknown): ActionPlanMatrixKey {
  if (typeof raw !== 'string') return 'my_zone'
  const s = raw.trim().toLowerCase().replace(/-/g, '_')
  const map: Record<string, ActionPlanMatrixKey> = {
    milestone: 'my_zone',
    my_zone: 'my_zone',
    systemize: 'systemize',
    delegate: 'delegate_founder',
    delegate_founder: 'delegate_founder',
    let_go: 'eliminate_founder',
    eliminate: 'eliminate_founder',
    eliminate_founder: 'eliminate_founder',
    quick_win: 'quick_win_founder',
    quick_win_founder: 'quick_win_founder',
  }
  return map[s] ?? 'my_zone'
}

/** Short label for Strategy Prism / badges (matches user-facing matrix names). */
export function matrixKeyToPrismActionLabel(key: ActionPlanMatrixKey): string {
  switch (key) {
    case 'systemize':
      return 'Systemize'
    case 'delegate_founder':
      return 'Delegate'
    case 'eliminate_founder':
      return 'Let go'
    case 'quick_win_founder':
      return 'Quick win'
    case 'my_zone':
    default:
      return 'Milestone'
  }
}

/** Emoji shown on Pro Strategic Stream rows for scanability. */
export const PRO_ACTION_PLAN_EMOJI: Record<ActionPlanMatrixKey, string> = {
  my_zone: '🎯',
  systemize: '⚙️',
  delegate_founder: '👥',
  eliminate_founder: '🗑️',
  quick_win_founder: '⚡',
}

export type ProRefineThirdCopy = {
  /** Short label for the third refine field (replaces static “Only I can do”). */
  label: string
  /** Full guiding question under the label. */
  prompt: string
}

/** Dynamic third-field copy in the Refine drawer (Action matrix). */
export function proRefineThirdFieldCopy(plan: ActionPlanMatrixKey | ''): ProRefineThirdCopy {
  const p = plan || 'my_zone'
  switch (p) {
    case 'systemize':
      return {
        label: 'Systemize',
        prompt: '✨ What\'s the one step you could document today to make this repeatable?',
      }
    case 'delegate_founder':
      return {
        label: 'Delegate',
        prompt: "✨ Who's the right person for this?",
      }
    case 'eliminate_founder':
      return {
        label: 'Let go',
        prompt: "✨ If this task isn't done by Friday, who actually misses it?",
      }
    case 'quick_win_founder':
      return {
        label: 'Quick win',
        prompt: "✨ What's the smallest step you can take right now?",
      }
    case 'my_zone':
    default:
      return {
        label: 'Milestone',
        prompt: "✨ What's the one part of this task that only you can do best?",
      }
  }
}

/** Inline strategic stream: bold label + manifesto tagline (matches ghostwriter schema). */
export const PRO_MATRIX_MANIFESTO_DISPLAY: Record<
  ActionPlanMatrixKey,
  { title: string; tagline: string }
> = {
  my_zone: {
    title: 'Milestone',
    tagline: 'Only you can move this needle.',
  },
  quick_win_founder: {
    title: 'Quick win',
    tagline: 'Low friction, high momentum.',
  },
  delegate_founder: {
    title: 'Delegate',
    tagline: 'Hand this off to buy back your time.',
  },
  systemize: {
    title: 'Systemize',
    tagline: 'Build it once, use it forever.',
  },
  eliminate_founder: {
    title: 'Let go',
    tagline: 'The power to ignore.',
  },
}

/**
 * Strict schema for Mrs. Deer ghostwriter + task suggestion — prevents generic “productivity” drift
 * (e.g. 45-minute “quick wins”, research miscategorized as low-friction).
 */
export function proActionMatrixManifestoForGhostwriterPrompt(): string {
  return `STRICT ACTION MATRIX — WHY/HOW/ONLY must align with the user's selected type. Do not contradict time or cognitive-load rules.

🎯 MILESTONE (my_zone / milestone): The high-leverage needle.
- Definition: Deep work only the founder can do. High complexity, high impact. Never label this kind of work as a Quick Win.
- Time: 60+ minutes of real focused execution (often 60–120+; may be one block or two; HOW must not pretend the whole outcome is a 15-minute task).
- Tagline: "Only you can move this needle."

⚡ QUICK WIN (quick_win): The momentum starter.
- Definition: Simple execution; low cognitive load.
- Time: STRICTLY under 30 minutes wall-clock for what you describe in HOW.
- Tagline: "Low friction, high momentum."

👥 DELEGATE (delegate): The freedom lever.
- Definition: Another owner executes; the founder drafts the brief, handoff, or decision—not doing the hands-on work themselves.
- Tagline: "Hand this off to buy back your time."

⚙️ SYSTEMIZE (systemize): The future gift.
- Definition: Process, template, checklist, or SOP so this class of work is not solved from scratch again.
- Tagline: "Build it once, use it forever."

🗑️ LET GO (let_go / eliminate): The strategic no.
- Definition: Busy-work or non-essential loops the founder chooses not to feed.
- Tagline: "The power to ignore."

RESEARCH / ANALYSIS / DEEP DRAFTING (hard rule):
- Substantial research, analysis, or long-form drafting is NEVER a Quick Win. Classify and write HOW as Milestone (deep block) or Systemize (capture method / template). If the user selected Quick Win but the task title clearly needs deep research, HOW must be one sub-30-minute slice only (e.g. scope, outline, or three search queries) and ONLY must name that the real research belongs in a Milestone or Systemize block—not bundled into “quick win” time.`
}

/** Per-type emphasis appended after the global manifesto in ghostwriter calls. */
export function proGhostwriterMatrixInstruction(plan: ActionPlanMatrixKey | ''): string {
  const p = plan || 'my_zone'
  switch (p) {
    case 'systemize':
      return `SELECTED TYPE: SYSTEMIZE — HOW: one concrete step to document, template, or checklist today (repeatability). ONLY: the single artifact or habit they lock in.`
    case 'delegate_founder':
      return `SELECTED TYPE: DELEGATE — HOW: brief, handoff, or async update—not founder execution. ONLY: who owns it or what they need to succeed.`
    case 'eliminate_founder':
      return `SELECTED TYPE: LET GO — HOW: honest tradeoff, deferral, or scope cut. ONLY: who (if anyone) misses this if it slips—or that it is safe to drop.`
    case 'quick_win_founder':
      return `SELECTED TYPE: QUICK WIN — HOW must be completable in under 30 minutes, low friction. ONLY: the smallest visible step now. Never smuggle multi-hour research/analysis into this slot.`
    case 'my_zone':
    default:
      return `SELECTED TYPE: MILESTONE — HOW: serious execution the founder owns (60+ min of deep work, often 60–120+, possibly split). ONLY: what only this founder can judge or decide. Never treat this as a Quick Win.`
  }
}
