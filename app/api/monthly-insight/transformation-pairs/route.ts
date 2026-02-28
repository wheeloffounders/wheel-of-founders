import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { generateAIPrompt, AIError } from '@/lib/ai-client'
import { PARSE_INSTRUCTION } from '@/lib/insight-parse-instructions'

const SYSTEM_PROMPT = `You are a thoughtful coach helping founders see their growth. You extract meaningful before/after pairs from messy journal entries.

${PARSE_INSTRUCTION}

Your job:
1. Parse each entry into separate themes (e.g. "App debugging, son had great day, revisit approach" → 3 themes)
2. Group themes across entries (app-related, family-related, personal growth, etc.)
3. Match "before" (lesson/challenge) with "after" (win) within the same theme only
4. Only return pairs that make sense—don't force mismatched snippets

Return valid JSON only: an array of objects with "start" (the before/challenge) and "now" (the after/win). Max 5 pairs. If no meaningful pairs exist, return [].`

export interface TransformationPair {
  start: string
  now: string
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as { wins: string[]; lessons: string[] }
    const { wins = [], lessons = [] } = body

    if (wins.length === 0 && lessons.length === 0) {
      return NextResponse.json({ pairs: [] })
    }

    const winsBlock = wins.length > 0 ? wins.map((w) => `- ${w}`).join('\n') : '(none)'
    const lessonsBlock = lessons.length > 0 ? lessons.map((l) => `- ${l}`).join('\n') : '(none)'

    const userPrompt = `Parse these entries and create meaningful before/after transformation pairs.

LESSONS (challenges, realizations, "before" state):
${lessonsBlock}

WINS (progress, breakthroughs, "after" state):
${winsBlock}

Instructions:
- Break multi-thought entries into separate themes
- Group by theme (app, family, discipline, work, self-care, etc.)
- Match before→after within each theme. A lesson about "yelling drains" could pair with a win about "patience with son"
- Use the user's actual words—shorten to ~80 chars if needed
- Return ONLY valid JSON: [{"start":"...","now":"..."}]
- If no clear pairs, return []`

    const raw = await generateAIPrompt({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 600,
      temperature: 0.5,
    })

    // Extract JSON from response (AI might wrap in markdown)
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    const jsonStr = jsonMatch ? jsonMatch[0] : raw
    let pairs: TransformationPair[] = []
    try {
      const parsed = JSON.parse(jsonStr)
      if (Array.isArray(parsed)) {
        pairs = parsed
          .filter((p: unknown) => p && typeof p === 'object' && 'start' in p && 'now' in p)
          .map((p: { start: string; now: string }) => ({
            start: String(p.start).slice(0, 100),
            now: String(p.now).slice(0, 100),
          }))
          .slice(0, 5)
      }
    } catch {
      console.error('[transformation-pairs] Failed to parse AI response:', raw?.slice(0, 200))
    }

    return NextResponse.json({ pairs })
  } catch (error) {
    console.error('[transformation-pairs] Error:', error)
    if (error instanceof AIError) {
      return NextResponse.json(
        {
          error: error.message,
          aiError: true,
          model: error.model,
          status: error.status,
          statusText: error.statusText,
          openRouterError: error.openRouterError,
        },
        { status: 502 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate pairs' },
      { status: 500 }
    )
  }
}
