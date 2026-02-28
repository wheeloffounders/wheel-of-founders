/**
 * Split-insight generation for Wheel of Founders.
 * Generates long insights in pieces (≤150 tokens/request) for DeepSeek free tier.
 * Context passing between sections ensures seamless, natural flow.
 *
 * @deprecated Use single-request generation (generateAIPrompt) instead. Split-insight
 * causes 15-20s waits and burns credits. Set USE_SPLIT_INSIGHT=true only for token-limited providers.
 */
import { generateAIPrompt, AIError } from './ai-client'

const MRS_DEER_RULES = `You are Mrs. Deer, a warm, wise coach for founders. You've sat with many founders. You validate before reframing. You think with them, not at them. BANNED: needle mover, action plan, smart constraint, power list. Use natural language only.`

const MAX_TOKENS_PER_SECTION = 150

export interface SectionConfig {
  name: string
  header: string // Exact ## header to output
  buildPrompt: (ctx: SectionContext) => string
  transition?: string // How to connect from prior section
}

export interface SectionContext {
  type: 'weekly' | 'monthly' | 'quarterly'
  userData: Record<string, unknown>
  priorSections: string[]
  periodLabel?: string // e.g. "February", "Q1"
  hasHistory?: boolean // If false, use mirror-only prompts
}

export interface PartialSuccess {
  sections: { name: string; content: string }[]
  failed: string[]
  message: string
}

/** Weekly: 4 sections, ~150 tokens each. AI chooses natural titles. */
export const WEEKLY_SECTIONS: SectionConfig[] = [
  {
    name: 'observation',
    header: '[AI chooses warm title]',
    buildPrompt: (ctx) =>
      `Write the FIRST section of a weekly insight. Output ONLY a ## header (choose a warm, natural title e.g. "The Balance You're Holding") and 3-4 sentences. No intro.
Start with a warm observation about their wins and patterns. Use their exact words. End with a gentle hook to what comes next.`,
  },
  {
    name: 'validation',
    header: '[AI chooses]',
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections[0] || ''
      const priorSnippet = prior.substring(0, 120)
      return `Write the SECOND section. The previous section ended with: "${priorSnippet}..."
Output ONLY a ## header (choose warm title e.g. "What's Driving You") and 2-3 sentences. Transition naturally with "Alongside these bright spots..." or similar. Validate what they carried. End with a hook to the patterns.`
    },
    transition: 'Alongside these bright spots, you also carried...',
  },
  {
    name: 'patterns',
    header: 'patterns',
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections.join('\n\n').substring(0, 200)
      return `Write the THIRD section. Prior context: "${prior}..."
Output ONLY a ## header (choose warm title e.g. "A Deeper Question") and 2-3 sentences. Connect their challenges to patterns. "What's interesting is how these challenges echo..." End with a hook to the experiment.`
    },
    transition: "What's interesting is how these challenges echo...",
  },
  {
    name: 'experiment',
    header: 'experiment',
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections.join('\n\n').substring(0, 200)
      return `Write the FOURTH and FINAL section. Prior context: "${prior}..."
Output ONLY a ## header (choose warm title e.g. "One Small Experiment") and one specific reframing question. "This pattern points toward something for the week ahead..." One open question based on their actual words.`
    },
    transition: "This pattern points toward something for the week ahead...",
  },
]

