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

const MONTH_HEADING: Record<string, string> = {
  Family: 'When life had a seat at the table',
  'App / Product': 'When you built in the open',
  Community: 'When you reached outward',
  Health: 'When you protected your energy',
  Work: 'When you moved the business',
  Learning: 'When you learned out loud',
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

function monthHeadingFromThemes(monthWins: WinWithReviewDate[], monthLabel: string): string {
  const themes = detectWinThemes(monthWins.map(toWinWithDate))
  const t0 = themes[0]?.theme
  if (t0 && MONTH_HEADING[t0]) return `${monthLabel}: ${MONTH_HEADING[t0]}`
  if (t0) return `${monthLabel}: ${t0} in focus`
  return `${monthLabel}: Showing up`
}

function revelationForMonth(monthWins: WinWithReviewDate[]): string {
  const themes = detectWinThemes(monthWins.map(toWinWithDate))
  if (themes.length >= 2) {
    return `The thread underneath wasn’t just ${themes[0].theme.toLowerCase()} — it was how ${themes[1].theme.toLowerCase()} kept showing up beside it. That’s becoming, not juggling.`
  }
  if (themes.length === 1) {
    return `The real shift was quieter than the headlines: you kept returning to ${themes[0].theme.toLowerCase()} until it felt like yours, not a phase.`
  }
  return `Between the lines, you were practicing consistency — the kind that doesn’t need applause to count.`
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
    title: `stay close to your ${t0} thread`,
    detail: `Your wins kept echoing ${t0}. That’s not a label — it’s a lever. When you’re overwhelmed, come back to that thread before you add more to the pile.`,
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

function buildGuiding(goal: string | null, themes: { theme: string }[]): GuidingQuestionBlock {
  const top = themes[0]?.theme
  const g = goal?.trim()
  if (g && top) {
    return {
      question: `What would it look like to move toward “${g.slice(0, 100)}${g.length > 100 ? '…' : ''}” in a way that honors your ${top.toLowerCase()} thread — not as an extra, but as part of the strategy?`,
      explain: 'This question keeps your next 90 days from becoming a pile of tasks that forget what you’re building for.',
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

  const monthsWithWins = data.winsByMonth.filter((m) => m.wins.length > 0)
  const shiftShowedUp: ShiftMonthBlock[] = monthsWithWins.map((m) => {
    const curated = curateWinsForMonth(m.wins, 3)
    return {
      monthLabel: m.label,
      monthKey: m.monthKey,
      heading: monthHeadingFromThemes(m.wins, m.label),
      winSamples: curated.map((w) => w.text),
      revelation: revelationForMonth(m.wins, m.monthKey),
    }
  })

  const thread = buildTransformation(allWins, goal)
  const carried = buildCarried(data.stats, allWins)
  const surprise = buildSurprise(allWins)
  const themes = detectWinThemes(allWins.map(toWinWithDate))
  const guiding = buildGuiding(goal, themes)

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
      guidingQuestion: buildGuiding(goal, []),
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
