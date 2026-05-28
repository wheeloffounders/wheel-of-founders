import type { NextRequest } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'

/**
 * Resolve acting user from normal session auth or trusted cron headers.
 * Cron mode requires Authorization: Bearer CRON_SECRET and x-cron-user-id.
 */
export async function resolveFounderDnaUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization')?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim()
  const cronUserId = req.headers.get('x-cron-user-id')?.trim()

  if (cronSecret && cronUserId && authHeader === `Bearer ${cronSecret}`) {
    return cronUserId
  }

  const session = await getServerSessionFromRequest(req)
  return session?.user?.id ?? null
}