/** Monthly: 6 sections matching exact structure */
export const MONTHLY_SECTIONS: SectionConfig[] = [
  {
    name: 'shape',
    header: 'The Shape of Your [MONTH]',
    buildPrompt: (ctx) =>
      `Write the FIRST section. Header: ## The Shape of Your ${ctx.periodLabel || 'Month'}
Output ONLY the header and 3-4 sentences on the overall arc. What themes dominated? How did energy/mood shift? Major wins. No intro.`,
  },
  {
    name: 'wins',
    header: 'What Your Wins Whisper',
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections[0] || ''
      return `Write the SECOND section. Prior: "${prior.substring(0, 100)}..."
Output ONLY: ## What Your Wins Whisper
4-5 sentences on what their starred wins reveal. "Looking closer at what made this month..." Use their words. End with a hook to lessons.`
    },
    transition: 'Looking closer at what made this month...',
  },
  {
    name: 'lessons',
    header: 'The Lessons That Echo',
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections.join('\n\n').substring(0, 150)
      return `Write the THIRD section. Prior: "${prior}..."
Output ONLY: ## The Lessons That Echo
4-5 sentences on recurring themes in lessons. "Yet within these wins, there were also whispers of..." What keeps showing up?`
    },
    transition: 'Yet within these wins, there were also whispers of...',
  },
  {
    name: 'deeper',
    header: 'A Deeper Look',
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections.join('\n\n').substring(0, 200)
      return `Write the FOURTH section. Prior: "${prior}..."
Output ONLY: ## A Deeper Look: [THEME]
4-5 sentences on ONE pattern (e.g. work-family dance). "This tension shows up most clearly in..." Go deeper on one thread.`
    },
    transition: 'This tension between wins and lessons shows up most clearly in...',
  },
  {
    name: 'evolution',
    header: 'The Quiet Evolution',
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections.join('\n\n').substring(0, 200)
      return `Write the FIFTH section. Prior: "${prior}..."
Output ONLY: ## The Quiet Evolution
3-4 sentences on subtle shifts from week 1 to week 4. "And yet, across the month, something shifted..." What's different now?`
    },
    transition: "And yet, across the month, something shifted...",
  },
  {
    name: 'question',
    header: 'A Question to Carry Forward',
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections.join('\n\n').substring(0, 200)
      return `Write the SIXTH and FINAL section. Prior: "${prior}..."
Output ONLY: ## A Question to Carry Forward
2-3 sentences. "All of this leads to a question to carry forward..." One gentle, open question specific to their journey.`
    },
    transition: "All of this leads to a question to carry forward...",
  },
]

/** Quarterly: 4 sections matching exact structure */
export const QUARTERLY_SECTIONS: SectionConfig[] = [
  {
    name: 'glance',
    header: 'The Quarter in One Glance',
    buildPrompt: (ctx) =>
      `Write the FIRST section. Output ONLY: ## The Quarter in One Glance
A single, powerful paragraph capturing the essence. The throughline from 12 weeks ago to now. No intro.`,
  },
  {
    name: 'northstar',
    header: 'Your North Star',
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections[0] || ''
      return `Write the SECOND section. Prior: "${prior.substring(0, 120)}..."
Output ONLY: ## Your North Star
Connect everything to their main goal. "Through all of this, one thing remained true..." What did they build? How does it move them toward their goal?`
    },
    transition: 'Through all of this, one thing remained true...',
  },
  {
    name: 'shift',
    header: 'The Big Shift',
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections.join('\n\n').substring(0, 200)
      return `Write the THIRD section. Prior: "${prior}..."
Output ONLY: ## The Big Shift
ONE major transformation. "But something fundamental changed in how you held it..." 2-3 examples across the months. Not multiple themes—the single biggest shift.`
    },
    transition: "But something fundamental changed in how you held it...",
  },
  {
    name: 'next',
    header: "What's Next?",
    buildPrompt: (ctx) => {
      const prior = ctx.priorSections.join('\n\n').substring(0, 200)
      return `Write the FOURTH and FINAL section. Prior: "${prior}..."
Output ONLY: ## What's Next?
Strategic guidance for the next quarter. "This shift opens the door to..." One big question to carry forward. Strategic, not tactical.`
    },
    transition: "This shift opens the door to...",
  },
]

function getSections(type: 'weekly' | 'monthly' | 'quarterly'): SectionConfig[] {
  switch (type) {
    case 'weekly':
      return WEEKLY_SECTIONS
    case 'monthly':
      return MONTHLY_SECTIONS
    case 'quarterly':
      return QUARTERLY_SECTIONS
    default:
      return []
  }
}

const FIRST_DAY_MIRROR_RULES = `CRITICAL: This user has NO prior history. ONLY use what's in TODAY'S entry. DO NOT say "I recall" or reference past conversations. DO NOT interpret what it "represents"—just observe. Be a mirror, not a coach. Notice: multiple entries at same timestamp? Tension named clearly (e.g. "gut yes, risk no")? What did they do differently than most? If they wrote both task and hesitation, NOTICE that.`

/**
 * Generate one section with prior context for seamless flow.
 * Retries once with smaller maxTokens on timeout.
 */
