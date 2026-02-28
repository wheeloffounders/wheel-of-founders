import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { generateProPlusPrompt, PromptType, MorningOverride } from '@/lib/personal-coaching'
import { AIError } from '@/lib/ai-client'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

export async function POST(req: NextRequest) {
  console.log('🟢 PERSONAL COACHING API - Request received')
  console.log('🟢 OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY)
  console.log('🟢 OPENROUTER_API_KEY prefix:', process.env.OPENROUTER_API_KEY?.substring(0, 8))
  console.log('🟢 NODE_ENV:', process.env.NODE_ENV, 'VERCEL_ENV:', process.env.VERCEL_ENV)

  try {
    const body = (await req.json()) as {
      promptType?: PromptType | 'test'
      userId?: string
      promptDate?: string
      emergencyDescription?: string
      severity?: 'hot' | 'warm' | 'contained'
      journal?: string
      mood?: number | null
      energy?: number | null
      wins?: string[]
      lessons?: string[]
      /** For morning: pass yesterday's evening review to avoid DB timing issues */
      morningOverride?: MorningOverride
    }
    const promptType = body.promptType
    let userId = body.userId
    const promptDate = body.promptDate // Format: 'yyyy-MM-dd', optional

    console.log('🟢 Request body:', { promptType, userId: userId?.substring(0, 8) + '...', promptDate })

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
      console.log(`[API] Successfully generated emergency insight (length: ${insight.length} chars)`)
      return NextResponse.json({ prompt: insight })
    }

    // Test handler: debug env vars and Supabase at runtime (no auth required)
    if (promptType === 'test') {
      let supabaseOk = false
      let supabaseError: string | null = null
      try {
        const { getServerSupabase } = await import('@/lib/server-supabase')
        const db = getServerSupabase()
        const { error } = await db.from('personal_prompts').select('id').limit(1)
        supabaseOk = !error
        supabaseError = error?.message ?? null
      } catch (e) {
        supabaseError = e instanceof Error ? e.message : String(e)
      }
      console.log('🟢 [TEST] OPENROUTER_API_KEY:', !!process.env.OPENROUTER_API_KEY)
      console.log('🟢 [TEST] Supabase personal_prompts:', supabaseOk ? 'OK' : 'ERROR: ' + supabaseError)
      return NextResponse.json({
        debug: 'test',
        OPENROUTER_API_KEY_exists: !!process.env.OPENROUTER_API_KEY,
        OPENROUTER_API_KEY_prefix: process.env.OPENROUTER_API_KEY?.substring(0, 8),
        OPENROUTER_MODEL_exists: !!process.env.OPENROUTER_MODEL,
        OPENROUTER_MODEL_value: process.env.OPENROUTER_MODEL,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        supabase_personal_prompts_ok: supabaseOk,
        supabase_error: supabaseError,
      })
    }

    if (!promptType || !['morning', 'post_morning', 'post_evening', 'weekly', 'monthly', 'emergency'].includes(promptType)) {
      return NextResponse.json({ error: 'Invalid prompt type' }, { status: 400 })
    }

    // Verify auth: prefer server session (Bearer token or cookies), fall back to body userId with client session
    const serverSession = await getServerSessionFromRequest(req)
    console.log('🟢 Server session from request:', !!serverSession, 'userId:', serverSession?.user?.id?.substring(0, 8))
    if (serverSession?.user?.id) {
      if (userId && userId !== serverSession.user.id) {
        console.log('🟢 WARNING: userId in body does not match authenticated user')
      }
      userId = serverSession.user.id
    } else if (!userId) {
      const clientSession = await getUserSession()
      console.log('🟢 Fallback getUserSession:', !!clientSession)
      if (!clientSession) {
        console.log('🟢 FAIL: Not authenticated')
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      userId = clientSession.user.id
    }

    console.log('🟢 Calling generateProPlusPrompt:', { promptType, userId: userId.substring(0, 8) + '...', promptDate })
    const prompt = await generateProPlusPrompt(userId, promptType, promptDate, {
      morningOverride: promptType === 'morning' ? body.morningOverride : undefined,
    })
    console.log('🟢 AI response received, length:', prompt?.length, '- returning to client. Check [SAVE INSIGHT] logs for DB insert.')
    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('🟢 API ERROR:', error)
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
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 })
  }
}

