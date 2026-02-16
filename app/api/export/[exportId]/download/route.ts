import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'

const EXPORTS_BUCKET = 'exports'
const SIGNED_URL_EXPIRY_SECONDS = 3600 // 1 hour

/**
 * Get a signed download URL for an export
 * GET /api/export/[exportId]/download
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { exportId } = await params

    // Verify user owns this export (service role, but we filter by user_id)
    const db = getServerSupabase()
    const { data: exportRecord, error: fetchError } = await db
      .from('data_exports')
      .select('id, user_id, file_name, file_url, status')
      .eq('id', exportId)
      .eq('user_id', session.user.id)
      .single()

    if (fetchError || !exportRecord) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }

    if (exportRecord.status !== 'completed') {
      return NextResponse.json({ error: 'Export not ready' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 503 }
      )
    }

    const storagePath = `${session.user.id}/${exportId}/${exportRecord.file_name}`

    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from(EXPORTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)

    if (urlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      downloadUrl: signedUrlData.signedUrl,
      expiresIn: SIGNED_URL_EXPIRY_SECONDS,
    })
  } catch (error) {
    console.error('Export download error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    )
  }
}
