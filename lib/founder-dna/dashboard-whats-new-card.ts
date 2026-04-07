import { badgeWhatsNewMeta, FOUNDER_DNA_FEATURE_META } from '@/lib/founder-dna/feature-links'
import type { RecentMilestonesResult } from '@/lib/milestones/getRecentMilestones'
import type { MilestoneUserContext } from '@/lib/milestones/milestoneMessages'

export type DashboardNewsItem = {
  title: string
  typeLabel: string
  preview: string
  href: string
  icon: string
  isFresh: boolean
}

export type DashboardRotatingCard =
  | { variant: 'insight'; item: DashboardNewsItem }
  | {
      variant: 'milestone'
      badgeNames: string[]
      userContext: MilestoneUserContext
    }
  | { variant: 'missed'; item: DashboardNewsItem }

/** 1 = insights & rhythm refreshes, 2 = badges, 3 = feature unlocks (per product priority). */
type Tier = 1 | 2 | 3

type Candidate = {
  ts: number
  tier: Tier
  typeLabel: string
  text: string
  href: string
  icon: string
  fresh: boolean
  priority: number
}

export function previewSentences(text: string, maxSentences = 3, maxChars = 320): string {
  const clean = text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return ''
  const parts = clean.match(/[^.!?]+[.!?]*/g) ?? [clean]
  const joined = parts.slice(0, maxSentences).join(' ').trim()
  if (joined.length <= maxChars) return joined
  return `${joined.slice(0, maxChars).trim()}...`
}

export function sameDayWhatsNew(value: string | Date, todayStr: string): boolean {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return false
  return d.toISOString().slice(0, 10) === todayStr
}

function pushCandidate(list: Candidate[], candidate: Candidate) {
  if (!Number.isFinite(candidate.ts)) return
  list.push(candidate)
}

function compareCandidates(a: Candidate, b: Candidate): number {
  if (a.tier !== b.tier) return a.tier - b.tier
  if (b.ts !== a.ts) return b.ts - a.ts
  return a.priority - b.priority
}

export type DashboardUnlockRow = {
  unlock_type?: string | null
  unlock_name?: string | null
  unlocked_at?: string | null
}

export type BuildDashboardCardInput = {
  todayStr: string
  nowMs?: number
  milestoneRes: RecentMilestonesResult
  userContext: MilestoneUserContext
  weekly: {
    generated_at?: string | null
    insight_text?: string | null
    unseen_wins_pattern?: string | null
  } | null
  monthly: { generated_at?: string | null; insight_text?: string | null } | null
  quarterly: { generated_at?: string | null; insight_text?: string | null } | null
  profile: { current_streak?: number | null; last_refreshed?: unknown } | null
  unlockRows: DashboardUnlockRow[]
}

