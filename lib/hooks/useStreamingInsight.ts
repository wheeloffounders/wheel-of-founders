'use client'

import { useState, useCallback, useRef } from 'react'
import { filterInsightLabels } from '@/lib/insight-utils'
import { getSignedHeadersCached } from '@/lib/api-client'
import type { PostEveningLoopCloseContext } from '@/lib/personal-coaching'

export type StreamingPromptType = 'morning' | 'post_morning' | 'post_evening' | 'emergency'

/** Shape for post_morning override - matches PostMorningOverride in personal-coaching */
export interface PostMorningOverrideParams {
  todayPlan: Array<{ description?: string; needle_mover?: boolean; [k: string]: unknown }>
  todayDecision: { decision: string; decision_type: string } | null
}

/** Shape for post_evening override - matches PostEveningOverride in personal-coaching */
export interface PostEveningOverrideParams {
  todayReview: { wins?: string | null; lessons?: string | null; journal?: string | null; mood?: number | null; energy?: number | null } | null
  todayPlan: Array<{ description?: string; completed?: boolean; needle_mover?: boolean; [k: string]: unknown }>
  loopCloseContext?: PostEveningLoopCloseContext
}

export interface StreamingParams {
  promptType: StreamingPromptType
  userId: string
  promptDate?: string
  emergencyDescription?: string
  severity?: 'hot' | 'warm' | 'contained'
  /** Pass `emergencies.id` so each fire gets its own `personal_prompts` row (multiple per day). */
  emergencyId?: string
  accessToken?: string
  /** For post_morning: pass tasks/decision to avoid DB timing issues */
  postMorningOverride?: PostMorningOverrideParams
  /** For post_evening: pass review/tasks to avoid DB timing issues */
  postEveningOverride?: PostEveningOverrideParams
}

export type StreamInsightOutcome = { ok: true } | { ok: false; error: string }

export interface UseStreamingInsightResult {
  insight: string
  isStreaming: boolean
  error: string | null
  startStream: (
    params: StreamingParams,
    onComplete?: (fullPrompt: string) => void
  ) => Promise<StreamInsightOutcome>
}

/**
 * Hook to fetch personal coaching insights via SSE streaming.
 * Accumulates chunks into insight state; calls onComplete with full prompt when done.
 */
export function useStreamingInsight(): UseStreamingInsightResult {
  const [insight, setInsight] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onCompleteRef = useRef<((fullPrompt: string) => void) | null>(null)

  const startStream = useCallback(async (
    params: StreamingParams,
    onComplete?: (fullPrompt: string) => void
  ): Promise<StreamInsightOutcome> => {
    setIsStreaming(true)
    setError(null)
    setInsight('')
    onCompleteRef.current = onComplete ?? null

    let sseTerminalError: string | null = null
    let completedViaDoneEvent = false

    try {
      const signedHeaders = await getSignedHeadersCached(params.accessToken)
      const payload = {
        promptType: params.promptType,
        userId: params.userId,
        promptDate: params.promptDate,
        emergencyDescription: params.emergencyDescription,
        severity: params.severity,
        emergencyId: params.emergencyId,
        postMorningOverride: params.postMorningOverride,
        postEveningOverride: params.postEveningOverride,
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[StreamingInsight] stream request payload:', JSON.stringify(payload, null, 2))
      }

      let res: Response
      try {
        res = await fetch('/api/personal-coaching/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(params.accessToken && { Authorization: `Bearer ${params.accessToken}` }),
            ...signedHeaders,
          },
          body: JSON.stringify(payload),
        })
      } catch (fetchErr) {
        const raw = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
        const msg =
          /convert value|Response|Failed to fetch|NetworkError/i.test(raw)
            ? 'Network error talking to Mrs. Deer (invalid or blocked response). Your plan is saved — try Retry or a hard refresh.'
            : raw || 'Network request failed'
        console.error('[StreamingInsight] fetch failed:', fetchErr)
        setError(msg)
        return { ok: false, error: msg }
      }

      console.log('[DEBUG] Stream Status:', {
        status: res.status,
        ok: res.ok,
        promptType: params.promptType,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let errMsg = 'Failed to start stream'
        try {
          const data = text ? (JSON.parse(text) as { error?: string; message?: string }) : {}
          errMsg =
            (data as { error?: string; message?: string }).error ||
            (data as { message?: string }).message ||
            text.slice(0, 200) ||
            errMsg
        } catch {
          if (text?.trim()) errMsg = text.trim().slice(0, 280)
        }
        setError(errMsg)
        return { ok: false, error: errMsg }
      }

      const reader = res.body?.getReader()
      if (!reader) {
        const msg = 'No response body'
        setError(msg)
        return { ok: false, error: msg }
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
            continue
          }
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (dataStr === '[DONE]') continue

            try {
              const parsed = JSON.parse(dataStr) as { chunk?: string; prompt?: string; error?: string }
              if (currentEvent === 'chunk' && parsed.chunk) {
                accumulated += parsed.chunk
                setInsight(filterInsightLabels(accumulated))
              } else if (currentEvent === 'done' && parsed.prompt) {
                setInsight(filterInsightLabels(parsed.prompt))
                if (onCompleteRef.current) {
                  try {
                    await Promise.resolve(onCompleteRef.current(parsed.prompt))
                  } catch (completeErr) {
                    console.error('[StreamingInsight] onComplete failed:', completeErr)
                    const msg =
                      completeErr instanceof Error ? completeErr.message : 'Failed after stream completed'
                    setError((prev) => prev ?? msg)
                  }
                }
                completedViaDoneEvent = true
              } else if (currentEvent === 'error' && parsed.error) {
                sseTerminalError = parsed.error
                setError(parsed.error)
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      if (sseTerminalError && !completedViaDoneEvent) {
        return { ok: false, error: sseTerminalError }
      }

      if (!completedViaDoneEvent && accumulated && onCompleteRef.current) {
        try {
          await Promise.resolve(onCompleteRef.current(filterInsightLabels(accumulated)))
        } catch (completeErr) {
          console.error('[StreamingInsight] onComplete (accumulated) failed:', completeErr)
          const msg =
            completeErr instanceof Error ? completeErr.message : 'Failed after stream completed'
          setError((prev) => prev ?? msg)
        }
        completedViaDoneEvent = true
      }

      if (completedViaDoneEvent) {
        return { ok: true }
      }

      const msg = 'No insight received from stream'
      setError(msg)
      return { ok: false, error: msg }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Stream failed'
      const msg = /convert value|Response/i.test(raw)
        ? 'Stream interrupted (bad response). Your plan is saved — try Retry below.'
        : raw
      console.error('[StreamingInsight] stream error:', err)
      setError(msg)
      return { ok: false, error: msg }
    } finally {
      setIsStreaming(false)
      onCompleteRef.current = null
    }
  }, [])

  return { insight, isStreaming, error, startStream }
}
