/**
 * OpenRouter AI Client - Claude-first fallback chain.
 * Tries anthropic/claude-sonnet-4.6 first (newer, cheaper, better),
 * falls back to deepseek/deepseek-chat if Claude fails.
 */

export class AIError extends Error {
  constructor(
    message: string,
    public readonly model: string,
    public readonly status?: number,
    public readonly statusText?: string,
    public readonly openRouterError?: string
  ) {
    super(message)
    this.name = 'AIError'
  }
}

/** Timeout for OpenRouter API. Vercel default maxDuration is 10s; increase in vercel.json if needed. */
const AI_REQUEST_TIMEOUT_MS = 8000

/** Try models in order - DeepSeek first for speed (2-3s), Claude fallback for quality */
const MODELS = [
  'deepseek/deepseek-chat',       // Fast - primary for daily insights (avoids 504)
  'anthropic/claude-sonnet-4.6',  // Slower but higher quality - fallback
]

interface AIGenerateOptions {
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
}

/**
 * Generate AI response using OpenRouter. Tries Claude first, then DeepSeek.
 * Throws AIError with full details if all models fail.
 */
export async function generateAIPrompt({
  systemPrompt,
  userPrompt,
  maxTokens = 200,
  temperature = 0.7,
}: AIGenerateOptions): Promise<string> {
  if (typeof window !== 'undefined') {
    throw new AIError(
      '[AI ERROR] Called from client (window defined). AI runs server-side only.',
      MODELS[0],
      undefined,
      undefined,
      'Client-side execution'
    )
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  console.log('[AI DEBUG] Using API key starting with:', apiKey?.substring(0, 8))
  if (!apiKey) {
    throw new AIError(
      '[AI ERROR] OPENROUTER_API_KEY not found. Check .env.local and Vercel env vars.',
      MODELS[0],
      undefined,
      undefined,
      'Missing API key'
    )
  }

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ]

  let lastError: AIError | Error | null = null

  for (const model of MODELS) {
  console.log(`[AI DEBUG] Trying model: ${model}`)
  console.log(`[AI DEBUG] Prompt length: ${userPrompt.length} chars, approx ${Math.ceil(userPrompt.length / 4)} tokens`)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'Wheel of Founders',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      })
    console.log(`[AI DEBUG] Model ${model} responded with status: ${response.status}`)

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = (await response.json()) as {
          error?: { message?: string }
          choices?: Array<{ message?: { content?: string } }>
        }

        if (data.error) {
          console.log(`[AI DEBUG] Model ${model} returned error:`, data.error)        
  lastError = new AIError(
            `[AI ERROR] Model ${model} returned error: ${data.error.message}`,
            model,
            undefined,
            undefined,
            data.error.message
          )
          console.warn(`[AI] Model ${model} returned error, trying next...`)
          continue
        }

        const content = data.choices?.[0]?.message?.content?.trim()
        if (content) {
          // Detect cutoff: if ends mid-sentence (no . ! ? "), may be truncated
          const lastChar = content.slice(-1)
          const looksCutoff = content.length > 20 && !/^[.!?"\s]$/.test(lastChar) && !content.endsWith('...')
          if (looksCutoff) {
            console.warn(`[AI] Possible cutoff detected (ends with "${lastChar}"). Length: ${content.length}`)
          }
          return content
        }

        lastError = new AIError(
          `[AI ERROR] Model ${model} returned empty content`,
          model,
          undefined,
          undefined,
          JSON.stringify(data).slice(0, 200)
        )
        console.warn(`[AI] Model ${model} returned empty content, trying next...`)
        continue
      }

      const errorText = await response.text()
      if (response.status === 402) {
        console.log(`[AI DEBUG] Model ${model} 402 error details:`, errorText)
      }      
let openRouterMsg = errorText
      try {
        const parsed = JSON.parse(errorText) as { error?: { message?: string } }
        openRouterMsg = parsed.error?.message || errorText
      } catch {
        // use raw text
      }
      lastError = new AIError(
        `[AI ERROR] Model ${model} failed with status ${response.status}: ${openRouterMsg}`,
        model,
        response.status,
        response.statusText,
        openRouterMsg
      )
      console.warn(`[AI] Model ${model} failed (${response.status}), trying next...`)
    } catch (error) {
      clearTimeout(timeoutId)
      const err = error as Error & { name?: string }
      const isTimeout = err.name === 'AbortError' || err.message?.includes('abort')
      lastError = new AIError(
        `[AI ERROR] ${isTimeout ? 'TIMEOUT' : 'Network error'} with ${model}: ${err.message}`,
        model,
        undefined,
        undefined,
        err.message
      )
      console.warn(`[AI] Model ${model} error:`, err.message, '- trying next...')
    }
  }

  if (lastError instanceof AIError) throw lastError
  throw lastError ?? new AIError('[AI ERROR] All models failed', MODELS[0], undefined, undefined, 'Unknown')
}

/**
 * Stream AI response - yields chunks as they arrive. Uses DeepSeek first for speed.
 * Caller must collect full text for DB save.
 */
export async function* generateAIPromptStream({
  systemPrompt,
  userPrompt,
  maxTokens = 200,
  temperature = 0.7,
}: AIGenerateOptions): AsyncGenerator<string, string, unknown> {
  if (typeof window !== 'undefined') {
    throw new AIError(
      '[AI ERROR] Called from client. AI runs server-side only.',
      MODELS[0],
      undefined,
      undefined,
      'Client-side execution'
    )
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new AIError('[AI ERROR] OPENROUTER_API_KEY not found.', MODELS[0], undefined, undefined, 'Missing API key')
  }

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ]

  let fullContent = ''

  for (const model of MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'Wheel of Founders',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: maxTokens,
          temperature,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.warn(`[AI] Model ${model} failed (${response.status}), trying next...`)
        continue
      }

      const reader = response.body?.getReader()
      if (!reader) throw new AIError('[AI ERROR] No response body', model, undefined, undefined, 'No body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }
              const content = parsed.choices?.[0]?.delta?.content || ''
              if (content) {
                fullContent += content
                yield content
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      if (fullContent.trim()) return fullContent.trim()
    } catch (error) {
      console.warn(`[AI] Model ${model} error:`, (error as Error).message, '- trying next...')
    }
  }

  throw new AIError('[AI ERROR] All models failed', MODELS[0], undefined, undefined, 'Unknown')
}
