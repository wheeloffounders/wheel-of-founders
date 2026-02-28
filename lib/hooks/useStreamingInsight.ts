'use client'

import { useState, useCallback, useRef } from 'react'
import { filterInsightLabels } from '@/lib/insight-utils'

export type StreamingPromptType = 'morning' | 'post_morning' | 'post_evening' | 'emergency'

/** Shape for post_morning override - matches PostMorningOverride in personal-coaching */
export interface PostMorningOverrideParams {
  todayPlan: Array<{ description?: string; needle_mover?: boolean; [k: string]: unknown }>
  todayDecision: { decision: string; decision_type: string; why_this_decision?: string | null } | null
}

/** Shape for post_evening override - matches PostEveningOverride in personal-coaching */
export interface PostEveningOverrideParams {
  todayReview: { wins?: string | null; lessons?: string | null; journal?: string | null; mood?: number | null; energy?: number | null } | null
  todayPlan: Array<{ description?: string; completed?: boolean; needle_mover?: boolean; [k: string]: unknown }>
}

export interface StreamingParams {
  promptType: StreamingPromptType
  userId: string
  promptDate?: string
  emergencyDescription?: string
  severity?: 'hot' | 'warm' | 'contained'
  accessToken?: string
  /** For post_morning: pass tasks/decision to avoid DB timing issues */
  postMorningOverride?: PostMorningOverrideParams
  /** For post_evening: pass review/tasks to avoid DB timing issues */
  postEveningOverride?: PostEveningOverrideParams
}

export interface UseStreamingInsightResult {
  insight: string
  isStreaming: boolean
  error: string | null
  startStream: (params: StreamingParams, onComplete?: (fullPrompt: string) => void) => Promise<void>
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
  ) => {
    setIsStreaming(true)
    setError(null)
    setInsight('')
    onCompleteRef.current = onComplete ?? null

    try {
      const res = await fetch('/api/personal-coaching/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(params.accessToken && { Authorization: `Bearer ${params.accessToken}` }),
        },
        body: JSON.stringify({
          promptType: params.promptType,
          userId: params.userId,
          promptDate: params.promptDate,
          emergencyDescription: params.emergencyDescription,
          severity: params.severity,
          postMorningOverride: params.postMorningOverride,
          postEveningOverride: params.postEveningOverride,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errMsg = (data as { error?: string }).error || 'Failed to start stream'
        setError(errMsg)
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setError('No response body')
        setIsStreaming(false)
        return
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
                onCompleteRef.current?.(parsed.prompt)
              } else if (currentEvent === 'error' && parsed.error) {
                setError(parsed.error)
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      if (accumulated && onCompleteRef.current) {
        onCompleteRef.current(filterInsightLabels(accumulated))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream failed')
    } finally {
      setIsStreaming(false)
      onCompleteRef.current = null
    }
  }, [])

  return { insight, isStreaming, error, startStream }
}
