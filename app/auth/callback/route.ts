import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getServerSupabase } from '@/lib/server-supabase'
import { addOrUpdateSubscriber } from '@/lib/mailerlite'
import { sendTransactionalEmail } from '@/lib/email/transactional'
import { syncRemindersToGoogleCalendar } from '@/lib/google-calendar'
import { isWhitelistAdminEmail } from '@/lib/admin-emails'

/**
 * Handle OAuth callback from Google/Apple
 * Creates user profile if it doesn't exist
 * Adds new users to MailerLite for marketing/automation
 * Uses createServerClient with cookies so session is properly set for the browser
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const calendarOAuth = requestUrl.searchParams.get('calendar_oauth') === '1'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as object)
            })
          },
        },
      }
    )

    // Exchange code for session - server client sets cookies so user stays logged in
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data?.user) {
      const db = getServerSupabase()
      console.log('[Auth Callback] Starting for user:', data.user.id, data.user.email)

      if (calendarOAuth) {
        const s = (data as { session?: { provider_refresh_token?: string | null; provider_token?: string | null } })
          .session
        const refreshToken = s?.provider_refresh_token?.trim() || null
        const accessToken = s?.provider_token?.trim() || null
        if (refreshToken) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table
          await (db.from('google_calendar_tokens') as any).upsert(
            {
              user_id: data.user.id,
              refresh_token: refreshToken,
              access_token: accessToken,
              connected_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
        }
        try {
          await syncRemindersToGoogleCalendar(data.user.id)
        } catch (err) {
          console.error('[auth/callback] google calendar sync failed', err)
        }
      }

      // Auto-grant super_admin for allowlisted team emails (all environments)
      if (data.user.email && isWhitelistAdminEmail(data.user.email)) {
        const founderPayload = {
          id: data.user.id,
          email: data.user.email,
          is_admin: true,
          admin_role: 'super_admin',
          updated_at: new Date().toISOString(),
        }
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit user_profiles in this context
          await (db.from('user_profiles') as any).upsert(founderPayload, { onConflict: 'id' })
        } catch (err) {
          console.error('Error upserting admin profile:', err)
        }
      }

      // Check if user profile exists, create if not (use db to see upserted founder row)
      const { data: profile } = await db
        .from('user_profiles')
        .select('id, login_count')
        .eq('id', data.user.id)
        .maybeSingle()

      const profileRow = profile as { id?: string; login_count?: number | null } | null
      const isNewUser = !profileRow
      console.log('[Auth Callback] Profile check:', {
        hasProfile: !!profileRow,
        isNewUser,
      })

      if (!profileRow) {
        // Detect timezone
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

        // Create user profile with beta defaults (use db to bypass RLS)
        const nowIso = new Date().toISOString()
        const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        const profilePayload = {
          id: data.user.id,
          email: data.user.email,
          tier: 'beta',
          pro_features_enabled: true,
          timezone: detectedTimezone,
          timezone_detected_at: nowIso,
          login_count: 1,
          created_at: nowIso,
          updated_at: nowIso,
          trial_starts_at: nowIso,
          trial_ends_at: trialEnds,
          is_admin: data.user.email && isWhitelistAdminEmail(data.user.email) ? true : false,
          admin_role: data.user.email && isWhitelistAdminEmail(data.user.email) ? 'super_admin' : null,
        }
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit user_profiles in this context
          await (db.from('user_profiles') as any)
            .upsert(profilePayload, { onConflict: 'id' })
        } catch (err) {
          console.error('Error creating user profile:', err)
        }

        // Send welcome transactional email (if enabled - new users default to true)
        const emailAddr = data.user.email
        if (emailAddr) {
          sendTransactionalEmail({
            to: emailAddr,
            toName: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? emailAddr.split('@')[0],
            subject: 'Welcome to Wheel of Founders!',
            html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f3f4f6;padding:40px;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><div style="background:linear-gradient(135deg,#152b50 0%,#1a3565 100%);color:#ef725c;padding:24px;border-radius:12px 12px 0 0;text-align:center;"><h1 style="margin:0;">Wheel of Founders</h1></div><div style="padding:24px;"><p>Hi ${data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? emailAddr.split('@')[0]},</p><p>Welcome! Start your day with the Morning Power List, capture decisions, and end with an Evening Review.</p><p>Mrs. Deer, your AI companion will share insights as you build your pattern.</p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://wheeloffounders.com'}" style="display:inline-block;padding:12px 24px;background:#ef725c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-top:16px;">Open App</a></div></div></body></html>`,
            text: `Hi ${data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? emailAddr.split('@')[0]}, Welcome to Wheel of Founders! Start your day with the Morning Power List. Open: ${process.env.NEXT_PUBLIC_APP_URL || 'https://wheeloffounders.com'}`,
          }).catch((err) => {
            console.error('Welcome email failed (non-blocking):', err)
          })
        }

        // Add to MailerLite for marketing automations (welcome series, etc.)
        const activeGroupId = process.env.MAILERLITE_GROUP_ACTIVE
        if (activeGroupId && data.user.email) {
          addOrUpdateSubscriber(
            {
              email: data.user.email,
              name:
                data.user.user_metadata?.full_name ??
                data.user.user_metadata?.name ??
                data.user.email?.split('@')[0],
              fields: {
                user_id: data.user.id,
                tier: 'beta',
                joined_date: new Date().toISOString().split('T')[0],
              },
            },
            [activeGroupId]
          ).catch((err) => {
            console.error('MailerLite sync failed (non-blocking):', err)
          })
        }

        // Clear onboarding flag for new users
        // This will be handled client-side via localStorage
      } else {
        const currentLoginCount = Number(profileRow.login_count ?? 0)
        const nextLoginCount = Number.isFinite(currentLoginCount) ? Math.max(0, Math.floor(currentLoginCount)) + 1 : 1
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit profile columns in this context
        await (db.from('user_profiles') as any)
          .update({ login_count: nextLoginCount, updated_at: new Date().toISOString() })
          .eq('id', data.user.id)
      }

      if (data.user.email && isWhitelistAdminEmail(data.user.email)) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db.from('user_profiles') as any)
            .update({
              is_admin: true,
              admin_role: 'super_admin',
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.user.id)
        } catch (err) {
          console.error('[auth/callback] admin flag sync failed', err)
        }
      }

      // Calendar OAuth connect should return to caller location immediately.
      if (calendarOAuth) {
        return NextResponse.redirect(`${requestUrl.origin}${next}`)
      }

      // New users must go through goal → personalization → morning. Redirect to goal.
      if (isNewUser) {
        return NextResponse.redirect(`${requestUrl.origin}/onboarding/goal`)
      }

      // Existing users: resume logic — detect where they left off and redirect accordingly
      const today = new Date().toISOString().slice(0, 10)
      const { data: profileFull } = await db
        .from('user_profiles')
        .select('primary_goal_text, onboarding_completed_at')
        .eq('id', data.user.id)
        .maybeSingle()

      const { count: morningCount } = await db
        .from('morning_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.user.id)

      const { count: eveningCount } = await db
        .from('evening_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.user.id)

      const hasGoal = !!(profileFull as { primary_goal_text?: string } | null)?.primary_goal_text?.trim()
      const hasOnboarding = !!(profileFull as { onboarding_completed_at?: string } | null)?.onboarding_completed_at
      const hasMorning = (morningCount ?? 0) > 0
      const hasEvening = (eveningCount ?? 0) > 0

      // Stage 1: Goal done, needs personalization
      if (hasGoal && !hasOnboarding) {
        return NextResponse.redirect(`${requestUrl.origin}/onboarding/personalization`)
      }
      // Stage 2: Onboarding done, never saved morning
      if (hasOnboarding && !hasMorning) {
        const { isNewOnboardingEnabled } = await import('@/lib/feature-flags')
        const qs = isNewOnboardingEnabled() ? '?first=true&resume=true' : ''
        return NextResponse.redirect(`${requestUrl.origin}/morning${qs}`)
      }
      // Stage 3: Morning done, no evening today — check if they have morning for today
      const { count: morningTodayCount } = await db
        .from('morning_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.user.id)
        .eq('plan_date', today)
      const { count: eveningTodayCount } = await db
        .from('evening_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.user.id)
        .eq('review_date', today)
      if ((morningTodayCount ?? 0) > 0 && (eveningTodayCount ?? 0) === 0) {
        console.log('[Auth Callback] Stage 3: Redirecting to /dashboard?showEveningReminder=true')
        return NextResponse.redirect(`${requestUrl.origin}/dashboard?showEveningReminder=true`)
      }

      // Stage 4 or explicit next: respect next param
      console.log('[Auth Callback] Stage 4: Redirecting to', next)
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // No code, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/auth`)
}
