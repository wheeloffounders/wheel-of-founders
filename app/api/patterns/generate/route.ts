import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { generateAIPrompt } from '@/lib/ai-client'
import { subDays } from 'date-fns'
import { detectProcrastinationPatterns } from '@/lib/pattern-detection/procrastination'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function parseJSONField(field: unknown): string[] {
  if (field == null) return []
  try {
    if (typeof field === 'string' && field.startsWith('[')) {
      const parsed = JSON.parse(field)
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string' && !!s?.trim()) : []
    }
    if (Array.isArray(field)) {
      return field.filter((s): s is string => typeof s === 'string' && !!s?.trim())
    }
    return typeof field === 'string' && field.trim() ? [field.trim()] : []
  } catch {
    return typeof field === 'string' && field.trim() ? [field.trim()] : []
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

    let userId: string | null = null
    if (isCron) {
      const body = await request.json().catch(() => ({}))
      userId = (body as { userId?: string }).userId ?? null
      if (!userId) {
        return NextResponse.json({ error: 'userId required for cron' }, { status: 400 })
      }
    } else {
      const session = await getServerSessionFromRequest(request)
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id
    }

    const db = getServerSupabase()
    const twoWeeksAgo = subDays(new Date(), 14).toISOString().split('T')[0]

    const { data: reviews, error } = await db
      .from('evening_reviews')
      .select('wins, lessons, journal, review_date')
      .eq('user_id', userId)
      .gte('review_date', twoWeeksAgo)
      .order('review_date', { ascending: false })

    if (error) throw error

    const entries = (reviews ?? [])
      .map((r: { wins?: unknown; lessons?: unknown; journal?: string | null; review_date: string }) => {
        const wins = parseJSONField(r.wins)
        const lessons = parseJSONField(r.lessons)
        return {
          date: r.review_date,
          wins,
          lessons,
          journal: r.journal?.trim() ?? '',
        }
      })
      .filter(
        (e: { wins: string[]; lessons: string[]; journal: string }) =>
          e.wins.length > 0 || e.lessons.length > 0 || !!e.journal
      )

    if (entries.length === 0) {
      return NextResponse.json({ pattern: null })
    }

    const formattedEntries = entries
      .map(
        (e: { date: string; wins: string[]; lessons: string[]; journal: string }) => `
Date: ${e.date}
Wins: ${e.wins.join('; ')}
Lessons: ${e.lessons.join('; ')}
Journal: ${e.journal || ''}
`
      )
      .join('\n---\n')

    const procrastinationData = await detectProcrastinationPatterns(userId, { days: 14 })

    const systemPrompt = `You are Mrs. Deer, a warm, intuitive coach. Your task is to find ONE hidden pattern in this founder's recent entries.

Look for what's NOT obvious. Don't just summarize what they wrote. Find the thread they might be missing.

CRITICAL RULES:
- Your response must be a SINGLE, COMPLETE paragraph
- DO NOT cut off mid-sentence
- The last sentence MUST end with proper punctuation (. or ! or ?)
- If you're running out of space, make your point more concisely rather than cutting off
- Quality over quantity - a shorter complete thought is better than a longer cut-off one

You may use **bold** for emphasis and *italics* for nuance.

Here is data about this user's task postponement patterns over the last 14 days:
- They've postponed ${procrastinationData.overallStats.totalPostponements} tasks
${procrastinationData.overallStats.mostPostponedTask ? `- Their most postponed task is \"${procrastinationData.overallStats.mostPostponedTask.description}\" (${procrastinationData.overallStats.mostPostponedTask.count} times)` : ''}
- ${procrastinationData.overallStats.needleMoverPostponeRate}% of postponed tasks were needle movers

If relevant, you may gently weave this into your pattern. Be curious, not judgmental.

Examples of good patterns:
- "You keep mentioning your son in your wins. Not just as a distraction, but as part of your momentum."
- "There's a tension between **building** and **being present** that you're starting to name."
- "You're logging *rest* as a win now. That's new. That's growth."

Rules:
- Be specific. Quote their words.
- Don't state the obvious.
- One pattern only. Complete paragraph.
- Warm, curious, never judgmental.`

    const userPrompt = `Here are their entries from the last 14 days:

${formattedEntries}

What ONE hidden pattern do you notice?`

    let pattern = (
      await generateAIPrompt({
        systemPrompt,
        userPrompt,
        maxTokens: 250,
        temperature: 0.7,
      })
    ).trim()

    if (pattern.endsWith('—')) {
      pattern = pattern.slice(0, -1).trim()
    }
    if (pattern && !pattern.match(/[.!?]$/)) {
      pattern += '.'
    }

    return NextResponse.json({ pattern })
  } catch (error) {
    console.error('[Pattern Generate] Error:', error)
    return NextResponse.json({ error: 'Failed to generate pattern' }, { status: 500 })
  }
}
