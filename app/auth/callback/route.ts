import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getServerSupabase } from '@/lib/server-supabase'
import { addOrUpdateSubscriber } from '@/lib/mailerlite'
import { sendTransactionalEmail } from '@/lib/email/transactional'

const FOUNDER_EMAIL = 'wttmotivation@gmail.com'

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
      return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data?.user) {
      const db = getServerSupabase()

      // Auto-grant super_admin for founder email
      if (data.user.email === FOUNDER_EMAIL) {
        const founderPayload = {
          id: data.user.id,
          email: data.user.email,
          is_admin: true,
          admin_role: 'super_admin',
          updated_at: new Date().toISOString(),
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit user_profiles in this context
        await (db.from('user_profiles') as any).upsert(founderPayload, { onConflict: 'id' })
      }

      // Check if user profile exists, create if not (use db to see upserted founder row)
      const { data: profile } = await db
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!profile) {
        // Detect timezone
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

        // Create user profile with beta defaults (use db to bypass RLS)
        const profilePayload = {
          id: data.user.id,
          email: data.user.email,
          tier: 'beta',
          pro_features_enabled: true,
          timezone: detectedTimezone,
          timezone_detected_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_admin: data.user.email === FOUNDER_EMAIL ? true : false,
          admin_role: data.user.email === FOUNDER_EMAIL ? 'super_admin' : null,
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit user_profiles in this context
        await (db.from('user_profiles') as any)
          .upsert(profilePayload, { onConflict: 'id' })
          .catch((err: unknown) => {
            console.error('Error creating user profile:', err)
          })

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
      }
    }

    // Redirect to dashboard
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  }

  // No code, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
