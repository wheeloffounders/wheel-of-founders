import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { format, subDays, startOfYear, endOfYear } from 'date-fns'
import { getFeatureAccess } from '@/lib/features'
import { sendTransactionalEmail } from '@/lib/email/transactional'
import { generateCSV, generatePDF, type ExportData } from '@/lib/export/formats'

const EXPORTS_BUCKET = 'exports'
const SIGNED_URL_EXPIRY_SECONDS = 3600 // 1 hour
const EXPORT_FORMATS = ['json', 'csv', 'pdf', 'all'] as const

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs' // jspdf requires Node.js (not Edge)

/**
 * Generate data export for user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    console.log('[Export API] Request received:', {
      method: request.method,
      url: request.url,
      body: { exportType: body.exportType, format: body.format, dateRangeStart: body.dateRangeStart, dateRangeEnd: body.dateRangeEnd },
    })
    const serverSession = await getServerSessionFromRequest(request)
    if (!serverSession) {
      console.log('[Export] Unauthorized - no session from cookies or Bearer token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user profile for tier and pro features
    const db = getServerSupabase()
    const { data: profileData } = await db
      .from('user_profiles')
      .select('tier, pro_features_enabled, email_address')
      .eq('id', serverSession.user.id)
      .maybeSingle()
    type ProfileRow = { tier?: string | null; pro_features_enabled?: boolean | null; email_address?: string | null }
    const profile = profileData as ProfileRow | null
    const session = {
      user: {
        id: serverSession.user.id,
        email: serverSession.user.email ?? profile?.email_address ?? undefined,
        tier: profile?.tier || 'beta',
        pro_features_enabled: profile?.pro_features_enabled ?? true,
      },
    }
    const { exportType, dateRangeStart, dateRangeEnd, format: exportFormat = 'json' } = body

    const features = getFeatureAccess({
      tier: session.user.tier,
      pro_features_enabled: session.user.pro_features_enabled,
    })

    // Determine date range based on tier
    let startDate: Date
    let endDate: Date = new Date()

    switch (exportType) {
      case 'full_history':
        if (!features.canViewFullHistory) {
          return NextResponse.json(
            { error: 'Full history export requires Pro or Pro+ subscription' },
            { status: 403 }
          )
        }
        // Get first entry date (service role bypasses RLS)
        const db = getServerSupabase()
        const { data: firstEntryData } = await db
          .from('morning_tasks')
          .select('plan_date')
          .eq('user_id', session.user.id)
          .order('plan_date', { ascending: true })
          .limit(1)
          .maybeSingle()
        type TaskRow = { plan_date?: string }
        const firstEntry = firstEntryData as TaskRow | null
        startDate = firstEntry?.plan_date ? new Date(firstEntry.plan_date) : subDays(endDate, features.viewableHistoryDays)
        break

      case 'yearly_report':
        startDate = startOfYear(new Date())
        endDate = endOfYear(new Date())
        break

      case 'custom_range':
        if (!dateRangeStart || !dateRangeEnd) {
          return NextResponse.json({ error: 'Date range required' }, { status: 400 })
        }
        startDate = new Date(dateRangeStart)
        endDate = new Date(dateRangeEnd)
        break

      case 'five_year_trends':
        if (!features.fiveYearTrends) {
          return NextResponse.json(
            { error: '5-year trends require Pro+ subscription' },
            { status: 403 }
          )
        }
        startDate = subDays(endDate, 5 * 365)
        break

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    // Limit free users to 2 days
    if (!features.canViewFullHistory) {
      const maxStartDate = subDays(endDate, features.viewableHistoryDays)
      if (startDate < maxStartDate) {
        startDate = maxStartDate
      }
    }

    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(endDate, 'yyyy-MM-dd')
    const wantFormat = EXPORT_FORMATS.includes(exportFormat) ? exportFormat : 'json'

    // Create export record (service role bypasses RLS)
    const exportPayload = {
      user_id: session.user.id,
      export_type: exportType,
      date_range_start: startStr,
      date_range_end: endStr,
      status: 'processing',
    }
    // Supabase DB types omit data_exports; cast to satisfy type checker
    const { data: exportRecordData, error: exportError } = await db
      .from('data_exports')
      .insert(exportPayload as any)
      .select()
      .single()

    if (exportError || !exportRecordData) {
      throw new Error(`Failed to create export record: ${exportError?.message || 'No data returned'}`)
    }

    type ExportRecord = { id: string; user_id: string; export_type: string; status: string }
    const exportRecord = exportRecordData as ExportRecord

    // Fetch user data (service role bypasses RLS)
    const [tasksRes, decisionsRes, reviewsRes, emergenciesRes] = await Promise.all([
      db
        .from('morning_tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('plan_date', startStr)
        .lte('plan_date', endStr),
      db
        .from('morning_decisions')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('plan_date', startStr)
        .lte('plan_date', endStr),
      db
        .from('evening_reviews')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('review_date', startStr)
        .lte('review_date', endStr),
      db
        .from('emergencies')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('fire_date', startStr)
        .lte('fire_date', endStr),
    ])

    const exportData = {
      exportType,
      dateRange: { start: startStr, end: endStr },
      generatedAt: new Date().toISOString(),
      data: {
        tasks: tasksRes.data || [],
        decisions: decisionsRes.data || [],
        reviews: reviewsRes.data || [],
        emergencies: emergenciesRes.data || [],
      },
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss')
    const baseName = `wheel-of-founders-export-${exportType}-${timestamp}`
    const jsonFileName = `${baseName}.json`
    const csvFileName = `${baseName}.csv`
    const pdfFileName = `${baseName}.pdf`
    const csvContent = generateCSV(exportData as ExportData)

    const wantJson = wantFormat === 'json' || wantFormat === 'all'
    const wantCsv = wantFormat === 'csv' || wantFormat === 'all'
    const wantPdf = wantFormat === 'pdf' || wantFormat === 'all'

    console.log('[Export] Format requested:', body?.format ?? exportFormat, '→ wantJson:', wantJson, 'wantCsv:', wantCsv, 'wantPdf:', wantPdf)

    let fileUrl: string | null = null
    let csvDownloadUrl: string | null = null
    let pdfDownloadUrl: string | null = null
    const generatedFormats: string[] = []

    const basePath = `${session.user.id}/${exportRecord.id}`

    let pdfBase64: string | undefined
    let csvContentInline: string | undefined

    if (supabaseAdmin) {
      // Upload JSON
      if (wantJson) {
        const jsonPath = `${basePath}/${jsonFileName}`
        const { error: jsonErr } = await supabaseAdmin.storage
          .from(EXPORTS_BUCKET)
          .upload(jsonPath, JSON.stringify(exportData, null, 2), {
            contentType: 'application/json',
            upsert: false,
          })
        if (!jsonErr) {
          const { data: urlData } = await supabaseAdmin.storage
            .from(EXPORTS_BUCKET)
            .createSignedUrl(jsonPath, SIGNED_URL_EXPIRY_SECONDS)
          fileUrl = urlData?.signedUrl ?? null
          generatedFormats.push('json')
        }
      }

      // Upload CSV (fall back to inline if storage fails)
      if (wantCsv) {
        const csvPath = `${basePath}/${csvFileName}`
        const { error: csvErr } = await supabaseAdmin.storage
          .from(EXPORTS_BUCKET)
          .upload(csvPath, csvContent, {
            contentType: 'text/csv',
            upsert: false,
          })
        if (!csvErr) {
          const { data: urlData } = await supabaseAdmin.storage
            .from(EXPORTS_BUCKET)
            .createSignedUrl(csvPath, SIGNED_URL_EXPIRY_SECONDS)
          csvDownloadUrl = urlData?.signedUrl ?? null
          generatedFormats.push('csv')
        } else {
          console.warn('[Export] CSV storage upload failed, falling back to inline:', csvErr.message)
          csvContentInline = csvContent
          generatedFormats.push('csv')
        }
      }

      // Upload PDF (fall back to inline base64 if storage or generation fails)
      if (wantPdf) {
        try {
          const pdfBuffer = await generatePDF(exportData as ExportData)
          const pdfPath = `${basePath}/${pdfFileName}`
          const { error: pdfErr } = await supabaseAdmin.storage
            .from(EXPORTS_BUCKET)
            .upload(pdfPath, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: false,
            })
          if (!pdfErr) {
            const { data: urlData } = await supabaseAdmin.storage
              .from(EXPORTS_BUCKET)
              .createSignedUrl(pdfPath, SIGNED_URL_EXPIRY_SECONDS)
            pdfDownloadUrl = urlData?.signedUrl ?? null
            generatedFormats.push('pdf')
          } else {
            console.warn('[Export] PDF storage upload failed, falling back to inline:', pdfErr.message)
            pdfBase64 = pdfBuffer.toString('base64')
            generatedFormats.push('pdf')
          }
        } catch (pdfError) {
          console.error('[Export] PDF generation failed:', pdfError)
          throw pdfError
        }
      }
    } else {
      // Storage not configured: return inline for client-side download
      if (wantPdf) {
        try {
          const pdfBuffer = await generatePDF(exportData as ExportData)
          pdfBase64 = pdfBuffer.toString('base64')
          generatedFormats.push('pdf')
        } catch (pdfError) {
          console.error('PDF generation failed (no storage):', pdfError)
        }
      }
      if (wantCsv && !csvDownloadUrl) {
        csvContentInline = csvContent
        generatedFormats.push('csv')
      }
    }

    // Primary download URL for backward compat (JSON or first available)
    const primaryUrl = fileUrl ?? csvDownloadUrl ?? pdfDownloadUrl

    // Update export record as completed
    const updatePayload = {
      status: 'completed',
      file_name: jsonFileName,
      file_url: primaryUrl,
      export_formats: generatedFormats,
      csv_file_name: wantCsv ? csvFileName : null,
      pdf_file_name: wantPdf ? pdfFileName : null,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit data_exports
    await (db.from('data_exports') as any).update(updatePayload).eq('id', exportRecord.id)

    // Send export ready notification if user opted in
    const { data: userProfileData } = await db
      .from('user_profiles')
      .select('email_address, export_notification_enabled')
      .eq('id', session.user.id)
      .maybeSingle()
    type UserProfileForExport = {
      email_address?: string | null
      export_notification_enabled?: boolean | null
    }
    const userProfile = userProfileData as UserProfileForExport | null
    const notifyEmail = userProfile?.email_address || session.user.email
    const notifyEnabled = userProfile?.export_notification_enabled ?? true
    if (notifyEmail && notifyEnabled && (primaryUrl || exportData)) {
      sendTransactionalEmail({
        to: notifyEmail,
        subject: 'Your export is ready',
        html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f3f4f6;padding:40px;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><div style="background:linear-gradient(135deg,#152b50 0%,#1a3565 100%);color:#ef725c;padding:24px;border-radius:12px 12px 0 0;text-align:center;"><h1 style="margin:0;">Export Ready</h1></div><div style="padding:24px;"><p>Hi,</p><p>Your data export is ready.</p>${primaryUrl ? `<a href="${primaryUrl}" style="display:inline-block;padding:12px 24px;background:#ef725c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-top:16px;">Download Export</a>` : '<p>Open the app to download your export.</p>'}${primaryUrl ? '<p style="font-size:12px;color:#6b7280;margin-top:20px;">This link expires in 1 hour.</p>' : ''}</div></div></body></html>`,
        text: `Hi, Your export is ready. ${primaryUrl ? `Download: ${primaryUrl}` : 'Open the app to download.'}`,
      }).catch((err) => console.error('Export notification email failed:', err))
    }

    console.log('[Export] Success:', {
      exportId: exportRecord.id,
      hasDownloadUrl: !!primaryUrl,
      formats: generatedFormats,
    })
    return NextResponse.json({
      success: true,
      exportId: exportRecord.id,
      fileName: jsonFileName,
      downloadUrl: primaryUrl,
      csvDownloadUrl: csvDownloadUrl ?? undefined,
      pdfDownloadUrl: pdfDownloadUrl ?? undefined,
      pdfBase64: pdfBase64 ?? undefined,
      csvContentInline: csvContentInline ?? undefined,
      csvFileName: wantCsv ? csvFileName : undefined,
      pdfFileName: wantPdf ? pdfFileName : undefined,
      formats: generatedFormats,
      data: wantJson ? exportData : undefined,
      csvPreview: wantCsv ? csvContent.substring(0, 1000) : undefined,
    })
  } catch (error) {
    console.error('[Export] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}

