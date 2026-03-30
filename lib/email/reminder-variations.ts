/**
 * Morning & evening reminder copy (20 variants each), selection weights, and render helpers.
 */

import { emailGreetingFromDisplayString } from '@/lib/email/personalization'

export type ReminderKind = 'morning' | 'evening'

export type ReminderVariationParams = {
  displayName: string
  streak: number
  recentTheme?: string
  recentIntention?: string
}

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function safeTheme(p: ReminderVariationParams): string {
  const t = (p.recentTheme || '').trim()
  return t ? esc(t.slice(0, 120)) : ''
}

function safeIntention(p: ReminderVariationParams): string {
  const t = (p.recentIntention || '').trim()
  return t ? esc(t.slice(0, 120)) : ''
}

function streakPhrase(n: number): string {
  return String(Math.max(0, Math.floor(n)))
}

/** Eligibility for a 1-based variation id */
function isReminderVariationEligible(
  kind: ReminderKind,
  id: number,
  ctx: { streak: number; hasRecentTheme: boolean; hasRecentIntention: boolean }
): boolean {
  if (id < 1 || id > 20) return false
  if (kind === 'morning') {
    if (id >= 5 && id <= 8) return ctx.streak >= 3
    if (id === 9) return ctx.hasRecentTheme
    return true
  }
  if (id >= 9 && id <= 12) return ctx.streak >= 3
  if (id === 13) return ctx.hasRecentIntention
  if (id === 14) return ctx.hasRecentTheme
  return true
}

function weightFor(
  kind: ReminderKind,
  id: number,
  ctx: {
    streak: number
    hasRecentTheme: boolean
    hasRecentIntention: boolean
    dayOfWeek: number
  }
): number {
  let w = 1
  const { streak, hasRecentTheme, hasRecentIntention, dayOfWeek } = ctx

  if (kind === 'morning') {
    if (dayOfWeek === 1 && id >= 1 && id <= 4) w *= 1.85
    if (dayOfWeek === 5 && id >= 13 && id <= 16) w *= 1.85
    if (dayOfWeek === 0 && id >= 17 && id <= 20) w *= 1.35
    if (streak >= 3 && id >= 5 && id <= 8) w *= 1.45
    if (hasRecentTheme && id >= 9 && id <= 12) w *= 1.35
  } else {
    if (dayOfWeek === 1 && id >= 5 && id <= 8) w *= 1.85
    if (dayOfWeek === 5 && id >= 17 && id <= 20) w *= 1.85
    if (dayOfWeek === 0 && id >= 1 && id <= 4) w *= 1.35
    if (streak >= 3 && id >= 9 && id <= 12) w *= 1.45
    if ((hasRecentIntention || hasRecentTheme) && id >= 13 && id <= 16) w *= 1.35
  }
  return w
}

/**
 * Pick 1–20 with weighted themes, avoiding `blocked` when possible.
 */
export function pickReminderVariationId(args: {
  kind: ReminderKind
  streak: number
  hasRecentTheme: boolean
  hasRecentIntention: boolean
  dayOfWeek: number
  blocked: Set<number>
  random: () => number
}): number {
  const ctx = {
    streak: args.streak,
    hasRecentTheme: args.hasRecentTheme,
    hasRecentIntention: args.hasRecentIntention,
    dayOfWeek: args.dayOfWeek,
  }
  const base = Array.from({ length: 20 }, (_, i) => i + 1)
  let pool = base.filter((id) => !args.blocked.has(id))
  if (pool.length === 0) pool = base

  let eligible = pool.filter((id) => isReminderVariationEligible(args.kind, id, ctx))
  if (eligible.length === 0) {
    eligible = base.filter((id) => isReminderVariationEligible(args.kind, id, ctx))
  }
  if (eligible.length === 0) return 1

  const weights = eligible.map((id) => weightFor(args.kind, id, ctx))
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = args.random() * sum
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i]
    if (r <= 0) return eligible[i]
  }
  return eligible[eligible.length - 1]
}

