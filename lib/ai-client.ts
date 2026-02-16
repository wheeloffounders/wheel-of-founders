/**
 * OpenRouter AI Client
 * Supports model selection for testing different AI providers
 */

export type AIModel = 
  | 'deepseek/deepseek-chat'
  | 'google/gemini-1.5-flash'
  | 'cohere/command-r-plus'
  | 'mistralai/mistral-7b-instruct'
  | 'meta-llama/llama-3-8b-instruct'
  // Legacy models (blocked in some regions, kept for backward compatibility)
  | 'openai/gpt-4o-mini' 
  | 'anthropic/claude-3.5-haiku'
  | 'anthropic/claude-3.5-sonnet'
  | 'google/gemini-pro'

interface AIGenerateOptions {
  systemPrompt: string
  userPrompt: string
  model?: AIModel
  maxTokens?: number
  temperature?: number
}

/**
 * Generate AI response using OpenRouter with region-aware fallbacks
 * Tries models in order: configured model -> Claude Sonnet -> Gemini Pro
 */
export async function generateAIPrompt({
  systemPrompt,
  userPrompt,
  model = 'openai/gpt-4o-mini', // Default (will be overridden by env var)
  maxTokens = 200,
  temperature = 0.7,
}: AIGenerateOptions): Promise<string | null> {
  // Guard: this helper is intended for server-side use only.
  // When imported into client bundles (e.g. via Turbopack), process.env
  // secrets are not available. In that case, quietly return null so
  // callers can fall back to their non-AI templates without console noise.
  if (typeof window !== 'undefined') {
    return null
  }

  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    console.error('[AI Client] OPENROUTER_API_KEY not found in environment variables')
    return null
  }

  // Get model from env or use provided default
  const primaryModel = getAIModel() || model
  
  // Fallback chain for region-blocked models (e.g., OpenAI/Anthropic blocked in Hong Kong)
  // DeepSeek and Gemini Flash work globally, including Hong Kong
  const fallbackModels: AIModel[] = [
    primaryModel,
    'deepseek/deepseek-chat',           // ✅ Works in Hong Kong, free/cheap
    'google/gemini-1.5-flash',         // ✅ Works in Hong Kong, correct model ID
    'cohere/command-r-plus',           // ✅ Works in Hong Kong
    'mistralai/mistral-7b-instruct',   // ✅ Works in Hong Kong
    'meta-llama/llama-3-8b-instruct',  // ✅ Works in Hong Kong
  ]

  // Remove duplicates while preserving order
  const modelsToTry = Array.from(new Set(fallbackModels))

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i]
    const isLastAttempt = i === modelsToTry.length - 1

    try {
      if (i > 0) {
        console.log(`[AI Client] Model ${modelsToTry[i - 1]} not available in region, trying ${currentModel}...`)
      } else {
        console.log(`[AI Client] Calling OpenRouter API with model: ${currentModel}`)
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'Wheel of Founders',
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData: any = {}
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }

        // If it's a region/availability error and we have more models to try, continue
        if (!isLastAttempt && (
          response.status === 400 || 
          response.status === 404 ||
          (errorData.error?.message?.toLowerCase().includes('not available') ||
           errorData.error?.message?.toLowerCase().includes('region') ||
           errorData.error?.message?.toLowerCase().includes('blocked'))
        )) {
          console.warn(`[AI Client] Model ${currentModel} unavailable (${response.status}):`, errorData.error?.message || errorText)
          continue // Try next model
        }

        console.error(`[AI Client] OpenRouter API HTTP error for ${currentModel}:`, response.status, response.statusText, errorData)
        if (isLastAttempt) return null
        continue
      }

      const data = await response.json()

      if (data.error) {
        // If it's a model availability error and we have more models to try, continue
        if (!isLastAttempt && (
          data.error.message?.toLowerCase().includes('not available') ||
          data.error.message?.toLowerCase().includes('region') ||
          data.error.message?.toLowerCase().includes('blocked')
        )) {
          console.warn(`[AI Client] Model ${currentModel} error:`, data.error.message)
          continue // Try next model
        }

        console.error(`[AI Client] OpenRouter API error for ${currentModel}:`, data.error)
        if (isLastAttempt) return null
        continue
      }

      const content = data.choices?.[0]?.message?.content?.trim()
      if (content) {
        console.log(`[AI Client] ✅ Successfully connected with ${currentModel} (${content.length} chars)`)
        return content
      } else {
        console.warn(`[AI Client] ${currentModel} returned empty content:`, data)
        if (isLastAttempt) return null
        continue
      }
    } catch (error) {
      console.error(`[AI Client] Network error with ${currentModel}:`, error)
      if (isLastAttempt) {
        console.error('[AI Client] All models failed, falling back to template')
        return null
      }
      continue // Try next model
    }
  }

  console.error('[AI Client] All models exhausted, falling back to template')
  return null
}

/**
 * Helper to get model from environment variable for easy switching
 * Supports: deepseek-chat, gemini-1.5-flash, command-r-plus, mistral-7b, llama-3-8b
 * Defaults to deepseek-chat (works globally, including Hong Kong, free/cheap)
 */
export function getAIModel(): AIModel | null {
  const envModel = process.env.OPENROUTER_MODEL as AIModel | undefined
  if (envModel && [
    'deepseek/deepseek-chat',
    'google/gemini-1.5-flash',
    'cohere/command-r-plus',
    'mistralai/mistral-7b-instruct',
    'meta-llama/llama-3-8b-instruct',
    // Legacy models (kept for backward compatibility)
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-haiku',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-pro',
  ].includes(envModel)) {
    return envModel
  }
  // Default to DeepSeek Chat (works globally, including Hong Kong, free/cheap, good quality)
  return 'deepseek/deepseek-chat'
}
