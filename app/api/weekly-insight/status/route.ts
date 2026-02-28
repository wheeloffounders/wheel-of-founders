import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobId = req.nextUrl.searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 })
    }

    const db = getServerSupabase()
    
    const { data: job, error } = await db
      .from('insight_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (error) throw error
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const jobData = job as Record<string, unknown>
    return NextResponse.json({
      status: jobData.status,
      result: jobData.result,
      error: jobData.error,
      updated_at: jobData.updated_at
    })

  } catch (error) {
    console.error('[weekly-insight-status] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get job status' },
      { status: 500 }
    )
  }
}
