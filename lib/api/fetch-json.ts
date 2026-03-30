/** Shared fetch helper for SWR / client hooks: credentials + JSON + consistent errors. */
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { credentials: 'include', ...init })
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `Request failed (${res.status})`)
  }
  return body as T
}
