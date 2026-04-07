import { detectWinThemes, type WinWithDate } from '@/lib/weekly-analysis'
import type { QuarterlyData, QuarterlyUserProfile, WinWithReviewDate } from '@/lib/quarterly/getQuarterlyData'

export type ShiftMonthBlock = {
  monthLabel: string
  monthKey: string
  heading: string
  winSamples: string[]
  revelation: string
}

export type TransformationThread = {
  oldQuestion: string
  newQuestion: string
  body: string
  oldFraming: string
  newFraming: string
}

export type CarriedStrength = { title: string; detail: string }

export type SurpriseBlock = { headline: string; body: string }

export type GuidingQuestionBlock = { question: string; explain: string }

export type QuarterlyNarrative = {
  shiftShowedUp: ShiftMonthBlock[]
  transformationThread: TransformationThread
  carriedForward: CarriedStrength[]
  surprise: SurpriseBlock
  guidingQuestion: GuidingQuestionBlock
}

/** Template phrase we never surface as a month hook (was overused when Family led every month). */
const BANNED_HOOK_SUBSTRING = /when\s+life\s+had\s+a\s+seat\s+at\s+the\s+table/i

/** If hook ends on a dangling preposition, pull one more token or trim back. */
const TRAILING_PREP = new Set([
  'of',
  'for',
  'with',
  'to',
  'by',
  'in',
  'on',
  'at',
  'from',
  'as',
  'about',
  'into',
  'onto',
  'over',
  'off',
])

const LEADING_STOPWORDS = new Set([
  'i',
  'we',
  'my',
  'our',
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'to',
  'for',
  'of',
  'in',
  'on',
  'at',
  'is',
  'was',
  'were',
  'had',
  'did',
  'made',
  'got',
  'finally',
  'actually',
  'really',
  'just',
  'so',
  'today',
  'this',
  'that',
])

