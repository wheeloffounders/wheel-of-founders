import { NextResponse } from 'next/server'

/**
 * Health check endpoint for monitoring and load balancers.
 * GET /api/health returns status, timestamp, and optional DB check.
 */
export async function GET() {
  const env = process.env.NODE_ENV ?? 'development'
  const timestamp = new Date().toISOString()

  let db: 'ok' | 'error' | 'skipped' = 'skipped'
  try {
    const { getServerSupabase } = await import('@/lib/server-supabase')
    const dbClient = getServerSupabase()
    const { error } = await dbClient.from('user_profiles').select('id').limit(1).maybeSingle()
    db = error ? 'error' : 'ok'
  } catch {
    db = 'error'
  }

  return NextResponse.json(
    {
      status: 'ok',
      timestamp,
      environment: env,
      database: db,
    },
    { status: 200 }
  )
}
