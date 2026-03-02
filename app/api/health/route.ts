import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Health check endpoint for monitoring and load balancers.
 * GET /api/health returns status, timestamp, env check, and optional DB check.
 */
export async function GET() {
  const status: Record<string, unknown> = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ configured' : '❌ missing',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ configured' : '❌ missing',
      serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ configured' : '❌ missing',
    },
    note: 'For detailed env check, visit /api/debug/env',
  }

  const hasRequired =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!hasRequired) {
    status.status = 'degraded'
  }

  let db: 'ok' | 'error' | 'skipped' = 'skipped'
  if (hasRequired) {
    try {
      const { getServerSupabase } = await import('@/lib/server-supabase')
      const dbClient = getServerSupabase()
      const { error } = await dbClient.from('user_profiles').select('id').limit(1).maybeSingle()
      db = error ? 'error' : 'ok'
    } catch {
      db = 'error'
    }
  }
  status.database = db

  if (db === 'error' || !hasRequired) {
    status.status = 'degraded'
  }

  return NextResponse.json(status, { status: 200 })
}