function stripEdgePunct(w: string): string {
  return w.replace(/^["'([«]+/g, '').replace(/[,.;:!?"')\]]+$/g, '')
}

function titleCaseHookWords(ws: string[]): string {
  return ws
    .map((w) => {
      const core = stripEdgePunct(w)
      if (!core) return ''
      if (core.length <= 3 && /^(of|the|and|at|in|to|a|an)$/i.test(core)) return core.toLowerCase()
      const first = core.charAt(0).toUpperCase()
      const rest = core.slice(1)
      const lower = /[a-z]/.test(rest) ? rest.toLowerCase() : rest
      return first + lower
    })
    .filter(Boolean)
    .join(' ')
}

/**
 * Pull a short, concrete hook (4–7 words) from a win line for month headings.
 */
function extractHookFromWinText(raw: string, minWords = 4, maxWords = 7): string | null {
  const s0 = raw.replace(/\s+/g, ' ').trim()
  if (s0.length < 14) return null
  const words = s0.split(/\s+/).map(stripEdgePunct).filter(Boolean)
  if (words.length < minWords) return null

  let i = 0
  while (i < words.length && i < 5 && LEADING_STOPWORDS.has(words[i]!.toLowerCase())) {
    i++
  }

  const out: string[] = []
  while (i < words.length && out.length < maxWords) {
    out.push(words[i]!)
    i++
  }

  const finalize = (picked: string[], idx: number): string | null => {
    const w = [...picked]
    let j = idx
    while (
      w.length > 0 &&
      j < words.length &&
      TRAILING_PREP.has(stripEdgePunct(w[w.length - 1]!).toLowerCase())
    ) {
      w.push(words[j]!)
      j++
      if (w.length > maxWords + 2) break
    }
    while (
      w.length > minWords &&
      TRAILING_PREP.has(stripEdgePunct(w[w.length - 1]!).toLowerCase())
    ) {
      w.pop()
    }
    if (w.length < minWords) return null
    const hook = titleCaseHookWords(w)
    return BANNED_HOOK_SUBSTRING.test(hook) ? null : hook
  }

  if (out.length < minWords) {
    const fb = words.slice(0, Math.min(maxWords, words.length))
    if (fb.length < minWords) return null
    return finalize(fb, fb.length)
  }

  return finalize(out, i)
}

function monthShortFromLabel(monthLabel: string): string {
  return monthLabel.split(/\s+/)[0] ?? monthLabel
}

function hookFromMonthWins(wins: WinWithReviewDate[], skipHooks: Set<string>): string | null {
  const curated = curateWinsForMonth(wins, 10)
  for (const w of curated) {
    const hook = extractHookFromWinText(w.text)
    if (!hook) continue
    const key = hook.toLowerCase()
    if (skipHooks.has(key)) continue
    skipHooks.add(key)
    return hook
  }
  return null
}

function toWinWithDate(w: WinWithReviewDate): WinWithDate {
  return { text: w.text, date: w.reviewDate }
}

function dedupeWins(wins: WinWithReviewDate[]): WinWithReviewDate[] {
  const seen = new Set<string>()
  const out: WinWithReviewDate[] = []
  for (const w of wins) {
    const k = w.text.trim().toLowerCase().slice(0, 80)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(w)
  }
  return out
}

function scoreWin(text: string): number {
  const len = text.length
  if (len < 8) return 0
  let s = Math.min(len, 220) / 12
  const lower = text.toLowerCase()
  if (/calm|patient|pause|breathe|present|listen|kind|grace|son|daughter|family|together|rest|boundary|proud|love/.test(lower)) s += 8
  if (/ship|launch|deploy|built|shipped|feature|users|code|product/.test(lower)) s += 6
  if (/learn|read|course|podcast|figured/.test(lower)) s += 4
  return s
}

/** Pick 2–3 wins per month for narrative; prefer concrete, distinctive wins. */
export function curateWinsForMonth(wins: WinWithReviewDate[], max = 3): WinWithReviewDate[] {
  const unique = dedupeWins(wins)
  if (unique.length <= max) return unique

  const scored = unique.map((w) => ({ w, score: scoreWin(w.text) }))
  scored.sort((a, b) => b.score - a.score)

  const picked: WinWithReviewDate[] = []
  for (const { w } of scored) {
    if (picked.length >= max) break
    picked.push(w)
  }
  return picked
}

function monthHeadingFromThemes(
  monthWins: WinWithReviewDate[],
  monthLabel: string,
  usedHooks: Set<string>
): string {
  const monthShort = monthShortFromLabel(monthLabel)
  const themes = detectWinThemes(monthWins.map(toWinWithDate))
  const t0 = themes[0]?.theme

  const hook = hookFromMonthWins(monthWins, usedHooks)
  if (hook) {
    return `${monthShort}: ${hook}`
  }

  if (t0) {
    return `${monthShort}: ${t0} in your wins`
  }
  return `${monthShort}: Showing up`
}

function clipWinSample(w: WinWithReviewDate | undefined): string {
  if (!w) return ''
  const s = w.text.replace(/\s+/g, ' ').trim()
  return s.length > 140 ? `${s.slice(0, 140)}…` : s
}

/** Month blurb: cite themes + a real win line—no shared “thread” template. */
function revelationForMonth(monthWins: WinWithReviewDate[]): string {
  const themes = detectWinThemes(monthWins.map(toWinWithDate))
  const sampleWin = curateWinsForMonth(monthWins, 1)[0]
  const sample = clipWinSample(sampleWin)

  if (themes.length >= 2) {
    const t0 = themes[0]!.theme.toLowerCase()
    const t1 = themes[1]!.theme.toLowerCase()
    return sample
      ? `Wins this month kept naming ${t0} and ${t1}. You wrote, for example: “${sample}”`
      : `Wins this month clustered around ${t0} and ${t1}—see the samples above for your exact words.`
  }
  if (themes.length === 1) {
    const t0 = themes[0]!.theme.toLowerCase()
    return sample
      ? `The strongest signal in what you logged was ${t0}. One line: “${sample}”`
      : `The strongest signal in what you logged was ${t0}.`
  }
  return sample
    ? `This month showed up in what you wrote—e.g. “${sample}”`
    : 'You still logged wins this month—the specifics are in the list above.'
}

function buildTransformation(
  allWins: WinWithReviewDate[],
  goal: string | null
): TransformationThread {
  const themes = detectWinThemes(allWins.map(toWinWithDate))
  const top = themes[0]?.theme
  const second = themes[1]?.theme

  let oldQuestion = '“Am I doing enough?”'
  let newQuestion = '“What’s enough for the life I’m building?”'
  let oldFraming = 'a scoreboard'
  let newFraming = 'a compass'

  if (top === 'Family' || second === 'Family') {
    oldQuestion = '“Do I have to choose between work and home?”'
    newQuestion = '“How do I let both belong in the same week?”'
    oldFraming = 'two teams competing'
    newFraming = 'one life, honestly named'
  } else if (top === 'App / Product' || second === 'App / Product') {
    oldQuestion = '“When will this be finished?”'
    newQuestion = '“What’s the next honest step that moves the product?”'
    oldFraming = 'a finish line you’re chasing'
    newFraming = 'a build you’re iterating with care'
  } else if (top === 'Health') {
    oldQuestion = '“Can I afford to slow down?”'
    newQuestion = '“What pace lets me stay in the game?”'
    oldFraming = 'productivity at any cost'
    newFraming = 'sustainable momentum'
  }

  const g = goal?.trim()
  const body = g
    ? `Across the quarter, your wins kept nudging the same direction — toward “${g.slice(0, 120)}${g.length > 120 ? '…' : ''}.” You weren’t collecting trophies; you were practicing a way of moving.`
    : `Across the quarter, your wins weren’t random — they clustered into a story about what you’re willing to protect while you build.`

  return {
    oldQuestion,
    newQuestion,
    body,
    oldFraming,
    newFraming,
  }
}

function buildCarried(stats: QuarterlyData['stats'], allWins: WinWithReviewDate[]): CarriedStrength[] {
  const themes = detectWinThemes(allWins.map(toWinWithDate))
  const t0 = themes[0]?.theme?.toLowerCase() ?? 'what matters to you'

  const completionRate = stats.totalTasks > 0 ? stats.completedTasks / stats.totalTasks : 0
  const nmRate = stats.needleMovers > 0 ? stats.needleMoversCompleted / stats.needleMovers : 0

  const s1: CarriedStrength = {
    title: 'name your wins without shrinking them',
    detail: `You logged ${allWins.length} win${allWins.length === 1 ? '' : 's'} this quarter — that’s not vanity, it’s evidence. Carry that habit: let the small true things count.`,
  }

  const s2: CarriedStrength =
    stats.needleMovers > 0
      ? {
          title: 'protect a few “needle movers” each week',
          detail: `You completed ${stats.needleMoversCompleted} of ${stats.needleMovers} needle movers — that’s you practicing priority, not panic. Next quarter, keep the list short and honest.`,
        }
      : {
          title: 'keep tasks tethered to meaning',
          detail: `You moved ${stats.completedTasks} task${stats.completedTasks === 1 ? '' : 's'} — even without many labeled needle movers, you were still steering. Next quarter, name what “moves the needle” for you in plain language.`,
        }

  const s3: CarriedStrength = {
    title: `stay close to your ${t0} signal`,
    detail: `Your wins kept echoing ${t0}. When you’re overwhelmed, come back to that pattern in your entries before you add more to the pile.`,
  }

  if (completionRate >= 0.55 && stats.totalTasks >= 8) {
    s1.title = 'follow through on the plan you set'
    s1.detail = `You closed a high share of planned tasks — that’s reliability you can trust. Next quarter, use that same follow-through for rest and relationships, not only output.`
  }

  if (nmRate >= 0.5 && stats.needleMovers >= 4) {
    s2.title = 'let important stay louder than urgent'
    s2.detail = `You moved a strong share of needle movers — that’s the muscle of strategic patience. Keep choosing the few moves that change the trajectory, not just the day.`
  }

  return [s1, s2, s3]
}

function buildSurprise(allWins: WinWithReviewDate[]): SurpriseBlock {
  const blob = allWins.map((w) => w.text).join(' ').toLowerCase()
  if (/calm|patient|pause|breathe|gentle|soft|didn’t yell|did not yell|regulated|steady/.test(blob)) {
    return {
      headline: 'You practiced steadiness when it would’ve been easier to rush or react.',
      body: 'That doesn’t always show up in metrics — but it changes how your people experience you, and how you experience yourself after the hard moments.',
    }
  }
  if (/family|son|daughter|kids|partner|spouse|home|dinner|bedtime/.test(blob)) {
    return {
      headline: 'You let your people show up inside the work story — not as interruptions, but as part of the point.',
      body: 'That’s a quieter kind of leadership: building without pretending you’re alone in it.',
    }
  }
  if (/learn|read|course|podcast|coach|mentor/.test(blob)) {
    return {
      headline: 'You stayed curious even when the to-do list was loud.',
      body: 'Learning in the margins is how founders stay adaptable — not just busy.',
    }
  }
  return {
    headline: 'You kept going when the quarter didn’t hand you a neat narrative.',
    body: 'That stubborn continuity is often what separates a season of drift from a season of direction — even when it feels ordinary.',
  }
}

function buildGuiding(
  goal: string | null,
  themes: { theme: string }[],
  quarterlyIntention: string | null
): GuidingQuestionBlock {
  const top = themes[0]?.theme
  const g = goal?.trim()
  const qi = quarterlyIntention?.trim()

  if (qi) {
    return {
      question: `Against your quarterly intention—“${qi.slice(0, 140)}${qi.length > 140 ? '…' : ''}”—where did this quarter’s wins clearly line up, and where did the week-to-week calendar tell a different story?`,
      explain: 'Use that intention as the yardstick for the next 90 days—not a generic idea of balance.',
    }
  }
  if (g && top) {
    return {
      question: `What would it look like to move toward “${g.slice(0, 100)}${g.length > 100 ? '…' : ''}” while still making room for the ${top.toLowerCase()} wins you keep choosing?`,
      explain: 'This question keeps your next 90 days tied to what you actually log, not a performance of “having it all.”',
    }
  }
  if (g) {
    return {
      question: `Where does “${g.slice(0, 120)}${g.length > 120 ? '…' : ''}” need your courage next — not your hustle?`,
      explain: 'Hold it when you’re choosing what to protect, what to postpone, and what to celebrate.',
    }
  }
  return {
    question: 'What are you willing to protect while you build — even when it’s inconvenient?',
    explain: 'Let this guide what you say yes to, what you say no to, and what you refuse to call “small.”',
  }
}

export function buildQuarterlyNarrative(data: QuarterlyData, profile: QuarterlyUserProfile): QuarterlyNarrative {
  const allWins = data.allWinsFlat
  const goal = profile.primary_goal_text
  const quarterlyIntention = profile.quarterly_intention ?? null

  const monthsWithWins = data.winsByMonth.filter((m) => m.wins.length > 0)
  const usedMonthHooks = new Set<string>()
  const shiftShowedUp: ShiftMonthBlock[] = monthsWithWins.map((m) => {
    const curated = curateWinsForMonth(m.wins, 3)
    return {
      monthLabel: m.label,
      monthKey: m.monthKey,
      heading: monthHeadingFromThemes(m.wins, m.label, usedMonthHooks),
      winSamples: curated.map((w) => w.text),
      revelation: revelationForMonth(m.wins),
    }
  })

  const thread = buildTransformation(allWins, goal)
  const carried = buildCarried(data.stats, allWins)
  const surprise = buildSurprise(allWins)
  const themes = detectWinThemes(allWins.map(toWinWithDate))
  const guiding = buildGuiding(goal, themes, quarterlyIntention)

  if (allWins.length === 0) {
    return {
      shiftShowedUp: [],
      transformationThread: {
        oldQuestion: '“Am I allowed to want more than survival?”',
        newQuestion: '“What would make the next 90 days feel honest?”',
        body: 'You don’t need a pile of wins to be in motion — sometimes the milestone is naming the season you’re in.',
        oldFraming: 'waiting for proof',
        newFraming: 'starting where you are',
      },
      carriedForward: [
        {
          title: 'show up for one honest reflection at a time',
          detail: 'Even a light quarter can be a turning point if you keep the channel open.',
        },
        {
          title: 'name one priority that isn’t negotiable',
          detail: 'Not ten — one. Let that be your compass when the noise returns.',
        },
        {
          title: 'treat gentleness as strategic',
          detail: 'You’re building a life, not just an output graph.',
        },
      ],
      surprise: {
        headline: 'You’re still here — still choosing to look back and steer.',
        body: 'That kind of follow-through is easy to underestimate. It’s also how meaningful quarters begin.',
      },
      guidingQuestion: buildGuiding(goal, [], quarterlyIntention),
    }
  }

  return {
    shiftShowedUp,
    transformationThread: thread,
    carriedForward: carried,
    surprise,
    guidingQuestion: guiding,
  }
}
