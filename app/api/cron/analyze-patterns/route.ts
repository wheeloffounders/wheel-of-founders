import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { analyzeUser } from '@/lib/analysis-engine'
import { format, startOfDay, getDay, getDate } from 'date-fns'
import { generateProPlusPrompt } from '@/lib/personal-coaching'
import { detectFounderStage, updateUserStage } from '@/lib/stage-detection'
import { getFeatureAccess } from '@/lib/features'

/**
 * Hourly Timezone-Aware Batch Analysis Cron Endpoint
 * Runs every hour, analyzes users in their local 2-5 AM window
 * Protected with CRON_SECRET environment variable
 */

/**
 * Get hour in user's local time
 */
function getUserLocalHour(utcDate: Date, offsetMinutes: number): number {
  const userTime = new Date(utcDate.getTime() + offsetMinutes * 60000)
  return userTime.getUTCHours()
}

export async function POST(request: NextRequest) {
  // Verify cron secret (allow manual triggers from authenticated users)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Check if this is a manual trigger
  let body: { userId?: string; manual?: boolean } | null = null
  try {
    body = await request.json()
  } catch {
    // Not JSON, continue with cron auth
  }

  const isManual = body?.manual === true

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  // For manual triggers, we'll verify user auth differently
  if (!isManual && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const startTime = Date.now()
  const nowUTC = new Date()
  const analysisDate = format(nowUTC, 'yyyy-MM-dd')
  const startOfDayUTC = startOfDay(nowUTC)
  
  const results = {
    totalUsers: 0,
    processed: 0,
    skipped: 0,
    skippedNotInWindow: 0,
    skippedAlreadyAnalyzed: 0,
    errors: 0,
    insightsGenerated: 0,
    details: [] as Array<{
      userId: string
      status: 'success' | 'error' | 'skipped'
      localHour?: number
      insightsCount?: number
      error?: string
    }>,
  }

  try {
    // Get all users with profiles and timezone info
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, tier, pro_features_enabled, timezone, timezone_offset, last_analyzed_at')

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        message: 'No users found',
        results,
      })
    }

    results.totalUsers = profiles.length

    // Process each user
    for (const profile of profiles) {
      const userStartTime = Date.now()
      let userStatus: 'success' | 'error' | 'skipped' = 'success'
      let insightsCount = 0
      let errorMessage: string | undefined

      try {
        // Check if user has already been analyzed today
        if (profile.last_analyzed_at) {
          const lastAnalyzed = new Date(profile.last_analyzed_at)
          if (lastAnalyzed >= startOfDayUTC) {
            userStatus = 'skipped'
            results.skipped++
            results.skippedAlreadyAnalyzed++
            results.details.push({
              userId: profile.id,
              status: 'skipped',
            })
            continue
          }
        }

        // Get user's local hour
        const timezoneOffset = profile.timezone_offset ?? 0 // Default to UTC if not set
        const userLocalHour = getUserLocalHour(nowUTC, timezoneOffset)

        // Only analyze if it's 2-5 AM in user's local time (skip check for manual triggers)
        if (!isManual && (userLocalHour < 2 || userLocalHour > 5)) {
          userStatus = 'skipped'
          results.skipped++
          results.skippedNotInWindow++
          results.details.push({
            userId: profile.id,
            status: 'skipped',
            localHour: userLocalHour,
          })
          continue
        }

        // Analyze user
        const analysisResult = await analyzeUser(profile.id, {
          tier: profile.tier || 'beta',
          pro_features_enabled: profile.pro_features_enabled ?? true,
        })

        if (!analysisResult) {
          userStatus = 'skipped'
          results.skipped++
          results.details.push({
            userId: profile.id,
            status: 'skipped',
            localHour: userLocalHour,
          })
          continue
        }

        // Save insights to database
        if (analysisResult.insights.length > 0) {
          const insightsToInsert = analysisResult.insights.map((insight) => ({
            user_id: profile.id,
            date: analysisDate,
            insight_text: insight.text,
            insight_type: insight.type,
            data_source: insight.dataSource,
            expires_at: null, // Insights don't expire by default
          }))

          const { error: insertError } = await supabase
            .from('user_insights')
            .insert(insightsToInsert)

          if (insertError) {
            throw new Error(`Failed to insert insights: ${insertError.message}`)
          }

          insightsCount = insightsToInsert.length
          results.insightsGenerated += insightsCount
        }

        // Update user stage
        try {
          const { detectFounderStage, updateUserStage } = await import('@/lib/stage-detection')
          const userStage = await detectFounderStage(profile.id)
          await updateUserStage(profile.id, userStage)
        } catch (error) {
          console.error(`Error updating stage for user ${profile.id}:`, error)
        }

        results.processed++

        // Log success
        await supabase.from('analysis_logs').insert({
          user_id: profile.id,
          analysis_date: analysisDate,
          status: 'success',
          insights_generated: insightsCount,
          processing_time_ms: Date.now() - userStartTime,
        })

        results.details.push({
          userId: profile.id,
          status: 'success',
          insightsCount,
        })
      } catch (error) {
        userStatus = 'error'
        errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors++

        // Log error
        await supabase.from('analysis_logs').insert({
          user_id: profile.id,
          analysis_date: analysisDate,
          status: 'error',
          error_message: errorMessage,
          processing_time_ms: Date.now() - userStartTime,
        })

        results.details.push({
          userId: profile.id,
          status: 'error',
          error: errorMessage,
        })

        // Continue processing other users even if one fails
        console.error(`Error analyzing user ${profile.id}:`, error)
      }
    }

    // Generate Pro+ weekly/monthly prompts (timezone-aware)
    if (!isManual) {
      for (const profile of profiles) {
        const features = getFeatureAccess({
          tier: profile.tier,
          pro_features_enabled: profile.pro_features_enabled,
        })

        if (!features.personalWeeklyInsight && !features.personalMonthlyInsight) {
          continue
        }

        const timezoneOffset = profile.timezone_offset ?? 0
        const userLocalTime = new Date(nowUTC.getTime() + timezoneOffset * 60000)
        const userLocalHour = userLocalTime.getUTCHours()
        const userLocalDay = getDay(userLocalTime)
        const userLocalDate = getDate(userLocalTime)

        // Weekly insight: Sunday 6 PM local time
        if (userLocalDay === 0 && userLocalHour === 18 && features.personalWeeklyInsight) {
          try {
            await generateProPlusPrompt(profile.id, 'weekly')
          } catch (error) {
            console.error(`Error generating weekly prompt for user ${profile.id}:`, error)
          }
        }

        // Monthly insight: 1st of month 6 AM local time
        if (userLocalDate === 1 && userLocalHour === 6 && features.personalMonthlyInsight) {
          try {
            await generateProPlusPrompt(profile.id, 'monthly')
          } catch (error) {
            console.error(`Error generating monthly prompt for user ${profile.id}:`, error)
          }
        }
      }
    }

    // Generate Pro+ weekly/monthly prompts (timezone-aware)
    if (!isManual) {
      const { generateProPlusPrompt } = await import('@/lib/personal-coaching')
      const { getFeatureAccess } = await import('@/lib/features')
      const { getDay, getDate } = await import('date-fns')

      for (const profile of profiles) {
        const features = getFeatureAccess({
          tier: profile.tier,
          pro_features_enabled: profile.pro_features_enabled,
        })

        if (!features.personalWeeklyInsight && !features.personalMonthlyInsight) {
          continue
        }

        const timezoneOffset = profile.timezone_offset ?? 0
        const userLocalTime = new Date(nowUTC.getTime() + timezoneOffset * 60000)
        const userLocalHour = userLocalTime.getUTCHours()
        const userLocalDay = getDay(userLocalTime)
        const userLocalDate = getDate(userLocalTime)

        // Weekly insight: Sunday 6 PM local time
        if (userLocalDay === 0 && userLocalHour === 18 && features.personalWeeklyInsight) {
          try {
            await generateProPlusPrompt(profile.id, 'weekly')
          } catch (error) {
            console.error(`Error generating weekly prompt for user ${profile.id}:`, error)
          }
        }

        // Monthly insight: 1st of month 6 AM local time
        if (userLocalDate === 1 && userLocalHour === 6 && features.personalMonthlyInsight) {
          try {
            await generateProPlusPrompt(profile.id, 'monthly')
          } catch (error) {
            console.error(`Error generating monthly prompt for user ${profile.id}:`, error)
          }
        }
      }
    }

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      message: 'Batch analysis completed',
      analysisDate,
      processingTimeMs: totalTime,
      results,
    })
  } catch (error) {
    console.error('Batch analysis error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        analysisDate,
      },
      { status: 500 }
    )
  }
}

// Allow GET for manual testing (with secret in query param)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const secret = searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Call POST handler
  return POST(request)
}
