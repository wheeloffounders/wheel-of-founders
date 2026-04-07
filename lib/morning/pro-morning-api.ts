/**
 * Browser client for `/api/ai/pro-morning` (cookies = session).
 */

export type ProMorningAction = 'SUGGEST_DECISION' | 'GHOSTWRITE_METADATA' | 'SUGGEST_TASKS'

export class ProMorningAIError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ProMorningAIError'
  }
}

export async function proMorningAiPost<T extends Record<string, unknown>>(
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch('/api/ai/pro-morning', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T
  if (res.status === 403) {
    throw new ProMorningAIError(data.error || 'Pro morning AI requires Pro or trial access', 403)
  }
  if (!res.ok) {
    throw new ProMorningAIError(data.error || `Request failed (${res.status})`, res.status)
  }
  return data as T
}
