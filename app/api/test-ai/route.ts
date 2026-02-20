import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    openRouter: {
      keyPresent: !!process.env.OPENROUTER_API_KEY,
      keyPreview: process.env.OPENROUTER_API_KEY
        ? process.env.OPENROUTER_API_KEY.substring(0, 8) + '...'
        : null,
    },
  }

  // Test 1: Validate key with OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeout)

      results.keyValidation = {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      }

      if (response.ok) {
        const data = (await response.json()) as {
          limit?: unknown
          usage?: unknown
          model_access?: unknown[]
        }
        results.keyData = {
          limit: data.limit,
          usage: data.usage,
          modelAccess: data.model_access?.length,
        }
      }
    } catch (error) {
      const err = error as Error
      results.keyValidation = {
        error: err.message,
        name: err.name,
      }
    }
  }

  // Test 2: Try a simple completion
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://wheel-of-founders-prod.vercel.app',
        'X-Title': 'Wheel of Founders',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "test successful" in one word' }],
        max_tokens: 10,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    results.testCompletion = {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    }

    if (response.ok) {
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      results.testResult = data.choices?.[0]?.message?.content
    } else {
      const errorText = await response.text()
      results.testError = errorText.substring(0, 200)
    }
  } catch (error) {
    const err = error as Error
    results.testCompletion = {
      error: err.message,
      name: err.name,
    }
  }

  return NextResponse.json(results)
}
