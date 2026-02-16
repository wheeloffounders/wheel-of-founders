/**
 * Cron: Refresh cohort_retention materialized view
 *
 * cohort_retention aggregates week-0-to-week-4 retention from user_profiles,
 * evening_reviews, and morning_tasks. REFRESH MATERIALIZED VIEW CONCURRENTLY
 * allows reads during refresh (requires UNIQUE INDEX, which migration 035 adds).
 *
 * Vercel Cron: 0 4 * * * (daily at 4 AM, after daily-analytics at 3 AM)
 * Secured by CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { getServerSupabase } = await import('@/lib/server-supabase')
    const db = getServerSupabase()

    const { error } = await db.rpc('refresh_cohort_retention')

    // Supabase doesn't expose raw SQL by default; use a direct query via REST/SQL
    // We need to run: REFRESH MATERIALIZED VIEW CONCURRENTLY cohort_retention
    // Supabase client doesn't have .rpc for arbitrary SQL. We need a migration that creates a function.

    // Alternative: Use db.from() - but that doesn't run raw SQL.
    // We'll use the Supabase SQL via a function. Let me create a migration for a SECURITY DEFINER function.
    // Actually - Supabase allows running SQL via the Management API, but from Next.js we typically
    // use the client. The pg client would need to be used. Let me check - we can use @supabase/supabase-js
    // - it doesn't support raw SQL directly. We need to create a PostgreSQL function and call it via rpc.

    // Create migration 036 to add:
    // CREATE OR REPLACE FUNCTION refresh_cohort_retention()
    // RETURNS void LANGUAGE sql SECURITY DEFINER AS
    // 'REFRESH MATERIALIZED VIEW CONCURRENTLY cohort_retention';

    // For now, I'll add that migration and call it. If the function doesn't exist yet, the cron will fail
    // until the migration is run. Let me create the migration first, then the route will call it.

    const { error: rpcError } = await db.rpc('refresh_cohort_retention')

    if (rpcError) {
      console.error('[cron/refresh-cohort]', rpcError)
      return Response.json(
        {
          success: false,
          error: rpcError.message,
          hint: 'Ensure migration 036_add_refresh_cohort_function.sql has been applied.',
        },
        { status: 500 }
      )
    }

    return Response.json({ success: true, refreshed_at: new Date().toISOString() })
  } catch (e) {
    console.error('[cron/refresh-cohort]', e)
    return Response.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
