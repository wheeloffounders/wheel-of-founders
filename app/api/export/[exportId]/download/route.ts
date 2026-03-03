import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const EXPORTS_BUCKET = 'exports'
const SIGNED_URL_EXPIRY_SECONDS = 3600 // 1 hour

/**
 * Get a signed download URL for an export
 * GET /api/export/[exportId]/download?format=json|csv|pdf
 * If format omitted, uses file_name (typically JSON)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
) {
  try {
    const serverSession = await getServerSessionFromRequest(request)
    if (!serverSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { exportId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') ?? 'json'

    // Verify user owns this export (service role, but we filter by user_id)
    const db = getServerSupabase()
    const { data: exportRecordData, error: fetchError } = await db
      .from('data_exports')
      .select('id, user_id, file_name, file_url, csv_file_name, pdf_file_name, status')
      .eq('id', exportId)
      .eq('user_id', serverSession.user.id)
      .single()

    if (fetchError || !exportRecordData) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }

    type ExportRecord = {
      id: string
      user_id: string
      file_name: string
      file_url: string
      csv_file_name?: string | null
      pdf_file_name?: string | null
      status: string
    }
    const exportRecord = exportRecordData as ExportRecord

    if (exportRecord.status !== 'completed') {
      return NextResponse.json({ error: 'Export not ready' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 503 }
      )
    }

    // Pick file name based on requested format
    let fileName: string
    if (format === 'csv' && exportRecord.csv_file_name) {
      fileName = exportRecord.csv_file_name
    } else if (format === 'pdf' && exportRecord.pdf_file_name) {
      fileName = exportRecord.pdf_file_name
    } else {
      fileName = exportRecord.file_name
    }

    const storagePath = `${serverSession.user.id}/${exportId}/${fileName}`

    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from(EXPORTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('[Export download] Failed:', { exportId, format, fileName, error: urlError?.message })
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