async function generateSection(
  config: SectionConfig,
  ctx: SectionContext,
  baseUserPrompt: string
): Promise<string> {
  const sectionPrompt = config.buildPrompt(ctx)
  const fullUserPrompt = `${baseUserPrompt}\n\n---\n\nSECTION TASK:\n${sectionPrompt}\n\nKeep this section under 100 words. Output ONLY the ## header and content, no meta-commentary.`

  const mirrorNote = ctx.hasHistory === false ? `\n\n${FIRST_DAY_MIRROR_RULES}` : ''

  const doGenerate = async (maxTokens: number) => {
    return generateAIPrompt({
      systemPrompt: `${MRS_DEER_RULES}${mirrorNote}\n\nOutput a single section. Max ${maxTokens} tokens. Use ## markdown header. Be specific. Use their words.`,
      userPrompt: fullUserPrompt,
      maxTokens,
      temperature: 0.7,
    })
  }

  try {
    const content = await doGenerate(MAX_TOKENS_PER_SECTION)
    return content.trim()
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('TIMEOUT'))
    if (isTimeout) {
      console.warn(`[split-insight] Section ${config.name} timeout, retrying with smaller maxTokens`)
      const content = await doGenerate(100)
      return content.trim()
    }
    throw err
  }
}

/**
 * Optional: Light smoothing pass if transitions feel choppy.
 * Uses minimal tokens to blend sections.
 */
async function smoothTransitions(sections: string[]): Promise<string> {
  const combined = sections.join('\n\n')
  try {
    const smoothed = await generateAIPrompt({
      systemPrompt: `${MRS_DEER_RULES}\n\nMake this flow as ONE seamless message. Don't change content or meaning. Only smooth transitions between sections.`,
      userPrompt: `Smooth these sections into one flowing insight. Keep all content. Fix any choppy transitions:\n\n${combined}`,
      maxTokens: 100,
      temperature: 0.3,
    })
    return smoothed?.trim() || combined
  } catch {
    return combined
  }
}

export interface GenerateSplitInsightOptions {
  type: 'weekly' | 'monthly' | 'quarterly'
  baseUserPrompt: string
  userData: Record<string, unknown>
  periodLabel?: string
  hasHistory?: boolean
  onProgress?: (section: SectionConfig, index: number) => void
  /** Skip smoothing pass (saves tokens; use if transitions are good enough) */
  skipSmoothing?: boolean
}

/** Default: skip smoothing to stay under token limits */
const DEFAULT_SKIP_SMOOTHING = true

/**
 * Generate a full insight by splitting into sections, each under token limit.
 * Passes context between sections for seamless flow.
 */
export async function generateSplitInsight({
  type,
  baseUserPrompt,
  userData,
  periodLabel,
  hasHistory = true,
  onProgress,
  skipSmoothing = DEFAULT_SKIP_SMOOTHING,
}: GenerateSplitInsightOptions): Promise<string> {
  const sections = getSections(type)
  const results: string[] = []
  const failed: string[] = []

  console.log(`[split-insight] Generating ${type} insight, hasHistory=${hasHistory}`)

  for (let i = 0; i < sections.length; i++) {
    const config = sections[i]
    const ctx: SectionContext = {
      type,
      userData,
      priorSections: results,
      periodLabel,
      hasHistory,
    }

    try {
      onProgress?.(config, i)
      const content = await generateSection(config, ctx, baseUserPrompt)
      results.push(content)
    } catch (err) {
      console.error(`[split-insight] Section ${config.name} failed:`, err)
      failed.push(config.name)
      // Continue with other sections; we'll return partial + note
    }
  }

  const combined = results.join('\n\n')

  if (failed.length > 0 && results.length > 0) {
    // Partial success: return what we have with a note
    const note = `I noticed your ${type} patterns, but had trouble surfacing everything. Here's what I could gather:\n\n`
    return note + combined
  }

  if (results.length === 0) {
    throw new AIError(
      `[split-insight] All sections failed for ${type}`,
      'split-insight',
      undefined,
      undefined,
      failed.join(', ')
    )
  }

  // Optional smoothing pass
  if (!skipSmoothing && results.length > 1) {
    try {
      return await smoothTransitions(results)
    } catch {
      return combined
    }
  }

  return combined
}