function morningBody(id: number, p: ReminderVariationParams): string {
  const dn = esc(p.displayName)
  const st = streakPhrase(p.streak)
  const rt = safeTheme(p)
  switch (id) {
    case 1:
      return `Before the day pulls you in too many directions, let's anchor on one thing: What's the one task that would make today feel like progress? I'll check in tonight.`
    case 2:
      return `What's the one thing you're committed to today, ${dn}? Not everything — just the thing that matters most.`
    case 3:
      return `If today had only one priority, what would it be? Name it. I'll hold you to it.`
    case 4:
      return `Let's start simple: What's the first step that would make today feel like movement?`
    case 5:
      return `${st} days in a row. You're becoming someone who shows up. What's today's anchor?`
    case 6:
      return `Consistency is quiet until it isn't. ${st} days — that's becoming a rhythm. What's today's intention?`
    case 7:
      return `You've been showing up. Today, let that momentum carry you. What's one thing you want to build on?`
    case 8:
      return `Yesterday built something. Today, let's add to it. What's next?`
    case 9:
      return `I noticed something in what you wrote recently: “${rt}”. I'm curious — how does that thread continue today?`
    case 10:
      return `What's one thing you want to discover about yourself today? Not achieve — discover.`
    case 11:
      return `If today was an experiment, what would you test?`
    case 12:
      return `What question are you carrying into today? Let's see where it leads.`
    case 13:
      return `Some days the plan is clear. Some days it's not. Either way, naming one thing makes it real. What's yours?`
    case 14:
      return `No need for a perfect plan. What's one honest step that counts today?`
    case 15:
      return `What's the smallest step that would make today feel like progress? Start there.`
    case 16:
      return `If you only had energy for one thing today, what would it be? Let that be enough.`
    case 17:
      return `What kind of founder do you want to be today? The one who plans? The one who acts? The one who trusts the process? Choose one.`
    case 18:
      return `Every day, you're becoming someone. What's one choice today that aligns with who you want to become?`
    case 19:
      return `Today is a page in your founder story. What do you want it to say?`
    case 20:
      return `Not every day needs a hero moment. Sometimes showing up is enough. You're doing that. What's today's quiet intention?`
    default:
      return morningBody(1, p)
  }
}

function eveningBody(id: number, p: ReminderVariationParams): string {
  const st = streakPhrase(p.streak)
  const rt = safeTheme(p)
  const ri = safeIntention(p)
  switch (id) {
    case 1:
      return `You started today with a plan. Now I'm curious — what actually happened? The wins, the lessons, the moments you might otherwise forget.`
    case 2:
      return `What went well today? Even the small things count. I'll hold the wins you share.`
    case 3:
      return `Before the day slips away, let's capture what mattered. One win. One lesson. That's all it takes.`
    case 4:
      return `What surprised you today? The unexpected moments often hold the most.`
    case 5:
      return `Not every day goes as planned. That's not failure — it's data. What did today teach you?`
    case 6:
      return `What would you do differently if today repeated? No judgment — just curiosity.`
    case 7:
      return `What's one thing today revealed about how you work, decide, or show up?`
    case 8:
      return `The messy moments often teach the most. What did today's mess teach you?`
    case 9:
      return `${st} days. That's not luck — that's you showing up. What did today build?`
    case 10:
      return `Another day down. You're building something rare: consistency. What's one thing today added to the foundation?`
    case 11:
      return `Day ${st} of becoming someone who reflects. What's one insight from today you want to carry forward?`
    case 12:
      return `You showed up again. That's the hardest part. What did today reveal about why you keep going?`
    case 13:
      return `I remember you set out with “${ri}” today. How did it go? What surprised you?`
    case 14:
      return `Earlier, you mentioned “${rt}”. How did that thread show up today?`
    case 15:
      return `What question did today answer? What new question did it leave you with?`
    case 16:
      return `If you could tell your morning self one thing, what would it be?`
    case 17:
      return `The day is winding down. Before it slips away, let's capture what mattered. One moment. That's enough.`
    case 18:
      return `You don't need a perfect reflection. Just one honest thought. What's on your mind?`
    case 19:
      return `What are you carrying from today into tomorrow? Let's name it.`
    case 20:
      return `Rest is part of the work. Before you close the day, what's one thing you want to remember?`
    default:
      return eveningBody(1, p)
  }
}

