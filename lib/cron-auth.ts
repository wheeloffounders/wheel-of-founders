import type { NextRequest } from 'next/server'

export type CronAuthResult =
  | { ok: true }
  | { ok: false; reason: 'missing_secret' | 'bad_bearer' }

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in project env.
 * Trim both env and header — leading/trailing whitespace in Vercel env is a common 401 cause.
 */
export function authorizeCronRequest(request: NextRequest): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return { ok: false, reason: 'missing_secret' }
  const authHeader = request.headers.get('authorization')?.trim()
  if (authHeader !== `Bearer ${cronSecret}`) return { ok: false, reason: 'bad_bearer' }
  return { ok: true }
}

/** Structured logs for diagnosing Vercel Cron (no secrets logged). */
export function logCronRequestMeta(routeLabel: string, request: NextRequest) {
  console.log(`[${routeLabel}] === CRON START ===`, new Date().toISOString())
  console.log(`[${routeLabel}] meta`, {
    xVercelCron: request.headers.get('x-vercel-cron'),
    hasAuthorization: !!request.headers.get('authorization'),
    cronSecretConfigured: !!process.env.CRON_SECRET?.trim(),
    vercel: process.env.VERCEL === '1',
  })
}
