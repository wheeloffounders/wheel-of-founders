import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { analyzeUser } from '@/lib/analysis-engine'
import { format } from 'date-fns'

/**
 * Manual Analysis Endpoint
 * Allows authenticated users to trigger their own analysis
 */
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tier, pro_features_enabled')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const analysisDate = format(new Date(), 'yyyy-MM-dd')
    const startTime = Date.now()

    // Analyze user
    const analysisResult = await analyzeUser(profile.id, {
      tier: profile.tier || 'beta',
      pro_features_enabled: profile.pro_features_enabled ?? true,
    })

    if (!analysisResult) {
      return NextResponse.json({
        message: 'No analysis data available',
        insightsGenerated: 0,
      })
    }

    // Save insights to database
    let insightsCount = 0
    if (analysisResult.insights.length > 0) {
      const insightsToInsert = analysisResult.insights.map((insight) => ({
        user_id: profile.id,
        date: analysisDate,
        insight_text: insight.text,
        insight_type: insight.type,
        data_source: insight.dataSource,
        expires_at: null,
      }))

      const { error: insertError } = await supabase
        .from('user_insights')
        .insert(insightsToInsert)

      if (insertError) {
        throw new Error(`Failed to insert insights: ${insertError.message}`)
      }

      insightsCount = insightsToInsert.length
    }

    // Update last_analyzed_at
    await supabase
      .from('user_profiles')
      .update({ last_analyzed_at: new Date().toISOString() })
      .eq('id', profile.id)

    // Log success
    await supabase.from('analysis_logs').insert({
      user_id: profile.id,
      analysis_date: analysisDate,
      status: 'success',
      insights_generated: insightsCount,
      processing_time_ms: Date.now() - startTime,
    })

    return NextResponse.json({
      message: 'Analysis completed successfully',
      analysisDate,
      insightsGenerated: insightsCount,
      processingTimeMs: Date.now() - startTime,
    })
  } catch (error) {
    console.error('Manual analysis error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
