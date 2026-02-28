/**
 * Streaming personal coaching API - uses DeepSeek for speed, streams response.
 * Use for daily insights (evening, morning, post_morning, emergency) to avoid 504 timeouts.
 */
import { NextRequest } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { generateProPlusPrompt, generateEmergencyInsight, PromptType, PostMorningOverride, PostEveningOverride } from '@/lib/personal-coaching'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STREAM_TYPES: PromptType[] = ['morning', 'post_morning', 'post_evening', 'emergency']

function sseMessage(event: string, data: unknown): string {
  const payload = typeof data === 'string' ? data : JSON.stringify(data)
  return event ? `event: ${event}\ndata: ${payload}\n\n` : `data: ${payload}\n\n`
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      promptType?: PromptType
      userId?: string
      promptDate?: string
      stream?: boolean
      emergencyDescription?: string
      severity?: 'hot' | 'warm' | 'contained'
      /** For post_morning: pass tasks/decision to avoid DB timing issues */
      postMorningOverride?: PostMorningOverride
      /** For post_evening: pass review/tasks to avoid DB timing issues */
      postEveningOverride?: PostEveningOverride
    }

    const promptType = body.promptType
    let userId = body.userId
    const promptDate = body.promptDate

    if (!promptType || !STREAM_TYPES.includes(promptType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or unsupported prompt type for streaming' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const serverSession = await getServerSessionFromRequest(req)
    if (serverSession?.user?.id) {
      userId = serverSession.user.id
    }
    if (!userId) {
      const { getUserSession } = await import('@/lib/auth')
      const sess = await getUserSession()
      if (!sess) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
      }
      userId = sess.user.id
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const onChunk = (chunk: string) => {
            controller.enqueue(encoder.encode(sseMessage('chunk', { chunk })))
          }

          let prompt: string

          if (promptType === 'emergency' && body.emergencyDescription && body.severity) {
            prompt = await generateEmergencyInsight(userId!, body.emergencyDescription, body.severity, promptDate, onChunk)
          } else {
            prompt = await generateProPlusPrompt(userId!, promptType, promptDate, {
              onChunk,
              postMorningOverride: promptType === 'post_morning' ? body.postMorningOverride : undefined,
              postEveningOverride: promptType === 'post_evening' ? body.postEveningOverride : undefined,
            })
          }

          controller.enqueue(encoder.encode(sseMessage('done', { prompt })))
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to generate'
          controller.enqueue(encoder.encode(sseMessage('error', { error: msg })))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[Personal Coaching Stream] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