function morningSubject(id: number, p: ReminderVariationParams): string {
  const dn = p.displayName.trim() || 'Founder'
  const st = streakPhrase(p.streak)
  const themes: Record<number, string> = {
    1: `☀️ ${dn}, anchor today's focus`,
    2: `☀️ One commitment for today, ${dn}`,
    3: `☀️ ${dn}, what's the one priority?`,
    4: `☀️ ${dn}, one step for movement today`,
    5: `☀️ ${st} days strong — what's today's anchor?`,
    6: `☀️ ${dn}, you're building rhythm`,
    7: `☀️ Momentum is yours — morning check-in`,
    8: `☀️ ${dn}, what's next today?`,
    9: `☀️ ${dn}, following your thread today`,
    10: `☀️ What will you discover today?`,
    11: `☀️ ${dn}, today's experiment`,
    12: `☀️ A question for your morning`,
    13: `☀️ ${dn}, one honest thing today`,
    14: `☀️ Keep it simple this morning`,
    15: `☀️ Smallest step, biggest truth`,
    16: `☀️ ${dn}, enough is enough`,
    17: `☀️ Who are you being today?`,
    18: `☀️ ${dn}, one aligned choice`,
    19: `☀️ Today's page in your story`,
    20: `☀️ Quiet intention, ${dn}`,
  }
  return themes[id] || themes[1]
}

function eveningSubject(id: number, p: ReminderVariationParams): string {
  const dn = p.displayName.trim() || 'Founder'
  const st = streakPhrase(p.streak)
  const themes: Record<number, string> = {
    1: `🌙 ${dn}, how did today go?`,
    2: `🌙 Wins from today?`,
    3: `🌙 ${dn}, capture what mattered`,
    4: `🌙 What surprised you today?`,
    5: `🌙 ${dn}, what did today teach you?`,
    6: `🌙 A gentle replay of today`,
    7: `🌙 ${dn}, what showed up today?`,
    8: `🌙 Lessons from the messy bits`,
    9: `🌙 ${st} days — what did you build today?`,
    10: `🌙 Consistency counts — evening check-in`,
    11: `🌙 Day ${st} of showing up`,
    12: `🌙 ${dn}, why you keep going`,
    13: `🌙 How did your intention land?`,
    14: `🌙 ${dn}, that thread you named`,
    15: `🌙 Questions from today`,
    16: `🌙 A note to morning-you`,
    17: `🌙 ${dn}, before the day slips away`,
    18: `🌙 One honest thought`,
    19: `🌙 Carrying today forward`,
    20: `🌙 ${dn}, rest & remember`,
  }
  return themes[id] || themes[1]
}

export function buildReminderVariationEmailParts(args: {
  kind: ReminderKind
  variationId: number
  params: ReminderVariationParams
}): { variationId: number; subject: string; openingParagraph: string; preheader: string } {
  const { kind, variationId, params } = args
  const id = variationId >= 1 && variationId <= 20 ? variationId : 1
  const dnRaw = params.displayName.trim()
  const displayName =
    emailGreetingFromDisplayString(dnRaw) || (dnRaw || 'Founder')
  const paramsNorm: ReminderVariationParams = { ...params, displayName }
  const opening = kind === 'morning' ? morningBody(id, paramsNorm) : eveningBody(id, paramsNorm)
  const subject = kind === 'morning' ? morningSubject(id, paramsNorm) : eveningSubject(id, paramsNorm)
  const preheader = opening.replace(/\s+/g, ' ').slice(0, 140)
  return {
    variationId: id,
    subject,
    openingParagraph: opening,
    preheader,
  }
}
