/**
 * Rate limit middleware for AI insight endpoints.
 * Wraps handlers with auth + signature verification + tier lookup + rate limit check + abuse detection.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { checkRateLimit, getRateLimitHeaders, type InsightType } from './rate-limit'
import { detectAbuse } from './abuse-detection'
import { verifySignature, isRequestSigningEnabled } from './request-signature'

export async function withRateLimit(
  req: NextRequest,
  insightType: InsightType,
  handler: (req: NextRequest) => Promise<NextResponse | Response>
): Promise<NextResponse | Response> {
  try {
    const session = await getServerSessionFromRequest(req)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (isRequestSigningEnabled()) {
      const timestamp = parseInt(req.headers.get('X-Timestamp') || '0', 10)
      const signature = req.headers.get('X-Signature') || ''
      const result = verifySignature(userId, timestamp, signature)
      if (!result.valid) {
        console.warn(`[RateLimit] Signature failure for user ${userId.slice(0, 8)}...: ${result.reason}`)
        return NextResponse.json(
          { error: 'Invalid request signature', reason: result.reason },
          { status: 403 }
        )
      }
    }

    const abuseDetected = await detectAbuse(userId)
    if (abuseDetected) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Unusual activity detected. Please try again later.',
        },
        { status: 429 }
      )
    }

    const db = getServerSupabase()
    const { data: profile } = await db
      .from('user_profiles')
      .select('tier')
      .eq('id', userId)
      .maybeSingle()

    const profileTyped = profile as { tier?: string } | null
    const tier = profileTyped?.tier ?? 'free'
    const result = await checkRateLimit(userId, insightType, tier)

    if (!result.allowed) {
      const headers = getRateLimitHeaders(result)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: result.message,
          limit: result.limit,
          used: result.used,
          reset: result.resetAt,
        },
        { status: 429, headers }
      )
    }

    const response = await handler(req)
    if (!(response instanceof Response)) {
      console.error('[RateLimit] Handler did not return a Response')
      return NextResponse.json({ error: 'Invalid handler response' }, { status: 500 })
    }

    const headers = getRateLimitHeaders(result)
    try {
      const hr = response.headers
      if (headers['X-RateLimit-Limit']) hr.set('X-RateLimit-Limit', headers['X-RateLimit-Limit'])
      if (headers['X-RateLimit-Remaining']) hr.set('X-RateLimit-Remaining', headers['X-RateLimit-Remaining'])
      if (headers['X-RateLimit-Reset']) hr.set('X-RateLimit-Reset', headers['X-RateLimit-Reset'])
    } catch (headerErr) {
      console.warn('[RateLimit] Could not attach rate-limit headers', headerErr)
    }
    return response
  } catch (error) {
    console.error('[RateLimit] Error:', error)
    return NextResponse.json(
      {
        error: 'Request could not be processed',
        message: error instanceof Error ? error.message : 'Rate limit middleware failed',
      },
      { status: 500 }
    )
  }
}
