/**
 * PostgREST / Supabase client errors often stringify to `{}` in the console
 * because `message` lives on the prototype or is non-enumerable.
 */
export function logSupabaseQueryError(context: string, error: unknown): void {
  const payload: Record<string, unknown> = {
    typeofError: error === null ? 'null' : typeof error,
  }

  if (error instanceof Error) {
    payload.name = error.name
    payload.message = error.message
    if (error.stack) payload.stack = error.stack
  }

  if (error && typeof error === 'object') {
    const o = error as Record<string, unknown>
    for (const k of ['code', 'details', 'hint', 'status'] as const) {
      if (k in o) payload[k] = o[k]
    }
  }

  if (error !== null && error !== undefined) {
    if (typeof error === 'object') {
      try {
        payload.ownKeysJson = JSON.stringify(error, Object.getOwnPropertyNames(error))
      } catch {
        payload.ownKeysJson = '[unserializable object]'
      }
    } else {
      payload.ownKeysJson = String(error)
    }
  }

  console.error(context, payload, error)
}