export function buildDashboardRotatingCard(input: BuildDashboardCardInput): DashboardRotatingCard {
  const {
    todayStr,
    nowMs = Date.now(),
    milestoneRes,
    userContext,
    weekly,
    monthly,
    quarterly,
    profile,
    unlockRows,
  } = input

  const cutoffTs = nowMs - 7 * 24 * 60 * 60 * 1000
  const candidates: Candidate[] = []

  for (const u of unlockRows) {
    if (!u?.unlocked_at) continue
    const unlockedAt = String(u.unlocked_at)
    const ts = new Date(unlockedAt).getTime()
    if (!Number.isFinite(ts)) continue

    if (u.unlock_type === 'feature') {
      const name = String(u.unlock_name ?? '')
      if (name === 'first_glimpse') continue
      const meta = FOUNDER_DNA_FEATURE_META[name]
      if (!meta) continue
      pushCandidate(candidates, {
        ts,
        tier: 3,
        typeLabel: meta.title,
        text: meta.description,
        href: meta.link,
        icon: meta.icon,
        fresh: sameDayWhatsNew(unlockedAt, todayStr),
        priority: 6,
      })
    } else if (u.unlock_type === 'badge') {
      const name = String(u.unlock_name ?? '')
      if (!name) continue
      const meta = badgeWhatsNewMeta(name)
      pushCandidate(candidates, {
        ts,
        tier: 2,
        typeLabel: `Earned: ${meta.title}`,
        text: meta.description,
        href: meta.link,
        icon: meta.icon,
        fresh: sameDayWhatsNew(unlockedAt, todayStr),
        priority: 5,
      })
    }
  }

  if (weekly?.generated_at) {
    const text = String(weekly.unseen_wins_pattern ?? weekly.insight_text ?? '').trim()
    pushCandidate(candidates, {
      ts: new Date(weekly.generated_at).getTime(),
      tier: 1,
      typeLabel: weekly.unseen_wins_pattern ? 'Unseen Wins' : 'Weekly Insight',
      text,
      href: weekly.unseen_wins_pattern ? '/founder-dna/rhythm' : '/weekly',
      icon: weekly.unseen_wins_pattern ? '✨' : '📅',
      fresh: sameDayWhatsNew(String(weekly.generated_at), todayStr),
      priority: 1,
    })
  }

  if (monthly?.generated_at) {
    pushCandidate(candidates, {
      ts: new Date(monthly.generated_at).getTime(),
      tier: 1,
      typeLabel: 'Monthly Insight',
      text: String(monthly.insight_text ?? '').trim(),
      href: '/monthly-insight',
      icon: '🌙',
      fresh: sameDayWhatsNew(String(monthly.generated_at), todayStr),
      priority: 4,
    })
  }

  if (quarterly?.generated_at) {
    pushCandidate(candidates, {
      ts: new Date(quarterly.generated_at).getTime(),
      tier: 1,
      typeLabel: 'Quarterly Insight',
      text: String(quarterly.insight_text ?? '').trim(),
      href: '/quarterly',
      icon: '📈',
      fresh: sameDayWhatsNew(String(quarterly.generated_at), todayStr),
      priority: 5,
    })
  }

  const lr = profile?.last_refreshed
  const lrObj = lr && typeof lr === 'object' && !Array.isArray(lr) ? (lr as Record<string, unknown>) : {}
  const rhythmEntries: Array<{ key: string; typeLabel: string; icon: string; href: string; priority: number }> = [
    { key: 'your_story', typeLabel: 'Your Story', icon: '📖', href: '/founder-dna/rhythm', priority: 2 },
    { key: 'celebration_gap', typeLabel: 'Celebration Gap', icon: '🪞', href: '/founder-dna/patterns', priority: 3 },
    { key: 'recurring_question', typeLabel: 'Recurring Question', icon: '💫', href: '/founder-dna/patterns', priority: 3 },
  ]
  for (const e of rhythmEntries) {
    const raw = lrObj[e.key]
    if (!raw || typeof raw !== 'object') continue
    const at = String((raw as Record<string, unknown>).at ?? '')
    const snapshot = (raw as Record<string, unknown>).snapshot
    if (!at) continue
    const ts = new Date(at).getTime()
    let text = ''
    if (snapshot && typeof snapshot === 'object') {
      const s = snapshot as Record<string, unknown>
      text = String(s.insight ?? s.intro ?? s.pattern ?? s.lesson ?? '').trim()
    }
    if (!text) text = `${e.typeLabel} has fresh updates based on your recent data.`
    pushCandidate(candidates, {
      ts,
      tier: 1,
      typeLabel: e.typeLabel,
      text,
      href: e.href,
      icon: e.icon,
      fresh: at.slice(0, 10) === todayStr,
      priority: e.priority,
    })
  }

  const todays = candidates.filter((c) => c.fresh).sort(compareCandidates)

  if (todays.length > 0) {
    const latest = todays[0]!
    return {
      variant: 'insight',
      item: {
        title: "What's New Today ✨",
        typeLabel: latest.typeLabel,
        preview: latest.text
          ? previewSentences(latest.text, 3, 320)
          : `Open ${latest.typeLabel} for the full update.`,
        href: latest.href,
        icon: latest.icon,
        isFresh: true,
      },
    }
  }

  if (milestoneRes.hasMilestone && milestoneRes.badges.length > 0) {
    return {
      variant: 'milestone',
      badgeNames: milestoneRes.badges.map((b) => b.unlock_name),
      userContext,
    }
  }

  const latest =
    candidates.filter((c) => c.ts >= cutoffTs).sort(compareCandidates)[0] ?? null

  if (!latest) {
    return {
      variant: 'missed',
      item: {
        title: 'You Might Have Missed',
        typeLabel: 'Latest updates',
        preview:
          'No new updates today. Review insights, badges, and Founder DNA from the last week.',
        href: '/founder-dna/journey',
        icon: '📰',
        isFresh: false,
      },
    }
  }

  return {
    variant: 'missed',
    item: {
      title: 'You Might Have Missed',
      typeLabel: latest.typeLabel,
      preview: latest.text
        ? previewSentences(latest.text, 3, 320)
        : `Open ${latest.typeLabel} for the full update.`,
      href: latest.href,
      icon: latest.icon,
      isFresh: false,
    },
  }
}
