import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface EmailData {
  to: string
  subject: string
  html: string
}

async function sendEmail(data: EmailData): Promise<Response> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Wheel of Founders <noreply@wheeloffounders.com>',
      to: [data.to],
      subject: data.subject,
      html: data.html,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Resend API error: ${error}`)
  }

  return res.json()
}

function generateEmailTemplate(data: {
  userName: string
  weekStart: string
  weekEnd: string
  focusScoreTrend: string
  topAccomplishments: string[]
  patternInsight: string
  streak: number
  mrsDeerMessage: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #152b50 0%, #1a3565 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ef725c; margin: 0; font-size: 28px; font-weight: bold;">Wheel of Founders</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Weekly Summary</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #152b50; margin: 0 0 20px 0; font-size: 24px;">Hello ${data.userName},</h2>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Here's your weekly reflection for <strong>${data.weekStart} – ${data.weekEnd}</strong>.
              </p>

              <!-- Mrs. Deer Message -->
              <div style="background-color: #fef3f2; border-left: 4px solid #ef725c; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <p style="margin: 0 0 10px 0; font-size: 18px;">🦌</p>
                <p style="color: #152b50; font-size: 16px; line-height: 1.6; margin: 0; font-style: italic;">
                  ${data.mrsDeerMessage}
                </p>
              </div>

              <!-- Streak -->
              ${data.streak > 0 ? `
              <div style="background: linear-gradient(135deg, #ef725c15 0%, #152b5015 100%); padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: center; border: 1px solid #ef725c30;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Current Streak</p>
                <p style="margin: 0; font-size: 36px; font-weight: bold; color: #ef725c;">🔥 ${data.streak} days</p>
              </div>
              ` : ''}

              <!-- Focus Score Trend -->
              <div style="margin-bottom: 30px;">
                <h3 style="color: #152b50; font-size: 18px; margin: 0 0 15px 0;">Focus Score Trend</h3>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
                  ${data.focusScoreTrend}
                </p>
              </div>

              <!-- Top Accomplishments -->
              ${data.topAccomplishments.length > 0 ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: #152b50; font-size: 18px; margin: 0 0 15px 0;">Top 3 Accomplishments</h3>
                <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  ${data.topAccomplishments.map(acc => `<li style="margin-bottom: 10px;">${acc}</li>`).join('')}
                </ul>
              </div>
              ` : ''}

              <!-- Pattern Insight -->
              ${data.patternInsight ? `
              <div style="background-color: #f0f9ff; border-left: 4px solid #152b50; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h3 style="color: #152b50; font-size: 18px; margin: 0 0 10px 0;">Pattern Insight</h3>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
                  ${data.patternInsight}
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 40px;">
                <a href="https://wheeloffounders.com" style="display: inline-block; background-color: #152b50; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Full Dashboard →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                You're receiving this because you have weekly emails enabled.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                <a href="https://wheeloffounders.com/settings" style="color: #6b7280; text-decoration: underline;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all users with weekly emails enabled
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email_address')
      .eq('weekly_email_enabled', true)

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with weekly emails enabled' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - ((weekEnd.getDay() + 1) % 7)) // Last Sunday
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 6)

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const results = []

    for (const profile of profiles) {
      if (!profile.email_address) continue

      try {
        // Fetch user's week data
        const [tasksRes, reviewsRes, emergenciesRes] = await Promise.all([
          supabase
            .from('morning_tasks')
            .select('needle_mover, action_plan, completed')
            .gte('plan_date', weekStartStr)
            .lte('plan_date', weekEndStr)
            .eq('user_id', profile.id),
          supabase
            .from('evening_reviews')
            .select('mood, energy, wins, lessons, review_date')
            .gte('review_date', weekStartStr)
            .lte('review_date', weekEndStr)
            .eq('user_id', profile.id),
          supabase
            .from('emergencies')
            .select('resolved')
            .gte('fire_date', weekStartStr)
            .lte('fire_date', weekEndStr)
            .eq('user_id', profile.id),
        ])

        const tasks = tasksRes.data || []
        const reviews = reviewsRes.data || []
        const emergencies = emergenciesRes.data || []

        // Calculate focus score trend
        const focusScores = reviews
          .filter((r) => r.mood && r.energy)
          .map((r) => Math.round(((r.mood + r.energy) / 10) * 100))
        const avgFocusScore =
          focusScores.length > 0
            ? Math.round(focusScores.reduce((a, b) => a + b, 0) / focusScores.length)
            : 0

        const focusScoreTrend =
          focusScores.length >= 2
            ? focusScores[0] > focusScores[focusScores.length - 1]
              ? `Your focus score improved this week, ending at ${avgFocusScore}/100!`
              : focusScores[0] < focusScores[focusScores.length - 1]
              ? `Your focus score was ${avgFocusScore}/100 this week.`
              : `Your focus score stayed consistent at ${avgFocusScore}/100.`
            : `Your average focus score was ${avgFocusScore}/100 this week.`

        // Top accomplishments (from wins)
        const allWins = reviews
          .map((r) => r.wins)
          .filter((w): w is string => !!w?.trim())
        const topAccomplishments = allWins.slice(0, 3)

        // Pattern insight
        const actionPlans = tasks.map((t) => t.action_plan).filter(Boolean)
        const actionCounts: Record<string, number> = {}
        actionPlans.forEach((plan) => {
          actionCounts[plan] = (actionCounts[plan] || 0) + 1
        })
        const mostCommonAction = Object.entries(actionCounts).sort(
          ([, a], [, b]) => b - a
        )[0]?.[0]

        const patternInsight = mostCommonAction
          ? `You focused most on "${mostCommonAction.replace('_', ' ')}" actions this week.`
          : ''

        // Get streak
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('current_streak')
          .eq('id', profile.id)
          .single()

        const streak = userProfile?.current_streak || 0

        // Mrs. Deer message
        const mrsDeerMessages = [
          "Your consistency is building something powerful. Keep showing up.",
          "Every review is a step forward. You're doing great work.",
          "Reflection is where growth happens. You're on the right path.",
          "Your dedication to this practice is inspiring. Keep going!",
        ]
        const mrsDeerMessage =
          mrsDeerMessages[Math.floor(Math.random() * mrsDeerMessages.length)]

        // Get user name from auth.users
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
        const userName = authUser?.user?.email?.split('@')[0] || 'Founder'

        const emailHtml = generateEmailTemplate({
          userName,
          weekStart: new Date(weekStart).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          weekEnd: new Date(weekEnd).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          focusScoreTrend,
          topAccomplishments,
          patternInsight,
          streak,
          mrsDeerMessage,
        })

        await sendEmail({
          to: profile.email_address,
          subject: `Your Weekly Summary: ${weekStartStr} – ${weekEndStr}`,
          html: emailHtml,
        })

        results.push({ userId: profile.id, status: 'sent' })
      } catch (error) {
        console.error(`Error sending email to ${profile.id}:`, error)
        results.push({ userId: profile.id, status: 'error', error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Weekly emails processed',
        results,
        count: results.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
