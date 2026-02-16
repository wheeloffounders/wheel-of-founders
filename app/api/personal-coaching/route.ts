import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { generateProPlusPrompt, PromptType } from '@/lib/personal-coaching'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { 
      promptType?: PromptType; 
      userId?: string; 
      promptDate?: string;
      emergencyDescription?: string;
      severity?: 'hot' | 'warm' | 'contained';
    }
    const promptType = body.promptType
    let userId = body.userId
    const promptDate = body.promptDate // Format: 'yyyy-MM-dd', optional

    // Handle emergency insights (special case)
    if (body.emergencyDescription && body.severity) {
      const { generateEmergencyInsight } = await import('@/lib/personal-coaching')
      if (!userId) {
        const session = await getUserSession()
        if (!session) {
          return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        userId = session.user.id
      }
      const emergencyDate = body.promptDate || format(new Date(), 'yyyy-MM-dd')
      console.log(`[API] Generating emergency insight for user ${userId} for date ${emergencyDate}`)
      const insight = await generateEmergencyInsight(userId, body.emergencyDescription, body.severity, emergencyDate)
      if (!insight) {
        return NextResponse.json({ error: 'No insight generated' }, { status: 500 })
      }
      console.log(`[API] Successfully generated emergency insight (length: ${insight.length} chars)`)
      return NextResponse.json({ prompt: insight })
    }

    if (!promptType || !['morning', 'post_morning', 'post_evening', 'weekly', 'monthly', 'emergency'].includes(promptType)) {
      return NextResponse.json({ error: 'Invalid prompt type' }, { status: 400 })
    }

    // Prefer explicit userId from client (already authenticated via Supabase JS),
    // but fall back to server-side session when available.
    if (!userId) {
      const session = await getUserSession()
      if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      userId = session.user.id
    }

    console.log(`[API] Generating ${promptType} prompt for user ${userId}${promptDate ? ` for date ${promptDate}` : ''}`)
    const prompt = await generateProPlusPrompt(userId, promptType, promptDate)

    if (!prompt) {
      console.error(`[API] No prompt generated for ${promptType}`)
      return NextResponse.json({ error: 'No prompt generated' }, { status: 500 })
    }

    console.log(`[API] Successfully generated ${promptType} prompt (length: ${prompt.length} chars) - check [SAVE INSIGHT] logs for DB insert`)
    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('[API] Error generating personal coaching prompt:', error)
    if (error instanceof Error) {
      console.error('[API] Error details:', error.message, error.stack)
    }
    return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 })
  }
}

