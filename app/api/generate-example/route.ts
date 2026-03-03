import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { generateAIPrompt } from '@/lib/ai-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const PROMPTS: Record<string, (goal: string) => string> = {
  decision: (goal) =>
    `Generate a realistic decision example for a founder whose primary goal is: "${goal}". The example should be specific to their goal and sound like something they might actually decide. Return ONLY the example text, no quotes, no explanation. Max 10 words.`,
  task: (goal) =>
    `Generate a realistic task example for a founder whose primary goal is: "${goal}". The task should be specific to their goal and sound like something they'd write. Return ONLY the task text, no quotes, no explanation. Max 8 words.`,
  action: (goal) =>
    `Generate a realistic action plan description for a founder whose primary goal is: "${goal}". The description should be specific to their goal (e.g., for "My Zone" deep work). Return ONLY the description text, no quotes, no explanation. Max 12 words.`,
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { type, goal } = body as { type?: string; goal?: string }

    if (!type || !goal || typeof goal !== 'string' || goal.trim().length === 0) {
      return NextResponse.json({ error: 'Missing type or goal' }, { status: 400 })
    }

    const promptFn = PROMPTS[type]
    if (!promptFn) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const example = await generateAIPrompt({
      systemPrompt: 'You are a helpful assistant that generates realistic examples for founders. Output only the requested text, nothing else.',
      userPrompt: promptFn(goal.trim()),
      maxTokens: 40,
      temperature: 0.7,
    })

    return NextResponse.json({ example: example?.trim() || null })
  } catch (error) {
    console.error('[generate-example] Error:', error)
    return NextResponse.json({ error: 'Failed to generate example', example: null }, { status: 500 })
  }
}
